import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';
import { sendEmail } from '@/lib/email/send';
import { TrialExpiringEmail } from '@/lib/email/templates/TrialExpiring';
import { createNotificationDedup } from '@/lib/notifications/create';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * Phase 32 — 트라이얼 만료 알림 cron.
 *
 * 매일 오전 9시 (KST) 실행 권장 — vercel.json 또는 외부 cron 에서 설정.
 *
 * 로직:
 *   1. 활성 FREE_TRIAL 라이센스 (validUntil 이 미래) 중
 *      D-7 / D-3 / D-1 에 해당하는 사용자에게 이메일 + 인앱 알림.
 *   2. 동일 사용자에게 같은 D-N 알림이 24시간 내 발송된 경우 dedup (재발송 방지).
 *   3. 이미 유료 구독으로 전환한 사용자는 skip.
 */
export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (env.NODE_ENV === 'production' && authHeader !== `Bearer ${env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = dayjs();
    const targetDays = [7, 3, 1];
    const results: Record<string, { eligible: number; sent: number }> = {};

    for (const days of targetDays) {
        const targetDay = now.add(days, 'day').startOf('day');
        const targetDayEnd = now.add(days, 'day').endOf('day');

        // FREE_TRIAL 라이센스 — 만료가 정확히 N일 후 (해당 날짜 범위)
        const licenses = await prisma.license.findMany({
            where: {
                plan: 'FREE_TRIAL',
                validUntil: {
                    gte: targetDay.toDate(),
                    lte: targetDayEnd.toDate(),
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        emailPreferences: true,
                        subscription: { select: { plan: true, status: true } },
                    },
                },
            },
        });

        let sent = 0;
        for (const lic of licenses) {
            const u = lic.user;
            if (!u.email) continue;

            // 이미 유료 구독자면 skip
            const sub = u.subscription;
            if (sub && sub.status === 'active' && sub.plan && sub.plan !== 'FREE') continue;

            // 사용자 알림 환경설정 — failures 키 활용 (별도 trial 키는 추가 안 함, 단순화)
            const prefs = (u.emailPreferences as any) || {};
            if (prefs.welcome === false) continue; // 일반 시스템 메일 거부 시

            const appUrl = process.env.NEXTAUTH_URL || 'https://marketingbot.amakers.co.kr';

            // 이메일 발송 — kind 기반 dedup (24h 내 재발송 방지)
            try {
                await sendEmail({
                    to: u.email,
                    subject: days === 1
                        ? `⚡ 내일 마케팅봇 체험 종료 — 결제 시 끊김 없이 사용`
                        : days === 3
                            ? `🚨 마케팅봇 체험 D-3 — 지금 결제하면 ${days}일 절약`
                            : `⏰ 마케팅봇 체험 7일 남음 — 결제 추천`,
                    react: TrialExpiringEmail({
                        name: u.name || u.email.split('@')[0],
                        daysRemaining: days,
                        expiresAt: dayjs(lic.validUntil!).format('YYYY-MM-DD'),
                        upgradeUrl: `${appUrl}/dashboard/settings/billing`,
                        pricingUrl: `${appUrl}/pricing`,
                    }),
                });
            } catch (e) {
                console.warn(`[trial-reminder] email failed for ${u.email}`, e);
                continue;
            }

            // 인앱 알림 — dedup 24h
            await createNotificationDedup({
                userId: u.id,
                kind: 'TRIAL_EXPIRING',
                title: days === 1 ? `⚡ 내일 체험 종료` : `⏰ 체험 ${days}일 남음`,
                body: `${dayjs(lic.validUntil!).format('M월 D일')}까지 — 끊김 없이 쓰려면 지금 결제하세요`,
                link: '/dashboard/settings/billing',
                metadata: { daysRemaining: days, validUntil: lic.validUntil!.toISOString() },
            }, 24);

            sent++;
        }

        results[`d-${days}`] = { eligible: licenses.length, sent };
    }

    return NextResponse.json({ ok: true, results, runAt: now.toISOString() });
}
