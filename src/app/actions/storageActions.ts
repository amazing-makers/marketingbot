'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { uploadToR2, deleteFromR2, isR2Configured, verifyR2Config } from '@/lib/storage/r2';
import { resizeForChannels, getAllPresets, CHANNEL_PRESETS, type AspectPreset } from '@/lib/media/image-resize';
import { applyTextOverlay, type OverlayOptions } from '@/lib/media/text-overlay';
import type { ChannelType } from '@prisma/client';

/**
 * 사용자 업로드 — 캠페인 첨부 이미지/비디오를 R2 에 저장 후 public URL 반환.
 *
 * 클라이언트에서 FileReader 로 읽은 base64 data URL 을 받아 업로드.
 * 캠페인 mediaUrls 에 그대로 사용 가능 (Telegram/WordPress/Discord 모두 http URL 첨부 지원).
 */
export async function uploadMediaToR2(input: {
    dataUrl: string;
    /** 'campaign-media' | 'avatar' | 'overlay' 등 — keyPrefix 분리용 */
    purpose?: string;
    filename?: string;
}): Promise<{ success: boolean; url?: string; key?: string; sizeKb?: number; error?: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    if (!isR2Configured()) {
        return { success: false, error: 'R2 미설정 — 환경변수 R2_ENDPOINT/R2_BUCKET 등을 등록하세요.' };
    }
    if (!input.dataUrl?.startsWith('data:')) {
        return { success: false, error: 'data URL 형식이 아닙니다.' };
    }

    try {
        const result = await uploadToR2({
            data: input.dataUrl,
            keyPrefix: `users/${session.user.id}/${input.purpose || 'uploads'}`,
            filename: input.filename,
        });
        return {
            success: true,
            url: result.url,
            key: result.key,
            sizeKb: Math.round(result.size / 1024),
        };
    } catch (e: any) {
        console.error('[uploadMediaToR2]', e);
        return { success: false, error: e?.message || 'R2 업로드 실패' };
    }
}

/**
 * R2 객체 삭제 — 캠페인 미디어 제거할 때 호출.
 */
export async function deleteMediaFromR2(key: string): Promise<{ success: boolean; error?: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };
    // key 가 사용자 본인 폴더에 속하는지 검증 (다른 사용자 객체 삭제 방지)
    if (!key.startsWith(`users/${session.user.id}/`)) {
        return { success: false, error: '자신의 객체만 삭제할 수 있습니다.' };
    }
    try {
        await deleteFromR2(key);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e?.message || '삭제 실패' };
    }
}

/**
 * R2 설정 검증 — `/dashboard/settings/storage` 등에서 "테스트" 버튼.
 */
export async function testR2Connection(): Promise<{ ok: boolean; bucket?: string; configured: boolean; error?: string }> {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, configured: false, error: 'Unauthorized' };
    if (!isR2Configured()) return { ok: false, configured: false, error: '환경변수 미설정' };
    const result = await verifyR2Config();
    return { ...result, configured: true };
}

/**
 * 한 이미지를 선택한 채널들의 권장 비율 모두로 자동 변환 → R2 업로드 → channelType→URL 매핑 반환.
 *
 * 캠페인 생성 폼에서 호출:
 *   1. 사용자가 1장 업로드 + 채널 N개 선택
 *   2. 이 함수가 채널별 비율로 N개 (또는 unique preset 수만큼) 변환 + 업로드
 *   3. 반환된 매핑을 캠페인 mediaUrls 에 저장 → 발행 시 채널별로 적합한 URL 사용
 *
 * R2 미설정 시: 변환만 하고 dataUrl 로 반환 (미리보기용, 외부 발행 안 됨).
 */
export async function processImageForChannels(input: {
    /** base64 data URL (사용자 업로드 또는 AI 생성 결과) */
    dataUrl: string;
    /** 선택한 채널 ID 배열 */
    channelIds: string[];
}): Promise<{
    success: boolean;
    /** preset → public URL (R2) 또는 data URL (R2 미설정) */
    byPreset?: Record<AspectPreset, string>;
    /** 채널 ID → 적용된 URL (편의) */
    byChannelId?: Record<string, string>;
    /** 어디 저장됐는지 표시용 */
    storage: 'r2' | 'inline';
    error?: string;
}> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, storage: 'inline', error: 'Unauthorized' };

    if (!input.dataUrl?.startsWith('data:')) {
        return { success: false, storage: 'inline', error: 'data URL 형식이 아닙니다.' };
    }
    if (!input.channelIds?.length) {
        return { success: false, storage: 'inline', error: '채널을 1개 이상 선택하세요.' };
    }

    try {
        // 채널 type 조회
        const channels = await prisma.marketingChannel.findMany({
            where: { id: { in: input.channelIds }, userId: session.user.id! },
            select: { id: true, type: true },
        });
        if (channels.length === 0) {
            return { success: false, storage: 'inline', error: '선택한 채널을 찾을 수 없습니다.' };
        }

        const channelTypes = channels.map(c => c.type);
        const resized = await resizeForChannels({
            data: input.dataUrl,
            channelTypes,
            format: 'jpeg',
            quality: 85,
        });

        const byPreset: Record<string, string> = {};
        const useR2 = isR2Configured();

        // 각 preset 의 결과를 R2 또는 inline 으로 저장
        for (const [preset, result] of resized.entries()) {
            if (useR2) {
                try {
                    const uploaded = await uploadToR2({
                        data: result.buffer,
                        keyPrefix: `users/${session.user.id}/campaign-media/${preset}`,
                        contentType: result.mimeType,
                    });
                    byPreset[preset] = uploaded.url;
                } catch (e: any) {
                    console.warn(`[R2 upload ${preset} failed]`, e?.message);
                    // 폴백 — base64 inline
                    byPreset[preset] = `data:${result.mimeType};base64,${result.buffer.toString('base64')}`;
                }
            } else {
                byPreset[preset] = `data:${result.mimeType};base64,${result.buffer.toString('base64')}`;
            }
        }

        // channelId → URL 매핑
        const byChannelId: Record<string, string> = {};
        for (const ch of channels) {
            const preset = CHANNEL_PRESETS[ch.type];
            if (preset && byPreset[preset]) byChannelId[ch.id] = byPreset[preset];
        }

        return {
            success: true,
            byPreset: byPreset as Record<AspectPreset, string>,
            byChannelId,
            storage: useR2 ? 'r2' : 'inline',
        };
    } catch (e: any) {
        console.error('[processImageForChannels]', e);
        return { success: false, storage: 'inline', error: e?.message || '이미지 처리 실패' };
    }
}

/**
 * 이미지에 텍스트 오버레이 추가 → R2 업로드 (또는 inline data URL).
 *
 * 캠페인 생성 폼 "오버레이 추가" 버튼에서 호출:
 *   - 사용자가 캠페인 본문/제목을 한 줄로 자른 텍스트 입력
 *   - 위치 (위/가운데/아래), 색, 박스 배경 선택
 *   - 결과 URL/dataUrl 을 캠페인 mediaUrls 에 저장
 */
export async function addTextOverlay(input: {
    dataUrl: string;
    overlay: OverlayOptions;
    /** R2 키 prefix용 — 'overlay' 등 */
    purpose?: string;
}): Promise<{ success: boolean; url?: string; sizeKb?: number; storage: 'r2' | 'inline'; error?: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, storage: 'inline', error: 'Unauthorized' };

    if (!input.dataUrl?.startsWith('data:')) {
        return { success: false, storage: 'inline', error: 'data URL 형식이 아닙니다.' };
    }
    if (!input.overlay?.text?.trim()) {
        return { success: false, storage: 'inline', error: '오버레이 텍스트가 비어있습니다.' };
    }

    try {
        const result = await applyTextOverlay({
            data: input.dataUrl,
            overlay: input.overlay,
            format: 'jpeg',
            quality: 85,
        });

        if (isR2Configured()) {
            try {
                const uploaded = await uploadToR2({
                    data: result.buffer,
                    keyPrefix: `users/${session.user.id}/${input.purpose || 'overlay'}`,
                    contentType: result.mimeType,
                });
                return { success: true, url: uploaded.url, sizeKb: result.sizeKb, storage: 'r2' };
            } catch (e: any) {
                console.warn('[R2 upload overlay failed]', e?.message);
            }
        }
        // 폴백 — inline
        return {
            success: true,
            url: `data:${result.mimeType};base64,${result.buffer.toString('base64')}`,
            sizeKb: result.sizeKb,
            storage: 'inline',
        };
    } catch (e: any) {
        console.error('[addTextOverlay]', e);
        return { success: false, storage: 'inline', error: e?.message || '오버레이 처리 실패' };
    }
}

/**
 * 이미지를 단일 preset 으로 변환 → R2 업로드 (미리보기·테스트용).
 */
export async function resizeAndUpload(input: {
    dataUrl: string;
    preset: AspectPreset;
    purpose?: string;
}): Promise<{ success: boolean; url?: string; sizeKb?: number; error?: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    const all = getAllPresets();
    if (!all[input.preset]) return { success: false, error: '알 수 없는 preset' };

    try {
        const resized = await resizeForChannels({
            data: input.dataUrl,
            channelTypes: ['INSTAGRAM' as ChannelType], // 일단 1개 더미 — preset 강제는 아래에서 직접
            format: 'jpeg',
            quality: 85,
        });
        // 위 채널 매핑이 INSTAGRAM=square 라 항상 'square'. 단일 preset 호출은 별도 함수가 더 깔끔하지만 일단 이렇게 처리.
        // 사용자 지정 preset 으로 변환:
        const { resizeImage } = await import('@/lib/media/image-resize');
        const r = await resizeImage({
            data: input.dataUrl,
            preset: input.preset,
            format: 'jpeg',
            quality: 85,
        });
        // R2 업로드 시도
        if (isR2Configured()) {
            const uploaded = await uploadToR2({
                data: r.buffer,
                keyPrefix: `users/${session.user.id}/${input.purpose || 'resized'}/${input.preset}`,
                contentType: r.mimeType,
            });
            return { success: true, url: uploaded.url, sizeKb: r.sizeKb };
        }
        // R2 미설정 → data URL 반환
        return {
            success: true,
            url: `data:${r.mimeType};base64,${r.buffer.toString('base64')}`,
            sizeKb: r.sizeKb,
        };
    } catch (e: any) {
        return { success: false, error: e?.message || '변환·업로드 실패' };
    }
}
