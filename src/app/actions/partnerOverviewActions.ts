'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';

async function getSessionUser() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    return session.user;
}

/**
 * 파트너의 모든 고객사 KPI 합산 + 고객사별 카드 데이터.
 * 이번 달 + 지난 달 비교 트렌드.
 */
export async function getPartnerOverview() {
    const user = await getSessionUser();
    const reseller = await prisma.reseller.findUnique({
        where: { userId: user.id! },
        include: {
            clients: {
                where: { status: 'ACTIVE' },
                include: { workspace: { select: { id: true, name: true, brandColor: true } } },
            },
        },
    });
    if (!reseller) return null;

    const now = new Date();
    const thisMonthStart = dayjs(now).startOf('month').toDate();
    const lastMonthStart = dayjs(now).subtract(1, 'month').startOf('month').toDate();
    const thisMonthEnd = dayjs(now).startOf('month').add(1, 'month').toDate();
    const lastMonthEnd = thisMonthStart;

    // 고객사별 통계
    const clientStats = await Promise.all(reseller.clients.map(async (client) => {
        const [thisMonthCampaigns, lastMonthCampaigns] = await Promise.all([
            prisma.campaign.findMany({
                where: { workspaceId: client.workspace.id, createdAt: { gte: thisMonthStart, lt: thisMonthEnd } },
                select: { id: true },
            }),
            prisma.campaign.findMany({
                where: { workspaceId: client.workspace.id, createdAt: { gte: lastMonthStart, lt: lastMonthEnd } },
                select: { id: true },
            }),
        ]);
        const thisIds = thisMonthCampaigns.map(c => c.id);
        const lastIds = lastMonthCampaigns.map(c => c.id);

        const [thisTasks, lastTasks, channelCount, seriesCount] = await Promise.all([
            thisIds.length > 0
                ? prisma.scheduledTask.groupBy({
                      by: ['status'],
                      where: { campaignId: { in: thisIds } },
                      _count: { _all: true },
                  })
                : Promise.resolve([]),
            lastIds.length > 0
                ? prisma.scheduledTask.groupBy({
                      by: ['status'],
                      where: { campaignId: { in: lastIds } },
                      _count: { _all: true },
                  })
                : Promise.resolve([]),
            prisma.marketingChannel.count({
                where: { workspaceId: client.workspace.id, status: 'ACTIVE' },
            }),
            prisma.campaignSeries.count({
                where: { workspaceId: client.workspace.id, status: 'RUNNING' },
            }),
        ]);

        const thisSuccess = thisTasks.find(t => t.status === 'SUCCESS')?._count?._all ?? 0;
        const thisFailed = thisTasks.find(t => t.status === 'FAILED')?._count?._all ?? 0;
        const lastSuccess = lastTasks.find(t => t.status === 'SUCCESS')?._count?._all ?? 0;

        const trendPercent = lastSuccess === 0
            ? (thisSuccess > 0 ? 100 : 0)
            : Math.round(((thisSuccess - lastSuccess) / lastSuccess) * 100);

        return {
            id: client.id,
            clientName: client.clientName,
            industry: client.industry,
            workspace: client.workspace,
            thisMonth: {
                campaigns: thisMonthCampaigns.length,
                published: thisSuccess,
                failed: thisFailed,
            },
            lastMonth: {
                published: lastSuccess,
            },
            trendPercent,
            activeChannels: channelCount,
            runningSeries: seriesCount,
        };
    }));

    // 합산
    const totals = {
        clientCount: clientStats.length,
        thisMonthCampaigns: clientStats.reduce((s, c) => s + c.thisMonth.campaigns, 0),
        thisMonthPublished: clientStats.reduce((s, c) => s + c.thisMonth.published, 0),
        thisMonthFailed: clientStats.reduce((s, c) => s + c.thisMonth.failed, 0),
        lastMonthPublished: clientStats.reduce((s, c) => s + c.lastMonth.published, 0),
        totalChannels: clientStats.reduce((s, c) => s + c.activeChannels, 0),
        totalRunningSeries: clientStats.reduce((s, c) => s + c.runningSeries, 0),
    };

    return {
        partnerName: reseller.name,
        period: dayjs(now).format('YYYY-MM'),
        clients: clientStats,
        totals,
    };
}
