import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';

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
        const amount = Math.round(baseRevenue * reseller.commissionRate);

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
                    // 같은 달이 다시 계산되면 갱신 (예: 플랜 업그레이드 반영)
                    baseRevenue,
                    commissionRate: reseller.commissionRate,
                    amount,
                },
                create: {
                    resellerId: reseller.id,
                    referredUserId: u.id,
                    periodYearMonth,
                    baseRevenue,
                    commissionRate: reseller.commissionRate,
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
