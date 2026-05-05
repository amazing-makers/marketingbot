import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyChannelInternal } from '@/app/actions/channelActions';
import { createNotificationDedup } from '@/lib/notifications/create';
import { env } from '@/lib/env';
import { ChannelType } from '@prisma/client';

export const dynamic = 'force-dynamic';

/**
 * Phase 35 — 채널 health check cron.
 *
 * 매일 1회 실행 — 모든 ACTIVE/ERROR 상태 채널을 verify.
 * - ACTIVE → 여전히 ACTIVE: skip
 * - ACTIVE → ERROR: 사용자에게 인앱 알림 (24h dedup)
 * - ERROR → ACTIVE: 사용자에게 "복구됨" 인앱 알림
 *
 * 에이전트 기반 채널 (Instagram/Naver 등)은 verify 불가 → skip.
 */
export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (env.NODE_ENV === 'production' && authHeader !== `Bearer ${env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // verify 가능한 타입만 — 에이전트 채널 제외
    const verifiable: ChannelType[] = [ChannelType.TELEGRAM, ChannelType.DISCORD, ChannelType.YOUTUBE, ChannelType.WORDPRESS];
    const channels = await prisma.marketingChannel.findMany({
        where: { type: { in: verifiable }, status: { in: ['ACTIVE', 'ERROR'] } },
        select: { id: true, type: true, accountName: true },
    });

    let checked = 0;
    let degraded = 0;
    let recovered = 0;
    let unchanged = 0;
    let failed = 0;

    for (const ch of channels) {
        try {
            const r = await verifyChannelInternal(ch.id);
            checked++;

            if (!r.channelUserId) continue;

            // 상태 전환 알림
            if (r.previousStatus === 'ACTIVE' && r.newStatus === 'ERROR') {
                degraded++;
                await createNotificationDedup({
                    userId: r.channelUserId,
                    kind: 'CHANNEL_ERROR',
                    title: `🚨 채널 오류 — ${r.channelType}`,
                    body: `${r.accountName}: ${r.error?.slice(0, 100) || '인증 실패'}. 채널 페이지에서 재연결해주세요.`,
                    link: '/dashboard/channels',
                    metadata: { channelId: ch.id, channelType: r.channelType, error: r.error },
                }, 24);
            } else if (r.previousStatus === 'ERROR' && r.newStatus === 'ACTIVE') {
                recovered++;
                await createNotificationDedup({
                    userId: r.channelUserId,
                    kind: 'SYSTEM',
                    title: `✅ 채널 복구됨 — ${r.channelType}`,
                    body: `${r.accountName} 정상 작동 중입니다.`,
                    link: '/dashboard/channels',
                    metadata: { channelId: ch.id, channelType: r.channelType },
                }, 24);
            } else {
                unchanged++;
            }
        } catch (e) {
            failed++;
            console.warn(`[health-check] ${ch.id} (${ch.type}) failed:`, e);
        }
    }

    return NextResponse.json({
        ok: true,
        total: channels.length,
        checked,
        unchanged,
        degraded,
        recovered,
        failed,
    });
}
