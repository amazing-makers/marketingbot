import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import dayjs from 'dayjs';
import { redirect } from 'next/navigation';
import { getDailyTrend, getChannelDistribution, getSuccessRate, getHourlyDistribution } from '@/app/actions/statsActions';
import { DashboardStatsClient } from './DashboardStatsClient';
import WorkspaceContextBanner from '@/components/workspace/WorkspaceContextBanner';
import SetupChecklist from '@/components/onboarding/SetupChecklist';
import TrialExpiringBanner from '@/components/billing/TrialExpiringBanner';
import TrialExpiredBanner from '@/components/billing/TrialExpiredBanner';
import PlanUsageWidget from '@/components/billing/PlanUsageWidget';
import SampleDataCard from '@/components/onboarding/SampleDataCard';

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
        hourly,
        // Phase 32 — 트라이얼 만료 배너
        trialLicense,
        activeSub,
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
        getHourlyDistribution({ days }),
        prisma.license.findFirst({
            where: { userId, plan: 'FREE_TRIAL' },
            orderBy: { createdAt: 'desc' },
            select: { validUntil: true },
        }),
        prisma.subscription.findUnique({
            where: { userId },
            select: { plan: true, status: true },
        }),
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

    // 트라이얼 배너 — 유료 구독자가 아닐 때만
    const isPaidActive = activeSub && activeSub.status === 'active' && activeSub.plan && activeSub.plan !== 'FREE';
    const trialDaysDiff = trialLicense?.validUntil
        ? dayjs(trialLicense.validUntil).diff(dayjs(), 'day')
        : null;
    // 만료 전 7일 이내 → Expiring 배너
    const showTrialExpiringBanner = !isPaidActive && trialLicense?.validUntil &&
        trialDaysDiff !== null && trialDaysDiff <= 7 &&
        dayjs(trialLicense.validUntil).isAfter(dayjs());
    // 만료 후 90일 이내 → Expired (grace period) 배너
    const showTrialExpiredBanner = !isPaidActive && trialLicense?.validUntil &&
        trialDaysDiff !== null && trialDaysDiff < 0 && trialDaysDiff >= -90;
    const daysRemaining = trialLicense?.validUntil
        ? Math.max(0, dayjs(trialLicense.validUntil).diff(dayjs(), 'day'))
        : 0;
    const daysSinceExpired = trialLicense?.validUntil
        ? Math.max(0, -dayjs(trialLicense.validUntil).diff(dayjs(), 'day'))
        : 0;

    return (
        <>
            <WorkspaceContextBanner />
            {showTrialExpiringBanner && trialLicense?.validUntil && (
                <TrialExpiringBanner
                    daysRemaining={daysRemaining}
                    expiresAt={trialLicense.validUntil.toISOString()}
                />
            )}
            {showTrialExpiredBanner && trialLicense?.validUntil && (
                <TrialExpiredBanner
                    daysSinceExpired={daysSinceExpired}
                    expiredAt={trialLicense.validUntil.toISOString()}
                />
            )}
            <PlanUsageWidget userId={userId} />
            <SampleDataCard
                channelCount={channelCount}
                campaignCount={recentCampaigns.length}
                seriesCount={recentCampaigns.filter(c => c.seriesId).length}
            />
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
