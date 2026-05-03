/**
 * AI 엔진 설정 — sns-auto-platform `engine_config.py` 의 TS 포팅.
 * Redis → Prisma `UserAiConfig`. 사용자 멀티 테넌트 격리.
 *
 * 사용자가 settings 페이지에서 변경하면 다음 호출부터 즉시 반영 (재시작 불필요).
 * 없으면 무료 위주 기본값 사용.
 */
import { prisma } from '@/lib/prisma';
import { encryptJSON, decryptJSON } from '@/lib/crypto/aes';

export type EngineName = 'gemini' | 'groq' | 'openai' | 'claude' | 'ollama';
export type ImageEngine = 'pollinations' | 'openai' | 'gemini';
export type TranslationEngine = 'deepl' | 'libretranslate' | 'ai';

export type TaskName =
    | 'vision'        // 이미지 분석
    | 'blog_long'     // 장문 블로그
    | 'sns_short'     // SNS 캡션
    | 'micro_280'     // 트윗
    | 'business_cta'  // LinkedIn 등 비즈니스 톤
    | 'video_meta'    // YouTube 메타
    | 'image_gen'     // 이미지 생성
    | 'video_gen';    // 영상 생성

export interface EngineConfig {
    aiPriority: EngineName[];
    aiModels: Partial<Record<EngineName | 'ollama_vision', string>>;
    aiKeys: Partial<Record<EngineName | 'deepl', string>>;
    taskPriorities: Partial<Record<TaskName, string[]>>;
    translationPriority: TranslationEngine[];
    deeplPro: boolean;
    utm: { source?: string; medium?: string; campaign?: string; term?: string; content?: string };
    monthlyBudgetUsd: number;
}

// ── 기본값 (sns-auto-platform 과 1:1 매칭) ──
export const DEFAULT_AI_PRIORITY: EngineName[] = ['gemini', 'groq', 'ollama', 'claude'];
export const DEFAULT_TRANSLATION_PRIORITY: TranslationEngine[] = ['deepl', 'libretranslate', 'ai'];

export const DEFAULT_TASK_PRIORITIES: Record<TaskName, string[]> = {
    vision:        ['gemini', 'openai', 'claude', 'ollama'],
    blog_long:     ['claude', 'openai', 'gemini', 'groq'],
    sns_short:     ['groq', 'gemini', 'openai', 'ollama', 'claude'],
    micro_280:     ['groq', 'gemini', 'openai'],
    business_cta:  ['claude', 'openai', 'gemini', 'groq'],
    video_meta:    ['openai', 'gemini', 'claude', 'groq'],
    image_gen:     ['pollinations', 'openai', 'gemini'],
    video_gen:     ['ffmpeg_ken_burns'],
};

export const DEFAULT_MODELS: Record<string, string> = {
    gemini:        'gemini-2.0-flash',
    groq:          'llama-3.3-70b-versatile',
    openai:        'gpt-4o-mini',
    claude:        'claude-haiku-4-5-20251001',
    ollama:        process.env.OLLAMA_MODEL || 'llama3.2:3b',
    ollama_vision: process.env.OLLAMA_VISION_MODEL || 'llava:7b',
};

// UI dropdown 용 — 각 엔진별 사용 가능한 모델
export const AVAILABLE_MODELS = {
    gemini: [
        { id: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash',          tier: 'free', vision: true },
        { id: 'gemini-2.5-flash',      label: 'Gemini 2.5 Flash',          tier: 'paid', vision: true },
        { id: 'gemini-2.5-pro',        label: 'Gemini 2.5 Pro (최고 품질)', tier: 'paid', vision: true },
        { id: 'gemini-1.5-pro',        label: 'Gemini 1.5 Pro',            tier: 'paid', vision: true },
    ],
    groq: [
        { id: 'llama-3.3-70b-versatile',  label: 'Llama 3.3 70B',           tier: 'free' },
        { id: 'llama-3.1-405b-reasoning', label: 'Llama 3.1 405B (추론)',   tier: 'free' },
        { id: 'mixtral-8x7b-32768',       label: 'Mixtral 8x7B',            tier: 'free' },
    ],
    openai: [
        { id: 'gpt-4o-mini', label: 'GPT-4o mini (저렴)',  tier: 'paid', vision: true },
        { id: 'gpt-4o',      label: 'GPT-4o (최고 품질)',  tier: 'paid', vision: true },
        { id: 'o1-mini',     label: 'o1-mini (추론)',      tier: 'paid' },
        { id: 'o1',          label: 'o1 (최고 추론)',       tier: 'paid' },
    ],
    claude: [
        { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (빠름·저렴)', tier: 'paid', vision: true },
        { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6 (균형)',    tier: 'paid', vision: true },
        { id: 'claude-opus-4-7',           label: 'Claude Opus 4.7 (최고 품질)', tier: 'paid', vision: true },
    ],
    ollama: [
        { id: 'llama3.2:3b',  label: 'Llama 3.2 3B (빠름·2GB RAM)',   tier: 'local' },
        { id: 'llama3.3:70b', label: 'Llama 3.3 70B (느림·고품질)',    tier: 'local' },
        { id: 'qwen2.5:14b',  label: 'Qwen 2.5 14B',                  tier: 'local' },
        { id: 'mistral:7b',   label: 'Mistral 7B',                    tier: 'local' },
        { id: 'llava:7b',     label: 'LLaVA 7B (vision·5GB RAM)',     tier: 'local', vision: true },
    ],
} as const;

export const ENGINE_LABELS: Record<EngineName, string> = {
    gemini: 'Google Gemini',
    groq:   'Groq',
    openai: 'OpenAI (GPT)',
    claude: 'Anthropic Claude',
    ollama: 'Ollama (로컬)',
};

// 엔진 발급/연동 안내 — UI 에서 안내 링크로 노출
export const ENGINE_GUIDES: Record<EngineName | 'deepl' | 'pollinations', { url: string; note: string }> = {
    gemini:       { url: 'https://aistudio.google.com/app/apikey',  note: '무료 1,500/일, 이미지 분석 지원. 키 발급 후 즉시 사용.' },
    groq:         { url: 'https://console.groq.com/keys',           note: '무료 14,400/일, 매우 빠름. 텍스트 전용 (vision 미지원).' },
    deepl:        { url: 'https://www.deepl.com/pro-api',           note: '번역 50만자/월 무료. 키 끝이 `:fx`면 무료, 아니면 Pro.' },
    pollinations: { url: 'https://image.pollinations.ai',            note: '이미지 생성, 키 불필요·완전 무료. 첫 시도 추천.' },
    openai:       { url: 'https://platform.openai.com/api-keys',    note: '유료. GPT-4o + DALL-E 3 ($0.04/장).' },
    claude:       { url: 'https://console.anthropic.com',           note: '유료. Claude Opus/Sonnet/Haiku, 한국어 품질 최상.' },
    ollama:       { url: 'https://ollama.com/download',              note: '로컬 무료 무제한. PC에 설치 + `ollama pull llama3.2:3b`.' },
};

// 유료 엔진 (예산 초과 시 자동 제외)
const PAID_ENGINES = new Set(['openai', 'claude']);

// ════════════════════════════════════════════════════════════
//  config 로드/저장
// ════════════════════════════════════════════════════════════

function defaultConfig(): EngineConfig {
    return {
        aiPriority: [...DEFAULT_AI_PRIORITY],
        aiModels: { ...DEFAULT_MODELS },
        aiKeys: {},
        taskPriorities: { ...DEFAULT_TASK_PRIORITIES },
        translationPriority: [...DEFAULT_TRANSLATION_PRIORITY],
        deeplPro: false,
        utm: {},
        monthlyBudgetUsd: 0,
    };
}

function mergeDefaults(stored: Partial<EngineConfig>): EngineConfig {
    const base = defaultConfig();
    return {
        aiPriority: stored.aiPriority?.length ? stored.aiPriority : base.aiPriority,
        aiModels: { ...base.aiModels, ...(stored.aiModels || {}) },
        aiKeys: stored.aiKeys || {},
        taskPriorities: { ...base.taskPriorities, ...(stored.taskPriorities || {}) },
        translationPriority: stored.translationPriority?.length
            ? stored.translationPriority
            : base.translationPriority,
        deeplPro: !!stored.deeplPro,
        utm: stored.utm || {},
        monthlyBudgetUsd: Number(stored.monthlyBudgetUsd) || 0,
    };
}

/**
 * 사용자별 엔진 설정 로드. userId 없으면 환경변수 기반 기본 config.
 * aiKeysEncrypted 는 자동 복호화.
 */
export async function getConfig(userId?: string | null): Promise<EngineConfig> {
    if (!userId) return defaultConfig();
    const row = await prisma.userAiConfig.findUnique({ where: { userId } });
    if (!row) return defaultConfig();

    let aiKeys: EngineConfig['aiKeys'] = {};
    if (row.aiKeysEncrypted) {
        try { aiKeys = decryptJSON(row.aiKeysEncrypted); } catch { /* 손상된 데이터 무시 */ }
    }
    return mergeDefaults({
        aiPriority: row.aiPriority as EngineName[],
        aiModels: row.aiModels as EngineConfig['aiModels'],
        aiKeys,
        taskPriorities: row.taskPriorities as EngineConfig['taskPriorities'],
        translationPriority: row.translationPriority as TranslationEngine[],
        deeplPro: row.deeplPro,
        utm: row.utm as EngineConfig['utm'],
        monthlyBudgetUsd: row.monthlyBudgetUsd,
    });
}

/**
 * 사용자 설정 저장 (upsert). aiKeys 는 자동 암호화.
 * aiPriority 에 알 수 없는 엔진이 있으면 제거.
 */
export async function saveConfig(userId: string, cfg: Partial<EngineConfig>): Promise<void> {
    const merged = mergeDefaults(cfg);
    merged.aiPriority = merged.aiPriority.filter(e => e in ENGINE_LABELS);
    if (!merged.aiPriority.length) merged.aiPriority = [...DEFAULT_AI_PRIORITY];

    const aiKeysEncrypted = Object.keys(merged.aiKeys).length
        ? encryptJSON(merged.aiKeys)
        : null;

    await prisma.userAiConfig.upsert({
        where: { userId },
        create: {
            userId,
            aiPriority: merged.aiPriority,
            aiModels: merged.aiModels,
            aiKeysEncrypted,
            taskPriorities: merged.taskPriorities,
            translationPriority: merged.translationPriority,
            deeplPro: merged.deeplPro,
            utm: merged.utm,
            monthlyBudgetUsd: merged.monthlyBudgetUsd,
        },
        update: {
            aiPriority: merged.aiPriority,
            aiModels: merged.aiModels,
            aiKeysEncrypted,
            taskPriorities: merged.taskPriorities,
            translationPriority: merged.translationPriority,
            deeplPro: merged.deeplPro,
            utm: merged.utm,
            monthlyBudgetUsd: merged.monthlyBudgetUsd,
        },
    });
}

// ════════════════════════════════════════════════════════════
//  키 / 모델 / 우선순위 헬퍼
// ════════════════════════════════════════════════════════════

/**
 * 엔진의 API 키 — 우선순위: user config → 환경변수.
 * env 폴백은 멀티 테넌트 격리를 깨므로 운영에선 사용자 키만 쓰도록 권장.
 */
export async function getApiKey(engine: EngineName | 'deepl', userId?: string | null): Promise<string> {
    const cfg = await getConfig(userId);
    const fromCfg = cfg.aiKeys?.[engine];
    if (fromCfg) return fromCfg;
    const envMap: Record<string, string> = {
        gemini: 'GEMINI_API_KEY',
        groq:   'GROQ_API_KEY',
        openai: 'OPENAI_API_KEY',
        claude: 'CLAUDE_API_KEY',
        deepl:  'DEEPL_API_KEY',
    };
    const envKey = envMap[engine];
    return envKey ? (process.env[envKey] || '') : '';
}

export async function getModel(engine: string, userId?: string | null): Promise<string> {
    const cfg = await getConfig(userId);
    return (cfg.aiModels as any)[engine] || DEFAULT_MODELS[engine] || '';
}

/**
 * 작업별 엔진 우선순위 — 사용자 설정 → task별 기본값 → 전체 ai_priority 순.
 *
 * 예: getPriorityForTask('blog_long') → ['claude','openai','gemini','groq']
 * 키 미등록 엔진은 폴백 체인이 자동으로 다음으로 넘어감.
 */
export async function getPriorityForTask(task: TaskName, userId?: string | null): Promise<string[]> {
    const cfg = await getConfig(userId);
    const taskPrio = cfg.taskPriorities?.[task];
    if (taskPrio?.length) {
        const seen = new Set(taskPrio);
        // task 우선순위 + 그 다음 ai_priority의 나머지 엔진들로 확장
        return [...taskPrio, ...cfg.aiPriority.filter(e => !seen.has(e))];
    }
    return [...cfg.aiPriority];
}

// ════════════════════════════════════════════════════════════
//  사용량 / 예산
// ════════════════════════════════════════════════════════════

function currentMonthKey(): string {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * 사용량 카운터 +1. 비동기 fire-and-forget OK (실패해도 본 흐름 영향 없음).
 */
export async function incrUsage(opts: {
    scope: string;             // 'global' or userId
    kind: 'image_gen' | 'video_gen' | 'translate' | 'caption';
    engine: string;
    n?: number;
}): Promise<void> {
    const monthKey = currentMonthKey();
    const n = opts.n ?? 1;
    try {
        await prisma.aiUsageCounter.upsert({
            where: {
                scope_kind_engine_monthKey: {
                    scope: opts.scope,
                    kind: opts.kind,
                    engine: opts.engine,
                    monthKey,
                },
            },
            create: { scope: opts.scope, kind: opts.kind, engine: opts.engine, monthKey, count: n },
            update: { count: { increment: n } },
        });
    } catch {
        // 카운터 실패는 본 흐름 절대 막지 않음
    }
}

/**
 * 월간 예산 한도 초과 여부. 0 또는 미설정이면 항상 false.
 * 추정 비용: DALL-E $0.04/장, Gemini Imagen $0.02/장, Replicate $0.02/sec.
 * caption/translate AI는 무료 tier가 충분히 커서 추정에서 제외 (필요 시 추가).
 */
export async function isOverBudget(userId?: string | null): Promise<boolean> {
    const cfg = await getConfig(userId);
    const cap = cfg.monthlyBudgetUsd;
    if (!cap || cap <= 0) return false;

    const monthKey = currentMonthKey();
    const scope = userId || 'global';
    const counters = await prisma.aiUsageCounter.findMany({
        where: { scope, monthKey },
    });
    let cost = 0;
    for (const c of counters) {
        if (c.kind === 'image_gen' && c.engine === 'openai') cost += c.count * 0.04;
        else if (c.kind === 'image_gen' && c.engine === 'gemini') cost += c.count * 0.02;
        else if (c.kind === 'video_gen' && c.engine === 'replicate') cost += c.count * 0.02;
    }
    return cost >= cap;
}

/**
 * 폴백 체인에서 유료 엔진 제거. 예산 초과 시 호출.
 */
export function dropPaidEngines(priority: string[]): string[] {
    return priority.filter(e => !PAID_ENGINES.has(e));
}
