/**
 * AI 이미지 생성 — sns-auto-platform `image_gen.py` 의 TS 포팅.
 *
 * 폴백 체인 (engine_config 의 task_priorities['image_gen']):
 *   1. pollinations (무료, 키 X) — 첫 시도 추천
 *   2. openai (DALL-E 3, $0.04~$0.08/장) — 사용자 OPENAI_API_KEY
 *   3. gemini (Imagen 3) — 사용자 GEMINI_API_KEY
 *
 * 예산 초과 시 유료 엔진(openai)은 자동 skip → pollinations 무료 폴백.
 *
 * 결과는 base64 buffer + MIME 으로 반환. 실제 저장(R2/S3 업로드 등)은
 * caller 가 처리. 향후 R2 업로드 헬퍼를 별도 모듈로 분리.
 */
import { getApiKey, getPriorityForTask, isOverBudget, dropPaidEngines, incrUsage } from './engine-config';

export type ImageEngineName = 'pollinations' | 'openai' | 'gemini';

export interface GenerateImageInput {
    prompt: string;
    width?: number;
    height?: number;
    userId?: string | null;
}

export interface GenerateImageResult {
    engine: ImageEngineName;
    bytes: Buffer;
    mimeType: 'image/png' | 'image/jpeg';
    /** 호출 측에서 R2/S3 업로드 후 채우는 URL — 본 함수는 반환하지 않음 */
}

// ════════════════════════════════════════════════════════════
//  엔진별 호출 함수
// ════════════════════════════════════════════════════════════
async function pollinations(prompt: string, width: number, height: number): Promise<Buffer> {
    // Pollinations.ai — 키 불필요, 무료, GET 한 번
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&enhance=true`;
    const r = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(180000),
    });
    if (!r.ok) throw new Error(`Pollinations ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 1000) throw new Error(`Pollinations 응답 너무 작음 (${buf.length} bytes)`);
    return buf;
}

async function openaiDalle(
    prompt: string, width: number, height: number, userId?: string | null,
): Promise<Buffer> {
    const key = await getApiKey('openai', userId);
    if (!key) throw new Error('OPENAI_API_KEY 없음');
    // DALL-E 3 는 1024x1024 / 1024x1792 / 1792x1024 만 지원
    let size: string;
    if (width >= height * 1.4) size = '1792x1024';
    else if (height >= width * 1.4) size = '1024x1792';
    else size = '1024x1024';

    const r = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'dall-e-3',
            prompt,
            size,
            n: 1,
            response_format: 'url',
        }),
        signal: AbortSignal.timeout(120000),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data = await r.json();
    const imgUrl = data?.data?.[0]?.url;
    if (!imgUrl) throw new Error('DALL-E 응답에 url 없음');

    const imgResp = await fetch(imgUrl, { signal: AbortSignal.timeout(120000) });
    if (!imgResp.ok) throw new Error(`DALL-E url fetch ${imgResp.status}`);
    return Buffer.from(await imgResp.arrayBuffer());
}

async function geminiImagen(
    prompt: string, _width: number, _height: number, userId?: string | null,
): Promise<Buffer> {
    const key = await getApiKey('gemini', userId);
    if (!key) throw new Error('GEMINI_API_KEY 없음');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${key}`;
    const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            instances: [{ prompt }],
            parameters: { sampleCount: 1, aspectRatio: '1:1' },
        }),
        signal: AbortSignal.timeout(120000),
    });
    if (!r.ok) throw new Error(`Gemini Imagen ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data = await r.json();
    const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) throw new Error(`Gemini Imagen 응답 형식 예상 외: ${JSON.stringify(data).slice(0, 200)}`);
    return Buffer.from(b64, 'base64');
}

const ENGINES: Record<ImageEngineName, (prompt: string, w: number, h: number, userId?: string | null) => Promise<Buffer>> = {
    pollinations: (p, w, h) => pollinations(p, w, h),
    openai:       (p, w, h, u) => openaiDalle(p, w, h, u),
    gemini:       (p, w, h, u) => geminiImagen(p, w, h, u),
};

// ════════════════════════════════════════════════════════════
//  메인 함수
// ════════════════════════════════════════════════════════════
/**
 * 프롬프트로 이미지 생성. user별 task_priorities['image_gen'] 로 폴백.
 * monthlyBudgetUsd 초과 시 유료 엔진(openai) 자동 skip → 무료(pollinations) 폴백.
 *
 * Pollinations 는 키 불필요이므로 priority 에 없어도 항상 마지막 폴백으로 추가.
 */
export async function generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
    const { prompt, width = 1024, height = 1024, userId } = input;

    let priority = (await getPriorityForTask('image_gen', userId)) as string[];
    if (await isOverBudget(userId)) {
        priority = dropPaidEngines(priority);
        console.warn('[image_gen] 월간 예산 초과 — 유료 엔진 skip, 무료만 사용');
    }
    if (!priority.includes('pollinations')) priority = [...priority, 'pollinations'];

    let lastErr: string | null = null;
    for (const engineName of priority) {
        const fn = ENGINES[engineName as ImageEngineName];
        if (!fn) continue;
        try {
            const bytes = await fn(prompt, width, height, userId);
            console.log(`[image_gen] ${engineName} 성공 (${bytes.length} bytes)`);
            void incrUsage({ scope: userId || 'global', kind: 'image_gen', engine: engineName });
            return { engine: engineName as ImageEngineName, bytes, mimeType: 'image/png' };
        } catch (e: any) {
            lastErr = `${engineName}: ${e?.message || e}`;
            console.warn(`[image_gen] ${engineName} 실패, 다음... (${e?.message || e})`);
        }
    }
    throw new Error(`모든 이미지 생성 엔진 실패. 마지막: ${lastErr}`);
}
