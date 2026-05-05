'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

async function getSessionUser() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    return session.user;
}

/**
 * 워크스페이스에 멤버 권한 검증 (OWNER/ADMIN 만 데이터 이동 가능).
 */
async function requireWorkspaceAdmin(workspaceId: string, userId: string) {
    const m = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
        select: { role: true },
    });
    if (!m || (m.role !== 'OWNER' && m.role !== 'ADMIN')) {
        throw new Error('워크스페이스 관리자 권한이 필요합니다');
    }
}

/**
 * 사용자가 가진 "워크스페이스 미배정 (개인 데이터)" 목록 조회.
 * 워크스페이스로 이동 가능한 자원들.
 */
export async function listImportableData() {
    const user = await getSessionUser();
    const userId = user.id!;

    const [channels, campaigns, series] = await Promise.all([
        prisma.marketingChannel.findMany({
            where: { userId, workspaceId: null },
            select: { id: true, type: true, accountName: true, status: true, region: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.campaign.findMany({
            where: { userId, workspaceId: null },
            select: { id: true, name: true, status: true, scheduledAt: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 200,
        }),
        prisma.campaignSeries.findMany({
            where: { userId, workspaceId: null },
            select: { id: true, name: true, status: true, totalPosts: true, completedPosts: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        }),
    ]);

    return {
        channels: channels.map(c => ({ ...c, createdAt: c.createdAt.toISOString() })),
        campaigns: campaigns.map(c => ({
            ...c,
            scheduledAt: c.scheduledAt?.toISOString() || null,
            createdAt: c.createdAt.toISOString(),
        })),
        series: series.map(s => ({ ...s, createdAt: s.createdAt.toISOString() })),
        totals: {
            channels: channels.length,
            campaigns: campaigns.length,
            series: series.length,
        },
    };
}

/**
 * 선택한 자원들을 워크스페이스로 일괄 이동.
 * - 채널: 단순 workspaceId 업데이트
 * - 시리즈: workspaceId 업데이트 + 파생 캠페인도 같이 이동
 * - 캠페인: workspaceId 업데이트
 *
 * 안전성: 본인 소유 + workspaceId=null 조건으로만 update (이미 다른 워크스페이스에 있는 건 차단).
 */
export async function moveDataToWorkspace(input: {
    workspaceId: string;
    channelIds?: string[];
    campaignIds?: string[];
    seriesIds?: string[];
}): Promise<{
    ok: boolean;
    moved: { channels: number; campaigns: number; series: number; campaignsFromSeries: number };
    error?: string;
}> {
    const user = await getSessionUser();
    const userId = user.id!;
    await requireWorkspaceAdmin(input.workspaceId, userId);

    const channelIds = input.channelIds || [];
    const campaignIds = input.campaignIds || [];
    const seriesIds = input.seriesIds || [];

    if (channelIds.length === 0 && campaignIds.length === 0 && seriesIds.length === 0) {
        return { ok: false, moved: { channels: 0, campaigns: 0, series: 0, campaignsFromSeries: 0 }, error: '이동할 항목이 선택되지 않았습니다' };
    }

    const result = await prisma.$transaction(async (tx) => {
        let movedChannels = 0;
        let movedCampaigns = 0;
        let movedSeries = 0;
        let movedCampaignsFromSeries = 0;

        if (channelIds.length > 0) {
            const r = await tx.marketingChannel.updateMany({
                where: { id: { in: channelIds }, userId, workspaceId: null },
                data: { workspaceId: input.workspaceId },
            });
            movedChannels = r.count;
        }

        if (campaignIds.length > 0) {
            const r = await tx.campaign.updateMany({
                where: { id: { in: campaignIds }, userId, workspaceId: null },
                data: { workspaceId: input.workspaceId },
            });
            movedCampaigns = r.count;
        }

        if (seriesIds.length > 0) {
            const rs = await tx.campaignSeries.updateMany({
                where: { id: { in: seriesIds }, userId, workspaceId: null },
                data: { workspaceId: input.workspaceId },
            });
            movedSeries = rs.count;

            // 시리즈가 만든 캠페인도 같이 이동 (seriesId FK 매칭)
            const rc = await tx.campaign.updateMany({
                where: { seriesId: { in: seriesIds }, userId, workspaceId: null },
                data: { workspaceId: input.workspaceId },
            });
            movedCampaignsFromSeries = rc.count;
        }

        return {
            channels: movedChannels,
            campaigns: movedCampaigns,
            series: movedSeries,
            campaignsFromSeries: movedCampaignsFromSeries,
        };
    });

    revalidatePath('/dashboard/workspace');
    revalidatePath(`/dashboard/workspace/${input.workspaceId}`);
    return { ok: true, moved: result };
}

/**
 * 데이터 다시 개인 모드로 빼기 (워크스페이스에서 제외).
 * Owner 만 가능 — 워크스페이스를 떠나기 전 데이터 회수용.
 */
export async function removeFromWorkspace(input: {
    workspaceId: string;
    channelIds?: string[];
    campaignIds?: string[];
    seriesIds?: string[];
}): Promise<{ ok: boolean; moved: { channels: number; campaigns: number; series: number } }> {
    const user = await getSessionUser();
    const userId = user.id!;

    // owner 만 가능
    const ws = await prisma.workspace.findUnique({ where: { id: input.workspaceId }, select: { ownerId: true } });
    if (!ws || ws.ownerId !== userId) throw new Error('Owner 만 데이터를 회수할 수 있습니다');

    const result = await prisma.$transaction(async (tx) => {
        const c = (input.channelIds?.length ?? 0) > 0
            ? await tx.marketingChannel.updateMany({
                where: { id: { in: input.channelIds! }, userId, workspaceId: input.workspaceId },
                data: { workspaceId: null },
            })
            : { count: 0 };

        const cm = (input.campaignIds?.length ?? 0) > 0
            ? await tx.campaign.updateMany({
                where: { id: { in: input.campaignIds! }, userId, workspaceId: input.workspaceId },
                data: { workspaceId: null },
            })
            : { count: 0 };

        const s = (input.seriesIds?.length ?? 0) > 0
            ? await tx.campaignSeries.updateMany({
                where: { id: { in: input.seriesIds! }, userId, workspaceId: input.workspaceId },
                data: { workspaceId: null },
            })
            : { count: 0 };

        return { channels: c.count, campaigns: cm.count, series: s.count };
    });

    revalidatePath(`/dashboard/workspace/${input.workspaceId}`);
    return { ok: true, moved: result };
}
