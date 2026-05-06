'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

async function getSessionUser() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    return session.user;
}

/**
 * Phase 43 — 신규 사용자 마일스톤 체크.
 *
 * 사용자가 첫 발행 SUCCESS 를 달성했는지 + 축하 모달 본 적 있는지 반환.
 * dedup: emailPreferences.firstPublishCelebrated 플래그 사용.
 */
export async function checkFirstPublishMilestone(): Promise<{
    achieved: boolean;
    alreadyCelebrated: boolean;
    successCount: number;
    firstSuccessAt: string | null;
    channelCount: number;
    seriesCount: number;
}> {
    const user = await getSessionUser();
    const userId = user.id!;

    const [u, firstSuccess, successCount, channelCount, seriesCount] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: { emailPreferences: true },
        }),
        prisma.scheduledTask.findFirst({
            where: { campaign: { userId }, status: 'SUCCESS' },
            orderBy: { executedAt: 'asc' },
            select: { executedAt: true },
        }),
        prisma.scheduledTask.count({
            where: { campaign: { userId }, status: 'SUCCESS' },
        }),
        prisma.marketingChannel.count({ where: { userId } }),
        prisma.campaignSeries.count({ where: { userId } }),
    ]);

    const prefs = (u?.emailPreferences as any) || {};
    return {
        achieved: !!firstSuccess,
        alreadyCelebrated: !!prefs.firstPublishCelebrated,
        successCount,
        firstSuccessAt: firstSuccess?.executedAt?.toISOString() || null,
        channelCount,
        seriesCount,
    };
}

/**
 * 축하 모달 표시 후 dedup 마커 저장 — 다시는 자동 표시 안 됨.
 */
export async function markFirstPublishCelebrated(): Promise<{ ok: boolean }> {
    const user = await getSessionUser();
    const u = await prisma.user.findUnique({
        where: { id: user.id! },
        select: { emailPreferences: true },
    });
    const prefs = (u?.emailPreferences as any) || {};
    await prisma.user.update({
        where: { id: user.id! },
        data: {
            emailPreferences: {
                ...prefs,
                firstPublishCelebrated: true,
                firstPublishCelebratedAt: new Date().toISOString(),
            } as any,
        },
    });
    return { ok: true };
}
