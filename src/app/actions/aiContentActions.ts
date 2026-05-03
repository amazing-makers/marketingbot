'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generateCaption, type CaptionResult, PLATFORM_FORMATS } from '@/lib/ai/caption';
import { generateImage } from '@/lib/ai/image-gen';
import { isR2Configured, uploadToR2 } from '@/lib/storage/r2';
import type { ChannelType } from '@prisma/client';

/**
 * Prisma ChannelType (대문자 enum) → caption.ts PLATFORM_FORMATS 키 (소문자) 매핑.
 * 매핑 없으면 sns_caption 기본 동작.
 */
const CHANNEL_TO_PLATFORM: Record<ChannelType, string> = {
    INSTAGRAM:   'instagram',
    FACEBOOK:    'facebook',
    X:           'x',
    TIKTOK:      'tiktok',
    YOUTUBE:     'youtube',
    THREADS:     'threads',
    NAVER_BLOG:  'naver_blog',
    NAVER_CAFE:  'naver_cafe',
    KAKAO:       'instagram',  // 카카오톡: SNS 캡션 포맷 빌림
    EMAIL:       'instagram',  // 이메일 본문: SNS 캡션 포맷 빌림
    SMS:         'twitter',    // SMS: 단문 포맷
    WEIBO:       'weibo',
    XIAOHONGSHU: 'xiaohongshu',
    VK:          'vk',
    LINE:        'line',
    WHATSAPP:    'whatsapp',
    PINTEREST:   'pinterest',
    DOUYIN:      'douyin',
    LINKEDIN:    'linkedin',
    TISTORY:     'tistory',
    WORDPRESS:   'wordpress',
    TELEGRAM:    'telegram',
    DISCORD:     'discord',
};

export interface GenerateCampaignCaptionInput {
    /** 사용자 의도·주제 (캠페인 설명 + 본문 시드) */
    userHint: string;
    /** 선택된 채널 ID 배열 */
    channelIds: string[];
    /** 첨부 이미지 (data URL 또는 file 경로) — 선택 */
    imageDataUrl?: string;
    /** 출력 언어 — 기본 한국어. 다른 언어는 region 자동 라우팅 단계에서 처리. */
    language?: string;
}

/**
 * 선택한 채널들의 type 기반으로 각 플랫폼 포맷에 맞춰 캡션 생성.
 * 결과: { channelId: { text, hashtags, format, ... } } — 각 채널별 본문 + 해시태그.
 */
export async function generateCampaignCaption(input: GenerateCampaignCaptionInput): Promise<{
    success: boolean;
    captions?: Record<string, CaptionResult & { channelType: string; accountName: string }>;
    error?: string;
}> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    if (!input.channelIds?.length) return { success: false, error: '채널을 1개 이상 선택하세요.' };
    if (!input.userHint?.trim()) return { success: false, error: '주제·맥락을 입력하세요.' };

    try {
        const channels = await prisma.marketingChannel.findMany({
            where: { id: { in: input.channelIds }, userId: session.user.id },
        });
        if (!channels.length) return { success: false, error: '선택한 채널을 찾지 못했습니다.' };

        // 채널 type 별로 platform 키 결정 (중복 제거)
        const platforms = Array.from(new Set(channels.map(c => CHANNEL_TO_PLATFORM[c.type])));

        // 이미지 data URL → 임시 base64 변환 (파일 없이 메모리만 사용)
        // 현재 lib/ai/caption.ts 의 generateCaption 은 mediaPath 파일 경로 기반이라
        // data URL 직접 분석은 미지원 — 향후 함수 시그니처 확장 시 처리.
        // (이번 라운드: 텍스트 캡션만, vision 은 R2 업로드 통합 후.)
        const result = await generateCaption({
            platforms,
            userHint: input.userHint,
            language: input.language || 'ko',
            userId: session.user.id,
        });

        // 채널 ID → 캡션 매핑 (같은 type 의 여러 채널은 같은 캡션 공유)
        const captions: Record<string, any> = {};
        for (const c of channels) {
            const platformKey = CHANNEL_TO_PLATFORM[c.type];
            const cap = result[platformKey] || result[platforms[0]];
            if (cap) {
                captions[c.id] = {
                    ...cap,
                    channelType: c.type,
                    accountName: c.accountName,
                };
            }
        }

        return { success: true, captions };
    } catch (e: any) {
        console.error('[generateCampaignCaption]', e);
        return { success: false, error: e?.message || 'AI 캡션 생성 실패' };
    }
}

export interface GenerateCampaignImageInput {
    prompt: string;
    /** 1024x1024 정사각이 default. 1024x1792 (세로) / 1792x1024 (가로) 가능. */
    aspect?: 'square' | 'vertical' | 'horizontal';
}

/**
 * AI 이미지 생성.
 *   - R2 설정되어 있으면: 자동 업로드 → public URL 반환 (캠페인 mediaUrls 에 그대로 사용 가능)
 *   - R2 미설정: base64 data URL 만 반환 (미리보기/다운로드 용도. Telegram/WordPress/Discord 직접
 *     첨부는 안 됨 — http URL 만 받음)
 */
export async function generateCampaignImage(input: GenerateCampaignImageInput): Promise<{
    success: boolean;
    /** R2 public URL (R2 설정 시) — 캠페인 mediaUrls 에 그대로 저장. */
    url?: string;
    /** base64 data URL — 미리보기 + R2 미설정 폴백. */
    dataUrl?: string;
    engine?: string;
    sizeKb?: number;
    /** 'r2' | 'inline' — UI 가 어디로 저장됐는지 표시. */
    storage: 'r2' | 'inline';
    error?: string;
}> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, storage: 'inline', error: 'Unauthorized' };

    if (!input.prompt?.trim()) return { success: false, storage: 'inline', error: '이미지 프롬프트를 입력하세요.' };

    try {
        const aspect = input.aspect || 'square';
        const dims = aspect === 'vertical'
            ? { width: 1024, height: 1792 }
            : aspect === 'horizontal'
                ? { width: 1792, height: 1024 }
                : { width: 1024, height: 1024 };

        const r = await generateImage({
            prompt: input.prompt.trim(),
            ...dims,
            userId: session.user.id,
        });

        const dataUrl = `data:${r.mimeType};base64,${r.bytes.toString('base64')}`;
        const sizeKb = Math.round(r.bytes.length / 1024);

        // R2 설정되어 있으면 자동 업로드 → URL 반환
        if (isR2Configured()) {
            try {
                const uploaded = await uploadToR2({
                    data: r.bytes,
                    keyPrefix: `users/${session.user.id}/ai-images/${aspect}`,
                    contentType: r.mimeType,
                });
                return {
                    success: true,
                    url: uploaded.url,
                    dataUrl, // 미리보기용 — 클라이언트가 즉시 보여줄 때 url 보다 빠름
                    engine: r.engine,
                    sizeKb,
                    storage: 'r2',
                };
            } catch (e: any) {
                // R2 업로드 실패 → inline 폴백
                console.warn('[R2 upload failed, falling back to inline]', e?.message);
                return {
                    success: true,
                    dataUrl,
                    engine: r.engine,
                    sizeKb,
                    storage: 'inline',
                };
            }
        }

        // R2 미설정 → 기존 inline 동작
        return {
            success: true,
            dataUrl,
            engine: r.engine,
            sizeKb,
            storage: 'inline',
        };
    } catch (e: any) {
        console.error('[generateCampaignImage]', e);
        return { success: false, storage: 'inline', error: e?.message || 'AI 이미지 생성 실패' };
    }
}

/**
 * 모든 플랫폼 포맷 정보 — UI 미리보기용 (각 채널별 maxChars/hashtagCount/tone 표시).
 */
export async function getPlatformFormats(): Promise<typeof PLATFORM_FORMATS> {
    return PLATFORM_FORMATS;
}
