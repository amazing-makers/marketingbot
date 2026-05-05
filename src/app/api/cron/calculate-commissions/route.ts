import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';
import { calcPartnerTier } from '@/lib/partner/tiers';

/**
 * 매월 1일 새벽 실행 — 지난달 추천 사용자 결제액 × commissionRate 만큼
 * ReferralCommission 을 PENDING 상태로 누적.
 *
 * Vercel cron (vercel.json):
 *   { "path": "/api/cron/calculate-commissions", "schedule": "0 3 1 * *" }
 *
 * 보안: Authorization: Bearer ${CRON_SECRET}
 *
 * ⚠️ 현재 구현은 골격(skeleton)입니다:
 *   - Stripe charge 데이터를 직접 조회하지 않고, Subscription.plan + 고정 가격표 기준 추정
 *   - 추후: Stripe API 로 실제 invoice.amount_paid 합계 사용 권장
 *   - 환불·다운그레이드 처리는 별도 로직 필요
 */

// 플랜별 월 가격 (원). packages/billing 으로 이전 권장.
const PLAN_PRICE_KRW: Record<string, number> = {
    FREE: 0,
    STARTER: 9900,
    PRO: 29900,
    BUSINESS: 99000,
};

export async function GET(req: Request) {
    const auth = req.headers.get('authorization') || '';
    const expected = `Bearer ${process.env.CRON_SECRET || ''}`;
    if (!process.env.CRON_SECRET || auth !== expected) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const lastMonthStart = dayjs(now).subtract(1, 'month').startOf('month').toDate();
    const lastMonthEnd = dayjs(now).startOf('month').toDate();
    const periodYearMonth = dayjs(lastMonthStart).format('YYYY-MM');

    // 지난달 활성 구독 + 추천코드로 가입한 사용자 조회
    const referredUsers = await prisma.user.findMany({
        where: {
            referredByCodeId: { not: null },
            subscription: {
                plan: { not: 'FREE' },
                status: 'active',
                // 지난달 1일 이전에 가입했거나, 지난달 안에 가입했으나 결제 시작
                createdAt: { lt: lastMonthEnd },
            },
        },
        select: {
            id: true,
            referredByCode: {
                select: {
                    reseller: {
                        select: { id: true, commissionRate: true, status: true },
                    },
                },
            },
            subscription: { select: { plan: true } },
        },
    });

    // 각 reseller 의 누적 commission 사전 집계 (티어 계산용)
    const allResellerIds = [...new Set(referredUsers.map(u => u.referredByCode?.reseller?.id).filter(Boolean) as string[])];
    const lifetimeMap = new Map<string, number>();
    if (allResellerIds.length > 0) {
        const aggs = await prisma.referralCommission.groupBy({
            by: ['resellerId'],
            where: { resellerId: { in: allResellerIds }, status: { in: ['PENDING', 'PAID'] } },
            _sum: { amount: true },
        });
        for (const a of aggs) lifetimeMap.set(a.resellerId, Number(a._sum.amount || 0));
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const u of referredUsers) {
        const reseller = u.referredByCode?.reseller;
        if (!reseller || reseller.status !== 'ACTIVE') {
            skipped++;
            continue;
        }
        const plan = u.subscription?.plan ?? 'FREE';
        const baseRevenue = PLAN_PRICE_KRW[plan] ?? 0;
        if (baseRevenue <= 0) {
            skipped++;
            continue;
        }

        // 티어 기반 자동 수수료율 — Reseller.commissionRate (특별계약) vs 티어 기본값 중 큰 값 적용
        const lifetime = lifetimeMap.get(reseller.id) ?? 0;
        const tierInfo = calcPartnerTier(lifetime);
        const effectiveRate = Math.max(reseller.commissionRate, tierInfo.current.commissionRate);
        const amount = Math.round(baseRevenue * effectiveRate);

        try {
            await prisma.referralCommission.upsert({
                where: {
                    resellerId_referredUserId_periodYearMonth: {
                        resellerId: reseller.id,
                        referredUserId: u.id,
                        periodYearMonth,
                    },
                },
                update: {
                    // 같은 달이 다시 계산되면 갱신 (예: 플랜 업그레이드, 티어 승급 반영)
                    baseRevenue,
                    commissionRate: effectiveRate,
                    amount,
                },
                create: {
                    resellerId: reseller.id,
                    referredUserId: u.id,
                    periodYearMonth,
                    baseRevenue,
                    commissionRate: effectiveRate,
                    amount,
                    status: 'PENDING',
                },
            });
            created++;
        } catch (e) {
            console.error('[commission] upsert failed', { userId: u.id, resellerId: reseller.id }, e);
            errors++;
        }
    }

    return NextResponse.json({
        ok: true,
        period: periodYearMonth,
        scanned: referredUsers.length,
        created,
        skipped,
        errors,
    });
}
