/**
 * 번역 서비스 — sns-auto-platform `translator.py` 의 TS 포팅.
 *
 * 우선순위:
 *   1. LibreTranslate  (완전 무료, 셀프호스팅, 12개 언어) — 환경변수 LIBRETRANSLATE_URL 있을 때만
 *   2. DeepL Free      (월 50만자 무료, 품질 최상) — 키 끝 `:fx`면 무료, 아니면 Pro
 *   3. AI 번역         (Groq → Ollama → Claude, 문화적 뉘앙스)
 *
 * 캐시: TranslationCache 테이블 (sns-auto-platform Redis 'translate:cache:*' 포팅).
 * 30일 TTL, hash = md5(`${src}|${tgt}|${text}`).
 */
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getApiKey, getConfig, incrUsage } from './engine-config';
import { generateTranslation, _internal } from './caption';

const LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL || '';

// ── 지역 → 주요 언어 ──
export const REGION_LANGUAGES: Record<string, string[]> = {
    korea:          ['ko'],
    usa:            ['en'],
    japan:          ['ja'],
    china:          ['zh'],
    europe:         ['en', 'de', 'fr', 'es'],
    latam:          ['es', 'pt'],
    middle_east:    ['ar'],
    africa:         ['en', 'fr'],
    india:          ['hi', 'en'],
    southeast_asia: ['id', 'th', 'vi', 'en'],
    russia:         ['ru'],
    oceania:        ['en'],
};

export const LANGUAGE_NAMES: Record<string, string> = {
    ko: '한국어', en: '영어', ja: '일본어', zh: '중국어',
    ar: '아랍어', es: '스페인어', pt: '포르투갈어', fr: '프랑스어',
    de: '독일어', ru: '러시아어', hi: '힌디어', id: '인도네시아어',
    th: '태국어', vi: '베트남어',
};

// LibreTranslate 가 지원하는 언어 코드
const LIBRETRANSLATE_SUPPORTED = new Set(['ko', 'en', 'ja', 'zh', 'ar', 'es', 'pt', 'fr', 'de', 'ru', 'id', 'vi']);

// DeepL 언어 코드 매핑 (미지원: ar, hi, th, vi → AI 번역으로 자동 폴백)
const DEEPL_LANG_MAP: Record<string, string> = {
    ko: 'KO', en: 'EN', ja: 'JA', zh: 'ZH',
    de: 'DE', fr: 'FR', es: 'ES', pt: 'PT-BR',
    id: 'ID', ru: 'RU',
};

const CACHE_TTL_DAYS = 30;

// ════════════════════════════════════════════════════════════
//  엔진별 호출 함수
// ════════════════════════════════════════════════════════════
async function libretranslate(text: string, source: string, target: string): Promise<string> {
    if (!LIBRETRANSLATE_URL) throw new Error('LIBRETRANSLATE_URL 미설정');
    if (!LIBRETRANSLATE_SUPPORTED.has(target)) throw new Error(`LibreTranslate 미지원 언어: ${target}`);
    const r = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source, target, format: 'text' }),
        signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) throw new Error(`LibreTranslate ${r.status}`);
    const data = await r.json();
    return data?.translatedText || '';
}

async function deepl(
    text: string, source: string, target: string, userId?: string | null,
): Promise<string> {
    const deeplTarget = DEEPL_LANG_MAP[target];
    if (!deeplTarget) throw new Error(`DeepL 미지원 언어: ${target}`);
    const key = await getApiKey('deepl', userId);
    if (!key) throw new Error('DEEPL_API_KEY 없음');
    // ':fx'로 끝나면 Free, 아니면 Pro
    const isPro = !key.endsWith(':fx');
    const url = isPro ? 'https://api.deepl.com/v2/translate' : 'https://api-free.deepl.com/v2/translate';
    const body = new URLSearchParams({
        text,
        source_lang: DEEPL_LANG_MAP[source] || 'KO',
        target_lang: deeplTarget,
    });
    const r = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `DeepL-Auth-Key ${key}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
        signal: AbortSignal.timeout(30000),
    });
    if (!r.ok) throw new Error(`DeepL ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const data = await r.json();
    return data?.translations?.[0]?.text || '';
}

// ════════════════════════════════════════════════════════════
//  캐시
// ════════════════════════════════════════════════════════════
function makeHash(source: string, target: string, text: string): string {
    return createHash('md5').update(`${source}|${target}|${text}`).digest('hex');
}

async function readCache(hash: string): Promise<string | null> {
    try {
        const row = await prisma.translationCache.findUnique({ where: { hash } });
        if (!row) return null;
        if (row.expiresAt < new Date()) return null;
        return row.translated;
    } catch {
        return null;
    }
}

async function writeCache(opts: {
    hash: string; source: string; target: string; translated: string; engine: string;
}): Promise<void> {
    const expiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 3600 * 1000);
    try {
        await prisma.translationCache.upsert({
            where: { hash: opts.hash },
            create: {
                hash: opts.hash,
                sourceLang: opts.source,
                targetLang: opts.target,
                translated: opts.translated,
                engine: opts.engine,
                expiresAt,
            },
            update: { translated: opts.translated, engine: opts.engine, expiresAt },
        });
    } catch {
        // 캐시 쓰기 실패는 본 흐름 영향 없음
    }
}

// ════════════════════════════════════════════════════════════
//  메인 번역 함수
// ════════════════════════════════════════════════════════════
export async function translateText(opts: {
    text: string;
    targetLang: string;
    sourceLang?: string;
    platform?: string;
    region?: string;
    userId?: string | null;
}): Promise<string> {
    const {
        text, targetLang, sourceLang = 'ko', platform = 'instagram', region = '', userId,
    } = opts;

    if (sourceLang === targetLang) return text;
    if (!text?.trim()) return text;

    const hash = makeHash(sourceLang, targetLang, text);
    const cached = await readCache(hash);
    if (cached) return cached;

    // 사용자 설정의 translation_priority 순서로 시도.
    // DeepL 미지원 언어(ar/hi/th/vi 등)는 자동으로 LibreTranslate 또는 AI 로 폴백.
    const cfg = await getConfig(userId);
    const priority = cfg.translationPriority?.length
        ? cfg.translationPriority
        : ['deepl', 'libretranslate', 'ai'];

    const engines: Record<string, () => Promise<string>> = {
        deepl:          () => deepl(text, sourceLang, targetLang, userId),
        libretranslate: () => libretranslate(text, sourceLang, targetLang),
        ai:             () => generateTranslation(text, targetLang, platform, region, userId),
    };

    for (const engineName of priority) {
        const fn = engines[engineName];
        if (!fn) continue;
        try {
            const result = await fn();
            if (!result) continue;
            console.log(`[번역] ${engineName} 사용: ${sourceLang}→${targetLang}`);
            await writeCache({ hash, source: sourceLang, target: targetLang, translated: result, engine: engineName });
            void incrUsage({ scope: userId || 'global', kind: 'translate', engine: engineName });
            return result;
        } catch (e: any) {
            console.warn(`[번역] ${engineName} 실패: ${e?.message || e}`);
        }
    }
    return text; // 모두 실패 시 원문 반환
}

// ════════════════════════════════════════════════════════════
//  해시태그 번역 (LLM 호출, 형식 강제 프롬프트)
// ════════════════════════════════════════════════════════════
export async function translateHashtags(
    hashtags: string[],
    targetLang: string,
    platform: string,
    userId?: string | null,
): Promise<string[]> {
    if (!hashtags?.length) return [];
    const langName = LANGUAGE_NAMES[targetLang] || targetLang;
    const prompt = `Translate these hashtags into ${langName} for ${platform}.
Input: ${hashtags.join(', ')}

Output rules (must follow strictly):
- Reply with ONLY the translated hashtags, separated by commas
- No explanation, no numbering, no quotes, no colons, no newlines
- No '#' symbols
- Each tag must be short (under 25 characters)
- Output exactly ${hashtags.length} tags

Translated hashtags:`;

    let raw = '';
    for (const fn of [
        () => _internal.groqGenerate({ prompt, userId }),
        () => _internal.ollamaGenerate({ prompt, userId }),
    ]) {
        try { raw = await fn(); if (raw) break; } catch { /* 다음 엔진 */ }
    }
    if (!raw) return hashtags;

    // LLM 이 verbose 응답을 줘도 깨끗한 태그만 추출
    const candidates = raw.split(',').map(t => t.trim().replace(/^#/, '').replace(/^["']|["']$/g, ''));
    const cleaned: string[] = [];
    for (const c of candidates) {
        if (!c || c.includes('\n') || c.includes(':') || c.length > 30) continue;
        cleaned.push(c);
        if (cleaned.length >= 20) break;
    }
    // 결과가 너무 적으면 (절반 미만) 형식 불량으로 간주, 원본 반환
    if (cleaned.length < Math.max(1, Math.floor(hashtags.length / 2))) {
        console.warn(`[해시태그번역] 응답 형식 불량으로 원본 사용 (${targetLang}): ${raw.slice(0, 120)}`);
        return hashtags;
    }
    return cleaned;
}

// ════════════════════════════════════════════════════════════
//  지역별 일괄 번역 (UI에서 가장 자주 호출)
// ════════════════════════════════════════════════════════════
export async function translateForRegions(opts: {
    text: string;
    hashtags: string[];
    sourceLang: string;
    targetRegions: string[];
    platform: string;
    enabledLanguages?: string[];
    userId?: string | null;
}): Promise<Record<string, { text: string; hashtags: string[]; languageName: string }>> {
    const { text, hashtags, sourceLang, targetRegions, platform, enabledLanguages, userId } = opts;
    const langsNeeded = new Set<string>();
    for (const region of targetRegions) {
        for (const lang of (REGION_LANGUAGES[region] || ['en'])) {
            if (enabledLanguages == null || enabledLanguages.includes(lang)) {
                langsNeeded.add(lang);
            }
        }
    }

    const out: Record<string, { text: string; hashtags: string[]; languageName: string }> = {};
    for (const lang of langsNeeded) {
        if (lang === sourceLang) {
            out[lang] = { text, hashtags, languageName: LANGUAGE_NAMES[lang] || lang };
            continue;
        }
        const translatedText = await translateText({
            text, targetLang: lang, sourceLang, platform, userId,
        });
        let translatedHashtags = [...hashtags];
        // 비라틴 문자권 (한·일·중·아·힌·태·베·러·인) 은 해시태그도 번역
        if (['ja', 'zh', 'ar', 'hi', 'th', 'vi', 'ru', 'ko', 'id'].includes(lang)) {
            translatedHashtags = await translateHashtags(hashtags, lang, platform, userId);
        }
        out[lang] = {
            text: translatedText,
            hashtags: translatedHashtags,
            languageName: LANGUAGE_NAMES[lang] || lang,
        };
    }
    return out;
}
