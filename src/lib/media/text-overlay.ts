/**
 * 이미지 위 텍스트 오버레이 — sharp + SVG composite.
 *
 * 클라이언트 canvas 편집기 보다 ㄱ단한 서버 사이드 변형.
 * 사용 시나리오:
 *   - AI 이미지 생성 후 캠페인 제목 자막 추가
 *   - 같은 배경에 메시지만 다른 N개 변형 (A/B)
 *   - 채널별 이미지에 채널명/날짜 워터마크
 *
 * 위치 옵션:
 *   - top, center, bottom (수직)
 *   - x: left, center, right (수평)
 *
 * 스타일:
 *   - fontSize: rem(이미지 너비 기준 % — 기본 6%)
 *   - color: 텍스트 색
 *   - bgColor: 텍스트 뒤 박스 색 (rgba 가능, 미지정 시 배경 없음)
 *   - shadow: true 면 검은 그림자 (가독성 향상)
 *
 * 폰트: SVG 의 'font-family' 만 지정 가능. 시스템 기본 sans-serif 사용 (Vercel build 에 한글 폰트 없음 →
 * 실제 한글은 fallback 으로 깨질 수 있음). 한글 필요시 R2 에 NotoSansKR woff 업로드 후 SVG @font-face
 * 로 embed 추후 확장 가능.
 */
import sharp from 'sharp';

export type OverlayPosition = 'top' | 'center' | 'bottom';
export type OverlayAlign = 'left' | 'center' | 'right';

export interface OverlayOptions {
    text: string;
    position?: OverlayPosition;
    align?: OverlayAlign;
    /** 텍스트 크기 — 이미지 너비의 %. 기본 6 (예: 1080px 이미지 → 64px) */
    fontSizePercent?: number;
    color?: string;
    /** 박스 배경 — rgba 사용 권장 (예 'rgba(0,0,0,0.5)'). undefined 면 박스 없음. */
    bgColor?: string;
    /** 텍스트 그림자 (검은 외곽선 효과 — 가독성 향상). 기본 true */
    shadow?: boolean;
    fontFamily?: string;
    /** 좌우 padding — 이미지 너비의 %. 기본 4. */
    paddingPercent?: number;
}

/**
 * 이미지에 텍스트 1줄 오버레이.
 *
 * 자동 줄바꿈은 안 함 (긴 텍스트는 사용자가 직접 \n 으로 분리). UI 에서 미리 자르도록 권장.
 */
export async function applyTextOverlay(input: {
    data: Buffer | string; // Buffer | data URL
    overlay: OverlayOptions;
    /** 출력 포맷 */
    format?: 'jpeg' | 'png' | 'webp';
    quality?: number;
}): Promise<{ buffer: Buffer; mimeType: string; width: number; height: number; sizeKb: number }> {
    const buffer = typeof input.data === 'string'
        ? Buffer.from(input.data.split(',')[1] || input.data, 'base64')
        : input.data;

    // 메타 추출 (텍스트 크기·위치 계산용)
    const meta = await sharp(buffer).metadata();
    const W = meta.width || 1080;
    const H = meta.height || 1080;

    const o = input.overlay;
    const fontSize = Math.round(W * ((o.fontSizePercent ?? 6) / 100));
    const padding = Math.round(W * ((o.paddingPercent ?? 4) / 100));
    const color = o.color || 'white';
    const bgColor = o.bgColor;
    const shadow = o.shadow !== false;
    const fontFamily = o.fontFamily || 'system-ui, -apple-system, "Helvetica Neue", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

    // 줄 단위 분리 (\n 또는 \\n)
    const lines = (o.text || '').replace(/\\n/g, '\n').split('\n').filter(l => l.length > 0);
    if (lines.length === 0) {
        // 텍스트 없으면 원본 그대로 반환 (포맷만 변환)
        return justEncode(buffer, input.format, input.quality);
    }

    // 각 줄의 height = fontSize * 1.2 (line-height)
    const lineHeight = Math.round(fontSize * 1.2);
    const totalTextHeight = lineHeight * lines.length;

    // 수직 위치
    const position = o.position || 'bottom';
    let yStart: number;
    if (position === 'top') yStart = padding + fontSize;
    else if (position === 'center') yStart = Math.round(H / 2 - totalTextHeight / 2 + fontSize);
    else yStart = H - padding - totalTextHeight + fontSize;

    // 수평 정렬
    const align = o.align || 'center';
    const textAnchor = align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle';
    const xText = align === 'left' ? padding : align === 'right' ? W - padding : Math.round(W / 2);

    // 박스 배경 (옵션) — 텍스트 영역 wrap
    const boxPaddingV = Math.round(fontSize * 0.4);
    const boxPaddingH = Math.round(fontSize * 0.6);
    const boxRect = bgColor ? `<rect x="0" y="${yStart - fontSize - boxPaddingV}" width="${W}" height="${totalTextHeight + boxPaddingV * 2}" fill="${escapeAttr(bgColor)}" />` : '';

    // 그림자 — 텍스트를 한 번 검은색으로 살짝 offset 두고 깔기
    const shadowFilter = shadow ? `<filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="${Math.round(fontSize * 0.05)}" stdDeviation="${Math.round(fontSize * 0.04)}" flood-color="black" flood-opacity="0.7"/></filter>` : '';

    // SVG 조립
    const textElements = lines.map((line, i) => {
        const y = yStart + i * lineHeight;
        return `<text x="${xText}" y="${y}" font-family='${escapeAttr(fontFamily)}' font-size="${fontSize}" font-weight="700" fill="${escapeAttr(color)}" text-anchor="${textAnchor}" ${shadow ? 'filter="url(#sh)"' : ''}>${escapeXml(line)}</text>`;
    }).join('\n');

    const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
        <defs>${shadowFilter}</defs>
        ${boxRect}
        ${textElements}
    </svg>`;

    const composed = await sharp(buffer)
        .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
        .toBuffer();

    return justEncode(composed, input.format, input.quality, W, H);
}

async function justEncode(buffer: Buffer, format?: 'jpeg' | 'png' | 'webp', quality?: number, w?: number, h?: number) {
    const fmt = format || 'jpeg';
    const q = quality || 85;
    let p = sharp(buffer);
    if (fmt === 'jpeg') p = p.jpeg({ quality: q, mozjpeg: true });
    else if (fmt === 'webp') p = p.webp({ quality: q });
    else p = p.png({ compressionLevel: 9 });
    const out = await p.toBuffer();
    const meta = w && h ? { width: w, height: h } : await sharp(out).metadata();
    return {
        buffer: out,
        mimeType: fmt === 'jpeg' ? 'image/jpeg' : fmt === 'webp' ? 'image/webp' : 'image/png',
        width: meta.width || 0,
        height: meta.height || 0,
        sizeKb: Math.round(out.length / 1024),
    };
}

function escapeXml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function escapeAttr(s: string): string {
    return s.replace(/"/g, '&quot;');
}
