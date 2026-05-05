import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import dayjs from 'dayjs';
import { redirect } from 'next/navigation';
import { getDailyTrend, getChannelDistribution, getSuccessRate, getHourlyDistribution } from '@/app/actions/statsActions';
import { DashboardStatsClient } from './DashboardStatsClient';
import WorkspaceContextBanner from '@/components/workspace/WorkspaceContextBanner';
import SetupChecklist from '@/components/onboarding/SetupChecklist';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ days?: string; skip?: string }> }) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) redirect('/login');

    const params = await searchParams;
    const days = parseInt(params.days || '7', 10);
    const skipOnboarding = params.skip === '1';

    // 모든 데이터를 병렬로 Fetch (성능 최적화)
    const [
        user,
        pendingCount,
        runningCount,
        todaySuccess,
        todayFailed,
        channelCount,
        agentCount,
        recentCampaigns,
        // 신규 차트 데이터
        daily,
        channels,
        success,
        hourly
    ] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { onboardingCompletedAt: true, createdAt: true } }),
        prisma.scheduledTask.count({ where: { campaign: { userId }, status: 'PENDING', scheduledAt: { lte: dayjs().add(7, 'day').toDate() } } }),
        prisma.scheduledTask.count({ where: { campaign: { userId }, status: 'RUNNING' } }),
        prisma.scheduledTask.count({ where: { campaign: { userId }, status: 'SUCCESS', executedAt: { gte: dayjs().startOf('day').toDate() } } }),
        prisma.scheduledTask.count({ where: { campaign: { userId }, status: 'FAILED', executedAt: { gte: dayjs().startOf('day').toDate() } } }),
        prisma.marketingChannel.count({ where: { userId } }),
        prisma.agentInstance.count({ where: { userId, lastSeenAt: { gte: dayjs().subtract(5, 'minute').toDate() } } }),
        prisma.campaign.findMany({ 
            where: { userId }, 
            take: 5, 
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { tasks: true } } }
        }),
        getDailyTrend({ days }),
        getChannelDistribution({ days }),
        getSuccessRate({ days }),
        getHourlyDistribution({ days })
    ]);

    // 온보딩 미완료 시 이동
    if (!user?.onboardingCompletedAt && !skipOnboarding) {
        redirect('/onboarding');
    }

    // 기존 요약 지표 데이터 구성
    const summaryStats = {
        pendingCount,
        runningCount,
        todaySuccess,
        todayFailed,
        channelCount,
        agentCount,
    };

    const quickStartData = {
        onboardingCompletedAt: user?.onboardingCompletedAt,
        agentCount,
        channelCount,
        campaignCount: recentCampaigns.length,
    };

    return (
        <>
            <WorkspaceContextBanner />
            <SetupChecklist />
            <DashboardStatsClient
                summary={summaryStats}
                quickStart={quickStartData}
                recentCampaigns={recentCampaigns}
                daily={daily}
                channels={channels}
                success={success}
                hourly={hourly}
                initialDays={days}
            />
        </>
    );
}
