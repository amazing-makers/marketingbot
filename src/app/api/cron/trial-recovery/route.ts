import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';
import { sendEmail } from '@/lib/email/send';
import { TrialRecoveryEmail } from '@/lib/email/templates/TrialRecovery';
import { createNotification } from '@/lib/notifications/create';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * Phase 33 — 트라이얼 만료 후 7일 후 win-back 이메일 (1회만).
 *
 * 매일 1회 실행 (vercel.json 에 등록).
 *
 * 로직:
 *   1. FREE_TRIAL 라이센스 중 validUntil 이 정확히 7일 전 ~ 8일 전 사이 (하루 폭)
 *   2. 현재 유료 구독자 아님 (재가입 아직 안 한 사용자)
 *   3. 이전에 TRIAL_RECOVERY 알림을 받은 적이 없음 (완전 1회 보장)
 *   4. emailPreferences.welcome 가 false 가 아닌 경우만
 */
export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (env.NODE_ENV === 'production' && authHeader !== `Bearer ${env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = dayjs();
    const expiredAfter = now.subtract(8, 'day').startOf('day');
    const expiredBefore = now.subtract(7, 'day').endOf('day');

    const licenses = await prisma.license.findMany({
        where: {
            plan: 'FREE_TRIAL',
            validUntil: {
                gte: expiredAfter.toDate(),
                lte: expiredBefore.toDate(),
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
                    notifications: {
                        where: { kind: 'TRIAL_RECOVERY' },
                        select: { id: true },
                        take: 1,
                    },
                },
            },
        },
    });

    let sent = 0;
    let skipped = 0;

    for (const lic of licenses) {
        const u = lic.user;
        if (!u.email) { skipped++; continue; }

        // 유료 구독으로 전환했으면 skip
        const sub = u.subscription;
        if (sub && sub.status === 'active' && sub.plan && sub.plan !== 'FREE') { skipped++; continue; }

        // 이미 recovery 알림을 받은 적이 있으면 skip (영구 1회 보장)
        if (u.notifications.length > 0) { skipped++; continue; }

        // 이메일 환경설정 거부 시 skip
        const prefs = (u.emailPreferences as any) || {};
        if (prefs.welcome === false) { skipped++; continue; }

        const appUrl = process.env.NEXTAUTH_URL || 'https://marketingbot.amakers.co.kr';
        const expiredAtStr = dayjs(lic.validUntil!).format('YYYY-MM-DD');
        const daysSinceExpired = now.diff(lic.validUntil!, 'day');

        try {
            await sendEmail({
                to: u.email,
                subject: `${u.name || u.email}님, 마케팅봇이 더 강력해졌어요 ✨`,
                react: TrialRecoveryEmail({
                    name: u.name || u.email.split('@')[0],
                    expiredAt: expiredAtStr,
                    daysSinceExpired,
                    upgradeUrl: `${appUrl}/pricing`,
                    pricingUrl: `${appUrl}/pricing`,
                }),
            });
        } catch (e) {
            console.warn(`[trial-recovery] email failed for ${u.email}`, e);
            continue;
        }

        // 인앱 알림도 1회 발송 — dedup 안 씀 (이 cron 자체가 1회 보장)
        await createNotification({
            userId: u.id,
            kind: 'TRIAL_RECOVERY',
            title: `🎁 새 기능과 함께 돌아오세요`,
            body: `체험이 ${daysSinceExpired}일 전 종료됐어요. 그동안 5개 신규 기능이 추가됐습니다`,
            link: '/pricing',
            metadata: { expiredAt: lic.validUntil!.toISOString(), daysSinceExpired },
        });

        sent++;
    }

    return NextResponse.json({
        ok: true,
        eligible: licenses.length,
        sent,
        skipped,
        runAt: now.toISOString(),
    });
}
