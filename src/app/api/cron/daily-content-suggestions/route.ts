import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotificationDedup } from '@/lib/notifications/create';
import dayjs from 'dayjs';

/**
 * Phase 23 — 매일 아침 09:00 KST 콘텐츠 추천 알림.
 *
 * 활성 사용자(최근 30일 가입 또는 최근 7일 활성)에게 그날 추천 발행 시간 / 분위기 안내.
 * 인앱 + Web Push (이메일은 부담 — 옵트인 사용자만 추후 추가).
 *
 * Vercel cron: { "path": "/api/cron/daily-content-suggestions", "schedule": "0 0 * * *" }  // UTC 00:00 = KST 09:00
 *
 * 보안: Authorization: Bearer ${CRON_SECRET}
 */

const SUGGESTIONS = [
    { hint: '월요일 — 한 주 시작 동기부여 / 인사이트 콘텐츠 추천', primeHour: '오전 9시 / 점심 12시' },
    { hint: '화요일 — 정보·교육 콘텐츠가 가장 잘 통하는 요일', primeHour: '오전 10시 / 저녁 7시' },
    { hint: '수요일 — 중주 피로 풀어주는 가벼운 콘텐츠 추천', primeHour: '점심 12시 / 저녁 8시' },
    { hint: '목요일 — 주말 대비 액션 유도 콘텐츠', primeHour: '저녁 7-9시' },
    { hint: '금요일 — 주말 트래픽 노린 후킹 컨텐츠', primeHour: '저녁 7-9시 (참여율 정점)' },
    { hint: '토요일 — 라이프스타일·후기 콘텐츠 추천', primeHour: '오전 10-11시 / 저녁 8시' },
    { hint: '일요일 — 영감/스토리텔링 / 다음 주 예고편', primeHour: '오후 2-3시 / 저녁 8-9시' },
];

export async function GET(req: Request) {
    const auth = req.headers.get('authorization') || '';
    const expected = `Bearer ${process.env.CRON_SECRET || ''}`;
    if (!process.env.CRON_SECRET || auth !== expected) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const dayIdx = today.getDay(); // 0=일 ... 6=토
    const daySuggest = dayIdx === 0 ? SUGGESTIONS[6] : SUGGESTIONS[dayIdx - 1];
    const dateLabel = dayjs(today).format('M월 D일 (ddd)');

    // 최근 30일 가입 또는 최근 7일 활성 사용자
    const thirtyDaysAgo = dayjs().subtract(30, 'day').toDate();
    const sevenDaysAgo = dayjs().subtract(7, 'day').toDate();

    const activeUsers = await prisma.user.findMany({
        where: {
            OR: [
                { createdAt: { gte: thirtyDaysAgo } },
                { campaigns: { some: { createdAt: { gte: sevenDaysAgo } } } },
            ],
        },
        select: { id: true, _count: { select: { campaigns: true, channels: true } } },
        take: 1000,
    });

    let sent = 0;
    let skipped = 0;

    for (const u of activeUsers) {
        // 채널이 없거나 캠페인이 너무 적으면 알림 스팸 방지 — 일단 스킵
        if (u._count.channels === 0) {
            skipped++;
            continue;
        }

        try {
            await createNotificationDedup({
                userId: u.id,
                kind: 'SYSTEM',
                title: `📅 ${dateLabel} 콘텐츠 추천`,
                body: `${daySuggest.hint}\n💡 황금시간대: ${daySuggest.primeHour}`,
                link: '/dashboard/campaigns/new',
                metadata: { day: dayIdx, hint: daySuggest.hint },
            }, 20); // 20시간 dedup — 같은 날 중복 방지
            sent++;
        } catch (e) {
            console.warn('[daily-suggestions] send failed', { userId: u.id }, e);
        }
    }

    return NextResponse.json({
        ok: true,
        date: dateLabel,
        scanned: activeUsers.length,
        sent,
        skipped,
    });
}
