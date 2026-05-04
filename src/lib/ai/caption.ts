/**
 * AI 게시물 생성 — sns-auto-platform `ai_caption.py` 의 TS 포팅.
 *
 * 플랫폼을 "출력 포맷"으로 그룹핑해 각 포맷에 맞는 프롬프트·스키마로 생성.
 * 포맷 종류:
 *   - sns_caption  : 일반 SNS 캡션 (Instagram/Facebook/Telegram/TikTok 등)
 *   - sns_micro    : 280자 단문 (X/Twitter)
 *   - sns_business : 비즈니스 톤 장문 (LinkedIn)
 *   - blog         : 장문 블로그 (네이버 블로그/티스토리/워드프레스)
 *   - video        : 영상 메타데이터 (YouTube)
 *
 * 엔진 폴백 (task 별):
 *   sns_short     : Groq → Gemini → OpenAI → Ollama → Claude
 *   blog_long     : Claude → OpenAI → Gemini → Groq
 *   vision        : Gemini → OpenAI → Claude → Ollama (이미지 첨부 시)
 *
 * 키 미등록 엔진은 자동으로 다음으로 폴백.
 */
import { promises as fs } from 'fs';
import { extname } from 'path';
import {
    getApiKey,
    getModel,
    getPriorityForTask,
    incrUsage,
    type TaskName,
} from './engine-config';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ════════════════════════════════════════════════════════════
//  플랫폼 → 포맷 매핑 (16 플랫폼 × 5 포맷)
// ════════════════════════════════════════════════════════════
type FormatName = 'sns_caption' | 'sns_micro' | 'sns_business' | 'blog' | 'video';

interface PlatformSpec {
    format: FormatName;
    maxChars: number;
    hashtagCount: number;
    tone: string;
}

export const PLATFORM_FORMATS: Record<string, PlatformSpec> = {
    // SNS 캡션 (이미지/영상 + 캡션 + 해시태그 묶음)
    instagram:    { format: 'sns_caption',  maxChars: 2200,  hashtagCount: 20, tone: '비주얼 중심·감성적, 첫 줄 후킹' },
    facebook:     { format: 'sns_caption',  maxChars: 5000,  hashtagCount: 5,  tone: '친근·공유 유도, 스토리텔링' },
    tiktok:       { format: 'sns_caption',  maxChars: 2200,  hashtagCount: 10, tone: '트렌디·MZ 감성, 짧고 임팩트' },
    telegram:     { format: 'sns_caption',  maxChars: 4096,  hashtagCount: 5,  tone: '직접적·정보성' },
    discord:      { format: 'sns_caption',  maxChars: 2000,  hashtagCount: 0,  tone: '커뮤니티·친근, 마크다운 사용 가능, 해시태그 안 씀' },
    weibo:        { format: 'sns_caption',  maxChars: 2000,  hashtagCount: 5,  tone: '트렌디·중국 감성' },
    xiaohongshu:  { format: 'sns_caption',  maxChars: 1000,  hashtagCount: 10, tone: '라이프스타일·이모지 풍부, 첫 줄 후킹' },
    vk:           { format: 'sns_caption',  maxChars: 4000,  hashtagCount: 5,  tone: '친근·러시아권' },
    line:         { format: 'sns_caption',  maxChars: 1000,  hashtagCount: 3,  tone: '친근·간결, 일본권' },
    whatsapp:     { format: 'sns_caption',  maxChars: 1024,  hashtagCount: 3,  tone: '직접적·메시지형' },
    pinterest:    { format: 'sns_caption',  maxChars: 500,   hashtagCount: 8,  tone: '검색 친화·키워드 중심' },
    douyin:       { format: 'sns_caption',  maxChars: 2200,  hashtagCount: 8,  tone: '트렌디·중국 MZ' },
    threads:      { format: 'sns_caption',  maxChars: 500,   hashtagCount: 5,  tone: '간결·대화형, X와 비슷' },
    naver_cafe:   { format: 'sns_caption',  maxChars: 5000,  hashtagCount: 5,  tone: '커뮤니티 친화·정보성' },

    // SNS 단문
    twitter:      { format: 'sns_micro',    maxChars: 280,   hashtagCount: 3,  tone: '간결·임팩트, 해시태그 본문 포함' },
    x:            { format: 'sns_micro',    maxChars: 280,   hashtagCount: 3,  tone: '간결·임팩트, 해시태그 본문 포함' },

    // 비즈니스 톤
    linkedin:     { format: 'sns_business', maxChars: 3000,  hashtagCount: 5,  tone: '전문적·인사이트·CTA' },

    // 블로그 장문
    naver_blog:   { format: 'blog',         maxChars: 50000, hashtagCount: 15, tone: '정보성·친근, 한국 블로그 톤' },
    tistory:      { format: 'blog',         maxChars: 50000, hashtagCount: 15, tone: '정보성·친근, 한국 블로그 톤' },
    wordpress:    { format: 'blog',         maxChars: 50000, hashtagCount: 10, tone: '정보성·SEO, 글로벌 블로그 톤' },

    // 영상 메타
    youtube:      { format: 'video',        maxChars: 5000,  hashtagCount: 10, tone: 'SEO 키워드·CTR 유도' },
};

function resolveSpec(platform: string): PlatformSpec {
    return PLATFORM_FORMATS[platform.toLowerCase()] || {
        format: 'sns_caption', maxChars: 2000, hashtagCount: 5, tone: '자연스럽게',
    };
}

// 포맷 → task 매핑 (engine_config 의 task_priorities 키)
const FORMAT_TASK: Record<FormatName, TaskName> = {
    sns_caption:  'sns_short',
    sns_micro:    'micro_280',
    sns_business: 'business_cta',
    blog:         'blog_long',
    video:        'video_meta',
};

const LANG_NAME = (lang: string) => ({
    ko: '한국어', en: '영어', ja: '일본어', zh: '중국어 간체',
}[lang] || lang);

// ════════════════════════════════════════════════════════════
//  포맷별 프롬프트 빌더
// ════════════════════════════════════════════════════════════
function buildSnsCaptionPrompt(platforms: string[], userHint: string, language: string): string {
    const lang = LANG_NAME(language);
    const guides = platforms.map(p => {
        const s = resolveSpec(p);
        return `- ${p}: 최대 ${s.maxChars}자, 해시태그 ${s.hashtagCount}개, 톤: ${s.tone}`;
    }).join('\n');
    return `당신은 SNS 마케팅 전문가입니다. 아래 플랫폼별 최적화된 캡션을 ${lang}로 작성하세요.
${userHint ? `주제·맥락: ${userHint}` : ''}

작성 원칙 (중요):
- 첫 줄은 스크롤을 멈추게 하는 강한 후킹 문장
- 본문은 줄바꿈으로 가독성 확보 (2-3줄마다 빈 줄)
- 본문 안에 # 해시태그를 섞지 말고, hashtags 배열에 따로 정리
- 이모지는 자연스럽게 사용 (남발 금지)

대상 플랫폼:
${guides}

반드시 아래 JSON 형식으로만 반환 (다른 설명·머리말 없이):
{
  "platform_id": {
    "text": "캡션 본문 (해시태그 없음)",
    "hashtags": ["태그1", "태그2"],
    "emoji_suggestion": "🌞"
  }
}`;
}

function buildSnsMicroPrompt(_platforms: string[], userHint: string, language: string): string {
    const lang = LANG_NAME(language);
    return `당신은 X(Twitter) 카피라이터입니다. 280자 단문을 ${lang}로 작성하세요.
${userHint ? `주제: ${userHint}` : ''}

원칙:
- 280자 이내 (해시태그 포함). 절대 초과 금지.
- 첫 단어부터 임팩트. 미사여구·서론 금지.
- 해시태그는 본문 끝에 2-3개. 핵심 키워드만.

반드시 아래 JSON 형식으로만 반환:
{
  "twitter": {
    "text": "전체 트윗 본문 (해시태그 포함, 280자 이내)",
    "hashtags": ["태그1", "태그2"]
  }
}`;
}

function buildSnsBusinessPrompt(_platforms: string[], userHint: string, language: string): string {
    const lang = LANG_NAME(language);
    return `당신은 LinkedIn 비즈니스 카피라이터입니다. 전문적인 게시물을 ${lang}로 작성하세요.
${userHint ? `주제: ${userHint}` : ''}

원칙:
- 첫 문장은 인사이트 또는 도발적 질문으로 시작
- 짧은 단락 3-4개, 줄바꿈으로 호흡 조절
- 마지막에 명확한 CTA(행동 유도)
- 해시태그 5개 이내, 비즈니스 키워드 위주

반드시 아래 JSON 형식으로만 반환:
{
  "linkedin": {
    "text": "전체 본문",
    "hashtags": ["태그1"],
    "cta": "CTA 한 줄 (예: 댓글로 의견 남겨주세요)"
  }
}`;
}

function buildBlogPrompt(platforms: string[], userHint: string, language: string): string {
    const lang = LANG_NAME(language);
    const plat = platforms[0] || 'blog';
    const info = resolveSpec(plat);
    return `당신은 한국 블로그 마케팅 작가입니다. ${info.tone}으로 장문 블로그 포스트를 ${lang}로 작성하세요.
${userHint ? `주제: ${userHint}` : ''}

블로그 구조 (반드시 모든 필드 포함):
- title: 검색·클릭 유도형 제목 (60자 이내)
- intro: 독자의 공감과 호기심을 끄는 도입부 (2-3 문단)
- sections: 3~5개의 본문 섹션. 각 섹션은 heading(소제목)과 body(내용 3-5문단).
- conclusion: 핵심 정리 + 부드러운 CTA (1-2 문단)
- meta_description: 검색결과 노출용 요약 (150자 이내)
- hashtags: 검색·발견에 도움되는 키워드 태그 10-15개

작성 원칙:
- 친근한 1인칭/구어체 ("저는~", "여러분~")
- 본문에 적절한 이모지·구두점으로 가독성 확보
- 광고 같지 않은 자연스러운 정보 흐름
- 각 섹션 본문은 2-4 문단, 너무 짧지 않게

반드시 아래 JSON 형식으로만 반환:
{
  "${plat}": {
    "title": "...",
    "intro": "...",
    "sections": [
      {"heading": "...", "body": "..."},
      {"heading": "...", "body": "..."}
    ],
    "conclusion": "...",
    "meta_description": "...",
    "hashtags": ["태그1", "태그2"]
  }
}`;
}

function buildVideoPrompt(_platforms: string[], userHint: string, language: string): string {
    const lang = LANG_NAME(language);
    return `당신은 YouTube SEO 전문가입니다. 영상 메타데이터를 ${lang}로 작성하세요.
${userHint ? `영상 주제: ${userHint}` : ''}

원칙:
- title: 100자 이내, 핵심 키워드 앞쪽 배치, CTR 유도 (괄호·이모지 1개 정도 OK)
- description: 첫 2-3 문장이 핵심 (검색결과·미리보기 노출), 이후 상세 설명·CTA·관련 링크 자리, 마지막에 해시태그 묶음
- tags: 검색 키워드 (description의 hashtags와 별개, 영상 메타데이터용 단어 리스트)
- hashtags: description 끝에 들어갈 #태그 (최대 3-5개가 효과적)

반드시 아래 JSON 형식으로만 반환:
{
  "youtube": {
    "title": "...",
    "description": "...",
    "tags": ["키워드1", "키워드2"],
    "hashtags": ["태그1", "태그2"]
  }
}`;
}

const FORMAT_BUILDERS: Record<FormatName, (p: string[], h: string, l: string) => string> = {
    sns_caption:  buildSnsCaptionPrompt,
    sns_micro:    buildSnsMicroPrompt,
    sns_business: buildSnsBusinessPrompt,
    blog:         buildBlogPrompt,
    video:        buildVideoPrompt,
};

// ════════════════════════════════════════════════════════════
//  엔진별 호출 함수 (model 파라미터 받음 — engine_config 에서 결정)
// ════════════════════════════════════════════════════════════
interface GenArgs {
    prompt: string;
    imageB64?: string;
    mime?: string;
    model?: string;
    userId?: string | null;
}

async function geminiGenerate({ prompt, imageB64, mime = 'image/jpeg', model, userId }: GenArgs): Promise<string> {
    const apiKey = await getApiKey('gemini', userId);
    if (!apiKey) throw new Error('GEMINI_API_KEY 없음');
    const m = model || 'gemini-2.0-flash';
    const url = `${GEMINI_API_URL}/${m}:generateContent?key=${apiKey}`;
    const parts: any[] = [];
    if (imageB64) parts.push({ inline_data: { mime_type: mime, data: imageB64 } });
    parts.push({ text: prompt });
    const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
        }),
        signal: AbortSignal.timeout(90000),
    });
    if (!r.ok) throw new Error(`Gemini ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data = await r.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function groqGenerate({ prompt, model, userId }: GenArgs): Promise<string> {
    const apiKey = await getApiKey('groq', userId);
    if (!apiKey) throw new Error('GROQ_API_KEY 없음');
    const m = model || 'llama-3.3-70b-versatile';
    const r = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: m,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 8192,
        }),
        signal: AbortSignal.timeout(90000),
    });
    if (!r.ok) throw new Error(`Groq ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data = await r.json();
    return data?.choices?.[0]?.message?.content || '';
}

async function openaiGenerate({ prompt, imageB64, mime = 'image/jpeg', model, userId }: GenArgs): Promise<string> {
    const apiKey = await getApiKey('openai', userId);
    if (!apiKey) throw new Error('OPENAI_API_KEY 없음');
    const m = model || 'gpt-4o-mini';
    let messages: any;
    if (imageB64) {
        messages = [{
            role: 'user',
            content: [
                { type: 'image_url', image_url: { url: `data:${mime};base64,${imageB64}` } },
                { type: 'text', text: prompt },
            ],
        }];
    } else {
        messages = [{ role: 'user', content: prompt }];
    }
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: m, messages, max_tokens: 8192, temperature: 0.7 }),
        signal: AbortSignal.timeout(90000),
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data = await r.json();
    return data?.choices?.[0]?.message?.content || '';
}

async function claudeGenerate({ prompt, imageB64, mime = 'image/jpeg', model, userId }: GenArgs): Promise<string> {
    const apiKey = await getApiKey('claude', userId);
    if (!apiKey) throw new Error('CLAUDE_API_KEY 없음');
    const m = model || 'claude-haiku-4-5-20251001';
    const content: any[] = [];
    if (imageB64) {
        content.push({
            type: 'image',
            source: { type: 'base64', media_type: mime, data: imageB64 },
        });
    }
    content.push({ type: 'text', text: prompt });
    const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: m,
            max_tokens: 8192,
            messages: [{ role: 'user', content }],
        }),
        signal: AbortSignal.timeout(90000),
    });
    if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data = await r.json();
    return data?.content?.[0]?.text || '';
}

async function ollamaGenerate({ prompt, imageB64, model, userId }: GenArgs): Promise<string> {
    const m = model || (imageB64
        ? await getModel('ollama_vision', userId)
        : await getModel('ollama', userId));
    const payload: any = { model: m, prompt, stream: false };
    if (imageB64) payload.images = [imageB64];
    const r = await fetch(`${OLLAMA_HOST}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(180000),
    });
    if (!r.ok) throw new Error(`Ollama ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data = await r.json();
    return data?.response || '';
}

const ENGINE_FUNCS: Record<string, (a: GenArgs) => Promise<string>> = {
    gemini: geminiGenerate,
    groq:   groqGenerate,
    openai: openaiGenerate,
    claude: claudeGenerate,
    ollama: ollamaGenerate,
};

// ════════════════════════════════════════════════════════════
//  엔진 폴백 체인
// ════════════════════════════════════════════════════════════
async function generateWithFallback(
    prompt: string,
    imageB64: string | undefined,
    mime: string,
    task: TaskName,
    userId?: string | null,
): Promise<{ raw: string; engine: string | null }> {
    const priority = await getPriorityForTask(task, userId);
    const tried: string[] = [];
    for (const engineName of priority) {
        const fn = ENGINE_FUNCS[engineName];
        if (!fn) continue;
        // vision task인데 엔진이 vision 미지원이면 스킵 (groq는 vision X)
        if (imageB64 && engineName === 'groq') {
            tried.push(`${engineName}: vision 미지원 스킵`);
            continue;
        }
        const model = await getModel(engineName, userId);
        try {
            const raw = await fn({ prompt, imageB64, mime, model, userId });
            if (!raw) throw new Error('빈 응답');
            // 사용량 카운터 (fire-and-forget)
            void incrUsage({ scope: userId || 'global', kind: 'caption', engine: engineName });
            return { raw, engine: engineName };
        } catch (e: any) {
            tried.push(`${engineName}: ${e?.message || e}`);
            console.warn(`[AI:${task}] ${engineName} 실패, 다음 시도... (${e?.message || e})`);
        }
    }
    console.error(`[AI:${task}] 모든 엔진 실패: ${tried.join(' | ')}`);
    return { raw: '', engine: null };
}

// ════════════════════════════════════════════════════════════
//  JSON 파싱 / 평탄화
// ════════════════════════════════════════════════════════════
function parseJson(raw: string): any {
    if (!raw) return null;
    // ```json ... ``` 코드블록 제거
    const fence = raw.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    const candidate = fence ? fence[1] : (raw.match(/\{[\s\S]*\}/)?.[0]);
    if (!candidate) return null;
    try { return JSON.parse(candidate); } catch { return null; }
}

export interface CaptionResult {
    text: string;
    hashtags: string[];
    format: FormatName;
    title?: string;
    intro?: string;
    sections?: Array<{ heading: string; body: string }>;
    conclusion?: string;
    meta_description?: string;
    description?: string;
    tags?: string[];
    cta?: string;
    emoji_suggestion?: string;
}

function flattenForPublishers(platform: string, content: any): CaptionResult {
    const fmt = resolveSpec(platform).format;
    const out: any = { ...(content || {}) };
    out.hashtags = Array.isArray(out.hashtags) ? out.hashtags : [];
    out.format = fmt;

    if (fmt === 'blog') {
        const sectionsMd = (out.sections || [])
            .map((s: any) => `## ${s.heading || ''}\n\n${s.body || ''}`)
            .join('\n\n');
        const merged = [
            out.title ? `# ${out.title}` : '',
            out.intro || '',
            sectionsMd,
            out.conclusion || '',
        ].filter(Boolean).join('\n\n');
        out.text = merged || out.text || '';
    } else if (fmt === 'video') {
        out.text = out.description || out.text || '';
    } else if (fmt === 'sns_business') {
        if (out.cta) {
            out.text = `${out.text || ''}\n\n${out.cta}`.trim();
        }
    }
    out.text = out.text || '';
    return out as CaptionResult;
}

// ════════════════════════════════════════════════════════════
//  메인 함수 — 포맷별 분기 생성
// ════════════════════════════════════════════════════════════
export interface GenerateCaptionInput {
    /** 이미지/영상 파일 경로 (선택). 이미지는 base64 인코딩 후 vision 모델로 분석. */
    mediaPath?: string;
    /** 'image' | 'video' | undefined */
    mediaType?: 'image' | 'video';
    /** 대상 플랫폼 ID 배열 (PLATFORM_FORMATS 키). 예: ['instagram','twitter','naver_blog'] */
    platforms: string[];
    /** 사용자 힌트 — 주제·맥락 (없으면 빈 문자열) */
    userHint?: string;
    /** 출력 언어 (ko/en/ja/zh 등) */
    language?: string;
    /** 사용자 ID — engine_config 멀티 테넌트 격리. */
    userId?: string | null;
}

const MIME_BY_EXT: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp',
};

async function readImageAsBase64(path: string): Promise<{ b64: string; mime: string }> {
    const buf = await fs.readFile(path);
    const ext = extname(path).toLowerCase().replace(/^\./, '');
    return { b64: buf.toString('base64'), mime: MIME_BY_EXT[ext] || 'image/jpeg' };
}

/**
 * 플랫폼들을 포맷별로 그룹핑 후 각 포맷에 맞는 프롬프트로 생성.
 * 반환: { platformId: { text, hashtags, format, ...format별 추가 필드 } }
 */
export async function generateCaption(
    input: GenerateCaptionInput,
): Promise<Record<string, CaptionResult>> {
    const { mediaPath, mediaType, platforms, userHint = '', language = 'ko', userId } = input;

    // 이미지면 base64 인코딩
    let imageB64: string | undefined;
    let mime = 'image/jpeg';
    if (mediaType === 'image' && mediaPath) {
        try {
            const r = await readImageAsBase64(mediaPath);
            imageB64 = r.b64;
            mime = r.mime;
        } catch {
            // 파일 못 읽으면 텍스트만 생성으로 폴백
        }
    }

    // 플랫폼을 포맷별로 그룹핑
    const byFormat: Record<FormatName, string[]> = {} as any;
    for (const p of platforms) {
        const fmt = resolveSpec(p).format;
        (byFormat[fmt] ||= []).push(p);
    }

    const final: Record<string, CaptionResult> = {};
    for (const fmt of Object.keys(byFormat) as FormatName[]) {
        const plats = byFormat[fmt];
        const builder = FORMAT_BUILDERS[fmt] || buildSnsCaptionPrompt;
        const prompt = builder(plats, userHint, language);

        // 이미지 있으면 vision task 우선 (vision 모델로 분석 후 캡션 생성)
        let task: TaskName = FORMAT_TASK[fmt];
        if (imageB64 && (fmt === 'sns_caption' || fmt === 'sns_micro' || fmt === 'sns_business')) {
            task = 'vision';
        }

        const { raw } = await generateWithFallback(prompt, imageB64, mime, task, userId);
        const parsed = parseJson(raw);

        if (!parsed) {
            // 폴백: 모든 엔진 실패 시 안전한 기본 콘텐츠
            for (const p of plats) {
                final[p] = flattenForPublishers(p, {
                    text: `새 포스팅을 확인하세요! ${userHint}`.trim(),
                    hashtags: ['SNS', '포스팅'],
                });
            }
            continue;
        }

        // 응답 안에 plats별 키가 있으면 매핑, 없으면 첫 키를 모든 plats에 적용
        for (const p of plats) {
            const content = parsed[p] || parsed[plats[0]] || Object.values(parsed)[0] || {};
            const obj = (typeof content === 'object' && content !== null)
                ? content
                : { text: String(content) };
            final[p] = flattenForPublishers(p, obj);
        }
    }

    return final;
}

// ════════════════════════════════════════════════════════════
//  번역용 프롬프트 (translator.ts 에서 사용)
// ════════════════════════════════════════════════════════════
const TRANSLATE_LANG_NAMES: Record<string, string> = {
    ko: '한국어', en: '영어', ja: '일본어', zh: '중국어 간체',
    ar: '아랍어', es: '스페인어', pt: '포르투갈어', fr: '프랑스어',
    de: '독일어', ru: '러시아어', hi: '힌디어', id: '인도네시아어',
    th: '태국어', vi: '베트남어',
};

/**
 * AI로 문화적 번역 (Groq → Ollama → Claude 폴백). 직접 호출보다 translator.ts 의 `translateText` 권장.
 */
export async function generateTranslation(
    text: string,
    targetLanguage: string,
    platform: string,
    region: string,
    userId?: string | null,
): Promise<string> {
    const langName = TRANSLATE_LANG_NAMES[targetLanguage] || targetLanguage;
    const prompt = `다음 SNS 게시물을 ${langName}로 자연스럽게 번역하세요.
지역: ${region} / 플랫폼: ${platform}
규칙: 현지 문화에 맞게 자연스럽게, 이모지 유지, 번역문만 반환.
${targetLanguage === 'ar' ? '아랍어는 RTL 방향 고려.' : ''}

원문: ${text}

번역:`;

    for (const engineName of ['groq', 'ollama', 'claude']) {
        const fn = ENGINE_FUNCS[engineName];
        if (!fn) continue;
        try {
            const result = await fn({ prompt, userId });
            if (result?.trim()) {
                void incrUsage({ scope: userId || 'global', kind: 'translate', engine: `ai-${engineName}` });
                return result.trim();
            }
        } catch (e: any) {
            console.warn(`[번역AI] ${engineName} 실패: ${e?.message || e}`);
        }
    }
    return text;
}

// 외부에서 짧은 텍스트 생성 (해시태그 번역 등)에 재사용할 수 있도록 노출
export const _internal = { groqGenerate, ollamaGenerate, claudeGenerate, geminiGenerate };

/**
 * 단순 chat (코파일럿용) — system + user message → 한 번 호출.
 * 엔진 우선순위: groq → gemini → ollama → claude (모두 무료/저비용 우선).
 */
export async function chatRaw(input: {
    systemPrompt?: string;
    userMessage: string;
    userId?: string | null;
    maxChars?: number;
}): Promise<string> {
    const fullPrompt = input.systemPrompt
        ? `${input.systemPrompt}\n\n사용자 질문:\n${input.userMessage}\n\n답변:`
        : input.userMessage;

    const order: Array<keyof typeof _internal> = ['groqGenerate', 'geminiGenerate', 'ollamaGenerate', 'claudeGenerate'];
    let lastError: any;
    for (const fnName of order) {
        const fn = _internal[fnName];
        try {
            const result = await fn({ prompt: fullPrompt, userId: input.userId });
            if (result?.trim()) {
                const text = result.trim();
                return input.maxChars && text.length > input.maxChars
                    ? text.slice(0, input.maxChars) + '…'
                    : text;
            }
        } catch (e: any) {
            lastError = e;
            console.warn(`[chatRaw] ${fnName} 실패:`, e?.message);
        }
    }
    throw new Error(`AI 엔진 모두 실패. 마지막 오류: ${lastError?.message || '알 수 없음'}. /dashboard/settings/ai 에서 무료 키(Gemini·Groq) 등록 후 다시 시도해주세요.`);
}
