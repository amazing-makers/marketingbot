/**
 * Sharp 기반 이미지 비율/사이즈 자동 변환.
 *
 * 채널별 권장 비율:
 *   - Instagram feed:    1:1 (1080×1080) — square
 *   - Instagram story:   9:16 (1080×1920) — vertical_story
 *   - Instagram reels:   9:16 (1080×1920) — vertical_story
 *   - Instagram portrait:4:5 (1080×1350) — portrait
 *   - Facebook feed:     1.91:1 (1200×628) — wide
 *   - YouTube thumbnail: 16:9 (1280×720) — landscape
 *   - X / Twitter:       16:9 (1200×675) — landscape
 *   - LinkedIn:          1.91:1 (1200×627) — wide
 *   - Pinterest:         2:3 (1000×1500) — portrait_tall
 *   - TikTok / Shorts:   9:16 (1080×1920) — vertical_story
 *
 * 동작:
 *   - resize fit: 'cover' (잘라내기 — 가장자리 잘림 허용, 중심 유지)
 *   - JPG quality 85 (or PNG → WebP 변환 옵션)
 *
 * Vercel serverless 호환:
 *   - sharp 0.33+ 는 prebuilt binary 자동 (linux-x64).
 *   - 함수 메모리 1024MB 권장 (기본 1024 OK).
 */
import sharp from 'sharp';

export type AspectPreset =
    | 'square'           // 1:1
    | 'portrait'         // 4:5
    | 'portrait_tall'    // 2:3
    | 'vertical_story'   // 9:16
    | 'landscape'        // 16:9
    | 'wide';            // 1.91:1

const PRESETS: Record<AspectPreset, { width: number; height: number; label: string }> = {
    square:         { width: 1080, height: 1080, label: '1:1 (정사각 — Instagram feed)' },
    portrait:       { width: 1080, height: 1350, label: '4:5 (세로 — Instagram portrait)' },
    portrait_tall:  { width: 1000, height: 1500, label: '2:3 (Pinterest)' },
    vertical_story: { width: 1080, height: 1920, label: '9:16 (Story / Reels / Shorts / TikTok)' },
    landscape:      { width: 1280, height: 720,  label: '16:9 (YouTube / X)' },
    wide:           { width: 1200, height: 628,  label: '1.91:1 (Facebook / LinkedIn)' },
};

/**
 * 채널 type → 권장 preset 매핑 (자동 변환 시 사용).
 */
import type { ChannelType } from '@prisma/client';

export const CHANNEL_PRESETS: Partial<Record<ChannelType, AspectPreset>> = {
    INSTAGRAM:    'square',
    THREADS:      'square',
    FACEBOOK:     'wide',
    X:            'landscape',
    TIKTOK:       'vertical_story',
    YOUTUBE:      'landscape',
    NAVER_BLOG:   'wide',
    NAVER_CAFE:   'wide',
    KAKAO:        'wide',
    LINKEDIN:     'wide',
    PINTEREST:    'portrait_tall',
    DOUYIN:       'vertical_story',
    XIAOHONGSHU:  'square',
    WEIBO:        'square',
    LINE:         'wide',
    WHATSAPP:     'square',
    VK:           'wide',
    WORDPRESS:    'wide',
    TELEGRAM:     'wide',
    DISCORD:      'wide',
    TISTORY:      'wide',
    EMAIL:        'wide',
    SMS:          'wide',
};

export function getPresetSpec(preset: AspectPreset) {
    return PRESETS[preset];
}

export function getAllPresets() {
    return PRESETS;
}

/**
 * 이미지 (Buffer 또는 base64) 를 단일 preset 비율로 변환.
 *
 * fit: 'cover' — 비율이 다르면 가장자리를 잘라 중심을 유지 (사람·로고가 중심에 있다고 가정).
 * 출력 포맷: JPEG 85 quality (용량 작고 SNS 호환 가장 넓음).
 */
export async function resizeImage(input: {
    data: Buffer | string;  // Buffer | data URL
    preset: AspectPreset;
    /** 'cover' = 잘라내기 (기본), 'contain' = 여백 추가, 'inside' = 비율 유지 축소만 */
    fit?: 'cover' | 'contain' | 'inside';
    /** background — fit='contain' 일 때 여백 색 */
    background?: { r: number; g: number; b: number; alpha?: number };
    /** 출력 포맷 */
    format?: 'jpeg' | 'png' | 'webp';
    quality?: number;
}): Promise<{ buffer: Buffer; mimeType: string; width: number; height: number; sizeKb: number }> {
    const buffer = typeof input.data === 'string'
        ? Buffer.from(input.data.split(',')[1] || input.data, 'base64')
        : input.data;

    const spec = PRESETS[input.preset];
    const fit = input.fit || 'cover';
    const format = input.format || 'jpeg';
    const quality = input.quality || 85;
    const bg = input.background || { r: 255, g: 255, b: 255, alpha: 1 };

    let pipeline = sharp(buffer).resize({
        width: spec.width,
        height: spec.height,
        fit,
        background: bg,
        position: 'center',
        withoutEnlargement: false,
    });

    if (format === 'jpeg') pipeline = pipeline.jpeg({ quality, mozjpeg: true });
    else if (format === 'webp') pipeline = pipeline.webp({ quality });
    else pipeline = pipeline.png({ compressionLevel: 9 });

    const out = await pipeline.toBuffer();
    return {
        buffer: out,
        mimeType: format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png',
        width: spec.width,
        height: spec.height,
        sizeKb: Math.round(out.length / 1024),
    };
}

/**
 * 한 이미지를 N 개 preset 으로 일괄 변환 — 캠페인이 여러 채널에 발행될 때 채널별 비율 동시 생성.
 *
 * 반환: { preset → { buffer, mime, ... } }
 */
export async function resizeForChannels(input: {
    data: Buffer | string;
    channelTypes: ChannelType[];
    format?: 'jpeg' | 'png' | 'webp';
    quality?: number;
}): Promise<Map<AspectPreset, { buffer: Buffer; mimeType: string; width: number; height: number; sizeKb: number }>> {
    // 채널 type 들의 권장 preset 을 unique 로 추출 (같은 비율 채널 들은 1번만 변환)
    const presetSet = new Set<AspectPreset>();
    for (const ct of input.channelTypes) {
        const p = CHANNEL_PRESETS[ct];
        if (p) presetSet.add(p);
    }
    if (presetSet.size === 0) return new Map();

    // 병렬 변환
    const buffer = typeof input.data === 'string'
        ? Buffer.from(input.data.split(',')[1] || input.data, 'base64')
        : input.data;
    const entries = await Promise.all(
        Array.from(presetSet).map(async (preset) => {
            const r = await resizeImage({
                data: buffer,
                preset,
                fit: 'cover',
                format: input.format,
                quality: input.quality,
            });
            return [preset, r] as const;
        })
    );
    return new Map(entries);
}

/**
 * 이미지 메타 추출 — width/height/format. 업로드 검증·미리보기용.
 */
export async function inspectImage(data: Buffer | string): Promise<{
    width?: number; height?: number; format?: string; size: number;
}> {
    const buffer = typeof data === 'string'
        ? Buffer.from(data.split(',')[1] || data, 'base64')
        : data;
    const meta = await sharp(buffer).metadata();
    return {
        width: meta.width,
        height: meta.height,
        format: meta.format,
        size: buffer.length,
    };
}
