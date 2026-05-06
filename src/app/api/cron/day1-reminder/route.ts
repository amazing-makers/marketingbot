import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';
import { sendEmail } from '@/lib/email/send';
import { Day1ReminderEmail } from '@/lib/email/templates/Day1Reminder';
import { createNotification } from '@/lib/notifications/create';
import { INDUSTRY_PRESETS } from '@/lib/onboarding/industry-presets';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * Phase 42 — 1일차 (24-48시간) 리마인드 이메일.
 *
 * 매일 1회 실행 (vercel.json).
 *
 * 대상:
 *   - 가입 후 24-48시간 사이 사용자
 *   - 첫 캠페인을 아직 안 만든 사용자
 *   - 알림 환경설정 welcome 거부 안 한 사용자
 *   - 이전에 동일 리마인드 받지 않은 사용자 (영구 1회)
 */
export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (env.NODE_ENV === 'production' && authHeader !== `Bearer ${env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = dayjs();
    const before = now.subtract(48, 'hour').toDate();
    const after = now.subtract(24, 'hour').toDate();

    // 24-48 시간 전 가입한 사용자 후보
    const candidates = await prisma.user.findMany({
        where: {
            createdAt: { gte: before, lte: after },
        },
        select: {
            id: true,
            email: true,
            name: true,
            emailPreferences: true,
            _count: {
                select: { channels: true, campaigns: true },
            },
            notifications: {
                where: { kind: 'SYSTEM', title: { contains: '리마인드' } },
                select: { id: true },
                take: 1,
            },
        },
    });

    let sent = 0;
    let skipped = 0;

    for (const u of candidates) {
        if (!u.email) { skipped++; continue; }

        // 이미 캠페인을 만들었으면 skip
        if (u._count.campaigns > 0) { skipped++; continue; }

        // 이전에 리마인드 보낸 적 있으면 skip
        if (u.notifications.length > 0) { skipped++; continue; }

        // 이메일 환경설정 거부 시 skip
        const prefs = (u.emailPreferences as any) || {};
        if (prefs.welcome === false) { skipped++; continue; }

        const industryId = prefs.industry as string | undefined;
        const industryLabel = industryId && INDUSTRY_PRESETS[industryId]
            ? INDUSTRY_PRESETS[industryId].label
            : null;

        const appUrl = process.env.NEXTAUTH_URL || 'https://marketingbot.amakers.co.kr';
        const nextStepUrl = u._count.channels === 0
            ? `${appUrl}/dashboard/channels`
            : `${appUrl}/dashboard/campaigns/new`;

        try {
            await sendEmail({
                to: u.email,
                subject: u._count.channels === 0
                    ? `${u.name || u.email.split('@')[0]}님, 첫 채널 연결을 도와드릴까요? 🌐`
                    : `${u.name || u.email.split('@')[0]}님, 5분이면 첫 게시물 발행 가능 🚀`,
                react: Day1ReminderEmail({
                    name: u.name || u.email.split('@')[0],
                    hasChannels: u._count.channels > 0,
                    hasCampaigns: u._count.campaigns > 0,
                    nextStepUrl,
                    industry: industryLabel,
                }),
            });
        } catch (e) {
            console.warn(`[day1-reminder] email failed for ${u.email}`, e);
            continue;
        }

        // dedup 마커 — SYSTEM 알림으로 영구 1회 보장 (사용자에게는 자동 read)
        await createNotification({
            userId: u.id,
            kind: 'SYSTEM',
            title: '1일차 리마인드 발송됨',
            body: u._count.channels === 0 ? '채널 연결 안내' : '첫 캠페인 권유',
            metadata: { type: 'day1-reminder', hasChannels: u._count.channels > 0 } as any,
        });

        sent++;
    }

    return NextResponse.json({
        ok: true,
        candidates: candidates.length,
        sent,
        skipped,
        runAt: now.toISOString(),
    });
}
