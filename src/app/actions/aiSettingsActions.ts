'use server';

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import {
    getConfig,
    saveConfig,
    type EngineConfig,
    type EngineName,
    type TaskName,
} from '@/lib/ai/engine-config';

/**
 * 현재 로그인 사용자의 AI 엔진 설정 로드.
 * 평문 API 키는 길이만 반환하고 값은 마스킹 (UI에서 "변경 안 함" 패턴 처리).
 */
export async function getMyAiConfig(): Promise<{
    success: boolean;
    config?: Omit<EngineConfig, 'aiKeys'> & { aiKeys: Record<string, { hasKey: boolean; lastFour: string }> };
    error?: string;
}> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        const cfg = await getConfig(session.user.id);
        // 보안: 키 자체는 클라이언트에 안 보냄. 등록 여부 + 마지막 4자만.
        const masked: Record<string, { hasKey: boolean; lastFour: string }> = {};
        for (const [engine, key] of Object.entries(cfg.aiKeys)) {
            const k = (key as string) || '';
            masked[engine] = {
                hasKey: !!k,
                lastFour: k ? k.slice(-4) : '',
            };
        }
        const { aiKeys: _, ...rest } = cfg;
        return { success: true, config: { ...rest, aiKeys: masked } as any };
    } catch (e: any) {
        console.error('[getMyAiConfig]', e);
        return { success: false, error: e?.message || '설정 로드 실패' };
    }
}

export interface SaveAiConfigInput {
    aiPriority?: EngineName[];
    aiModels?: Partial<Record<string, string>>;
    /** key=undefined: 기존 값 유지, key='': 삭제, 그 외: 새 값으로 교체 */
    aiKeysPatch?: Record<string, string | undefined>;
    taskPriorities?: Partial<Record<TaskName, string[]>>;
    translationPriority?: ('deepl' | 'libretranslate' | 'ai')[];
    deeplPro?: boolean;
    utm?: { source?: string; medium?: string; campaign?: string; term?: string; content?: string };
    monthlyBudgetUsd?: number;
}

export async function saveMyAiConfig(input: SaveAiConfigInput): Promise<{ success: boolean; error?: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        // 기존 키 보존 + patch 적용
        const current = await getConfig(session.user.id);
        const nextKeys = { ...current.aiKeys };
        if (input.aiKeysPatch) {
            for (const [engine, val] of Object.entries(input.aiKeysPatch)) {
                if (val === undefined) continue;            // 미변경
                if (val === '') delete nextKeys[engine as keyof typeof nextKeys];  // 삭제
                else (nextKeys as any)[engine] = val;       // 새 값
            }
        }

        const next: Partial<EngineConfig> = {
            aiPriority: input.aiPriority ?? current.aiPriority,
            aiModels: { ...current.aiModels, ...(input.aiModels || {}) },
            aiKeys: nextKeys,
            taskPriorities: { ...current.taskPriorities, ...(input.taskPriorities || {}) },
            translationPriority: input.translationPriority ?? current.translationPriority,
            deeplPro: input.deeplPro ?? current.deeplPro,
            utm: input.utm ?? current.utm,
            monthlyBudgetUsd: input.monthlyBudgetUsd ?? current.monthlyBudgetUsd,
        };

        await saveConfig(session.user.id, next);
        revalidatePath('/dashboard/settings/ai');
        return { success: true };
    } catch (e: any) {
        console.error('[saveMyAiConfig]', e);
        return { success: false, error: e?.message || '저장 실패' };
    }
}

/**
 * 등록된 엔진 키 검증 — 짧은 프롬프트로 ping.
 * 실제 사용 전에 사용자가 "테스트" 버튼 누르면 빠르게 OK/NG 표시.
 */
export async function testEngine(engine: EngineName): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

    try {
        const { _internal } = await import('@/lib/ai/caption');
        const start = Date.now();
        const fns: Record<string, (a: any) => Promise<string>> = {
            groq:   _internal.groqGenerate,
            ollama: _internal.ollamaGenerate,
            claude: _internal.claudeGenerate,
        };

        // gemini/openai 는 별도 핑 — caption._internal 에 노출 안 됨. 임시로 caption 1회 생성으로 대체.
        if (engine === 'gemini' || engine === 'openai') {
            const { generateCaption } = await import('@/lib/ai/caption');
            const result = await generateCaption({
                platforms: ['twitter'],
                userHint: 'ping',
                language: 'en',
                userId: session.user.id,
            });
            const ok = !!result?.twitter?.text;
            return { success: ok, latencyMs: Date.now() - start, error: ok ? undefined : '응답 없음' };
        }

        const fn = fns[engine];
        if (!fn) return { success: false, error: '미지원 엔진' };
        const out = await fn({ prompt: 'Reply with the single word: pong', userId: session.user.id });
        const ok = !!out?.trim();
        return { success: ok, latencyMs: Date.now() - start, error: ok ? undefined : '응답 없음' };
    } catch (e: any) {
        return { success: false, error: e?.message || '테스트 실패' };
    }
}
