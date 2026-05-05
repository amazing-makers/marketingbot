'use server';

import { auth } from '@/auth';
import { _internal } from '@/lib/ai/caption';

export type CompareEngine = 'gemini' | 'groq' | 'claude' | 'openai' | 'ollama';

export interface CompareResult {
    engine: CompareEngine;
    success: boolean;
    text?: string;
    error?: string;
    latencyMs: number;
}

/**
 * Phase 38 — 같은 프롬프트로 여러 엔진을 병렬 호출 → 결과 비교.
 *
 * 사용자는 결과를 보고 가장 좋은 것을 선택해서 캠페인으로 가져갈 수 있음.
 * 호출 자체는 모두 사용자 본인 API 키 (또는 env fallback) 사용.
 */
export async function compareAiCaptions(input: {
    prompt: string;
    engines?: CompareEngine[];
    language?: string;
}): Promise<CompareResult[]> {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    if (!input.prompt?.trim()) throw new Error('프롬프트를 입력하세요');

    const userId = session.user.id;
    const engines: CompareEngine[] = input.engines || ['gemini', 'groq', 'claude'];

    // 각 엔진은 GenArgs 형식 — { prompt, userId, model? }
    const wrapped = `한국어로 SNS 캡션 1개만 생성해주세요 (해시태그 5개 포함, 200자 이내):\n\n${input.prompt}`;

    const tasks: Array<Promise<CompareResult>> = engines.map(async (engine) => {
        const start = Date.now();
        try {
            let text: string;
            switch (engine) {
                case 'gemini':
                    text = await _internal.geminiGenerate({ prompt: wrapped, userId });
                    break;
                case 'groq':
                    text = await _internal.groqGenerate({ prompt: wrapped, userId });
                    break;
                case 'claude':
                    text = await _internal.claudeGenerate({ prompt: wrapped, userId });
                    break;
                case 'ollama':
                    text = await _internal.ollamaGenerate({ prompt: wrapped, userId });
                    break;
                default:
                    return {
                        engine,
                        success: false,
                        error: `${engine} 엔진은 비교 도구 미지원`,
                        latencyMs: Date.now() - start,
                    };
            }
            return {
                engine,
                success: true,
                text: text.trim(),
                latencyMs: Date.now() - start,
            };
        } catch (e: any) {
            return {
                engine,
                success: false,
                error: e?.message || String(e),
                latencyMs: Date.now() - start,
            };
        }
    });

    return Promise.all(tasks);
}
