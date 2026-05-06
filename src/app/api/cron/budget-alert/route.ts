import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';
import { createNotificationDedup } from '@/lib/notifications/create';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * Phase 45 — AI 사용 비용 예산 알림.
 *
 * 매일 1회 실행 (vercel.json).
 *
 * 로직:
 *   1. monthlyBudgetUsd 가 0 보다 큰 사용자 후보
 *   2. 이번 달 누적 비용 (AiUsageCounter) 계산
 *   3. 50% / 80% / 100% threshold 도달 시 인앱 알림 (24h dedup)
 *   4. 100% 초과 시 BUDGET_EXCEEDED 알림 (지속)
 *
 * 비용 추정: image_gen 만 추정 (caption/translate 무료 가정).
 *   - openai: $0.04/장
 *   - gemini imagen: $0.02/장
 */

const PRICE_PER_IMAGE: Record<string, number> = {
    openai: 0.04,
    gemini: 0.02,
};

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (env.NODE_ENV === 'production' && authHeader !== `Bearer ${env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = dayjs();
    const monthKey = now.format('YYYY-MM');

    // 예산 설정한 사용자
    const configs = await prisma.userAiConfig.findMany({
        where: { monthlyBudgetUsd: { gt: 0 } },
        select: { userId: true, monthlyBudgetUsd: true },
    });

    let alerted = 0;
    let skipped = 0;

    for (const cfg of configs) {
        // 이번 달 image_gen 카운터 합산 → 비용 추정
        const counters = await prisma.aiUsageCounter.findMany({
            where: { scope: cfg.userId, monthKey, kind: 'image_gen' },
            select: { engine: true, count: true },
        });
        const totalCost = counters.reduce((sum, c) => {
            const price = PRICE_PER_IMAGE[c.engine] || 0;
            return sum + price * c.count;
        }, 0);

        const budget = cfg.monthlyBudgetUsd;
        const pctUsed = budget > 0 ? (totalCost / budget) * 100 : 0;

        if (pctUsed < 50) { skipped++; continue; }

        // threshold 별 메시지 + dedup 키 (다른 dedup kind 로 함수 자동 처리 안 됨 — 메시지 본문에 마커)
        let title = '';
        let body = '';
        let severity: 'info' | 'warning' | 'critical' = 'info';

        if (pctUsed >= 100) {
            title = `🚨 AI 예산 초과 — ${pctUsed.toFixed(0)}%`;
            body = `이번 달 AI 비용 예산 ($${budget.toFixed(2)}) 의 ${pctUsed.toFixed(0)}% 사용 중. 추정 비용 $${totalCost.toFixed(2)}. 예산 조정 또는 자동 발행 일시정지 권장.`;
            severity = 'critical';
        } else if (pctUsed >= 80) {
            title = `⚠️ AI 예산 80% 도달`;
            body = `이번 달 AI 비용 예산 ($${budget.toFixed(2)}) 의 ${pctUsed.toFixed(0)}% 사용. 추정 비용 $${totalCost.toFixed(2)}. 잔여 예산 $${(budget - totalCost).toFixed(2)}.`;
            severity = 'warning';
        } else {
            title = `📊 AI 예산 50% 도달`;
            body = `이번 달 AI 비용 예산 ($${budget.toFixed(2)}) 의 ${pctUsed.toFixed(0)}% 사용. 추정 비용 $${totalCost.toFixed(2)}.`;
            severity = 'info';
        }

        // dedup — 같은 kind 24h 내 중복 차단
        await createNotificationDedup({
            userId: cfg.userId,
            kind: 'BUDGET_WARNING',
            title,
            body,
            link: '/dashboard/settings/ai',
            metadata: {
                pctUsed: Math.round(pctUsed),
                totalCost,
                budget,
                severity,
                monthKey,
            },
        }, 24);

        alerted++;
    }

    return NextResponse.json({
        ok: true,
        candidates: configs.length,
        alerted,
        skipped,
        runAt: now.toISOString(),
    });
}
