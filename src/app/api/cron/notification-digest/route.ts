import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';
import { sendEmail } from '@/lib/email/send';
import { NotificationDigestEmail } from '@/lib/email/templates/NotificationDigest';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * Phase 36 — 미확인 알림 다이제스트 이메일.
 *
 * 매일 1회 실행 — 사용자가 7일+ 인앱 알림을 안 읽었고 5건+ 누적 시 1통 발송.
 * dedup: 같은 사용자에게 7일 내 다이제스트 발송했으면 skip.
 *   → 마지막 다이제스트 발송 시점은 SYSTEM kind의 metadata.kind='digest' 알림으로 기록.
 */
export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (env.NODE_ENV === 'production' && authHeader !== `Bearer ${env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = dayjs();
    const sevenDaysAgo = now.subtract(7, 'day').toDate();

    // 1. 7일+ 안 읽은 알림이 5건+ 있는 사용자 후보
    const candidates = await prisma.notification.groupBy({
        by: ['userId'],
        where: {
            readAt: null,
            createdAt: { lte: sevenDaysAgo }, // 7일+ 묵힌 것
        },
        _count: { _all: true },
        having: {
            id: { _count: { gte: 5 } },
        },
    });

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const c of candidates) {
        const userId = c.userId;
        try {
            // 7일 내 다이제스트 이미 보냈으면 skip
            const recentDigest = await prisma.notification.findFirst({
                where: {
                    userId,
                    kind: 'SYSTEM',
                    createdAt: { gte: sevenDaysAgo },
                    title: { contains: '미확인 알림' },
                },
                select: { id: true },
            });
            if (recentDigest) { skipped++; continue; }

            // 사용자 정보 + 미읽은 알림 (최신 10건)
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true, name: true, emailPreferences: true },
            });
            if (!user?.email) { skipped++; continue; }
            const prefs = (user.emailPreferences as any) || {};
            if (prefs.weekly === false) { skipped++; continue; } // weekly 토글 재사용

            const [unreadCount, items] = await Promise.all([
                prisma.notification.count({ where: { userId, readAt: null } }),
                prisma.notification.findMany({
                    where: { userId, readAt: null },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    select: { kind: true, title: true, body: true, createdAt: true },
                }),
            ]);

            // 마지막 활동 시점 (최근 알림 createdAt 또는 user.createdAt 기준 추정)
            const oldestUnread = await prisma.notification.findFirst({
                where: { userId, readAt: null },
                orderBy: { createdAt: 'asc' },
                select: { createdAt: true },
            });
            const daysSinceLastVisit = oldestUnread
                ? Math.max(7, now.diff(oldestUnread.createdAt, 'day'))
                : 7;

            const appUrl = process.env.NEXTAUTH_URL || 'https://marketingbot.amakers.co.kr';

            await sendEmail({
                to: user.email,
                subject: `📬 ${user.name || ''}님, 미확인 알림 ${unreadCount}건이 있어요`,
                react: NotificationDigestEmail({
                    name: user.name || user.email.split('@')[0],
                    unreadCount,
                    daysSinceLastVisit,
                    items: items.map(it => ({
                        title: it.title,
                        body: it.body,
                        kind: it.kind,
                        createdAt: dayjs(it.createdAt).format('M월 D일'),
                    })),
                    notificationsUrl: `${appUrl}/dashboard/notifications`,
                }),
            });

            // dedup 마커 — SYSTEM kind notification 으로 기록 (다른 cron이 7일 dedup 체크)
            await prisma.notification.create({
                data: {
                    userId,
                    kind: 'SYSTEM',
                    title: `미확인 알림 다이제스트 발송됨`,
                    body: `${unreadCount}건 미확인 알림 이메일 발송`,
                    metadata: { type: 'digest', count: unreadCount } as any,
                    readAt: new Date(), // 자동 read 처리 — 사용자에게 노이즈 안 줌
                },
            });

            sent++;
        } catch (e: any) {
            errors.push(`${userId}: ${e?.message || e}`);
            console.warn('[notification-digest] failed for', userId, e);
        }
    }

    return NextResponse.json({
        ok: true,
        candidates: candidates.length,
        sent,
        skipped,
        errors: errors.slice(0, 5),
    });
}
