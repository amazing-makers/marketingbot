'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';

interface StatsRange { days: number }

async function getUserId(): Promise<string | null> {
    const session = await auth();
    return session?.user?.id || null;
}

// 1. 일별 추이 (성공/실패 분리)
export async function getDailyTrend({ days }: StatsRange = { days: 7 }) {
    const userId = await getUserId();
    if (!userId) return [];
    
    const since = dayjs().subtract(days, 'day').startOf('day').toDate();
    
    const tasks = await prisma.scheduledTask.findMany({
        where: {
            campaign: { userId },
            executedAt: { gte: since },
        },
        select: { executedAt: true, status: true },
    });
    
    // 일자별 그룹핑
    const buckets: Record<string, { date: string; success: number; failed: number; total: number }> = {};
    for (let i = 0; i < days; i++) {
        const date = dayjs().subtract(days - 1 - i, 'day').format('MM-DD');
        buckets[date] = { date, success: 0, failed: 0, total: 0 };
    }
    
    for (const t of tasks) {
        if (!t.executedAt) continue;
        const date = dayjs(t.executedAt).format('MM-DD');
        if (!buckets[date]) continue;
        buckets[date].total++;
        if (t.status === 'SUCCESS') buckets[date].success++;
        if (t.status === 'FAILED') buckets[date].failed++;
    }
    
    return Object.values(buckets);
}

// 2. 채널별 분포
export async function getChannelDistribution({ days }: StatsRange = { days: 30 }) {
    const userId = await getUserId();
    if (!userId) return [];
    
    const since = dayjs().subtract(days, 'day').toDate();
    
    const tasks = await prisma.scheduledTask.groupBy({
        by: ['channelId'],
        where: {
            campaign: { userId },
            executedAt: { gte: since },
        },
        _count: { id: true },
    });
    
    const channels = await prisma.marketingChannel.findMany({
        where: { id: { in: tasks.map(t => t.channelId) } },
        select: { id: true, type: true, accountName: true },
    });
    
    return tasks.map(t => {
        const ch = channels.find(c => c.id === t.channelId);
        return {
            name: ch ? `${ch.type}` : '알 수 없음',
            label: ch ? `${ch.type} (${ch.accountName.substring(0, 10)})` : '알 수 없음',
            value: t._count.id,
            type: ch?.type || 'UNKNOWN',
        };
    }).sort((a, b) => b.value - a.value);
}

// 3. 성공률 (전체 + 채널별)
export async function getSuccessRate({ days }: StatsRange = { days: 30 }) {
    const userId = await getUserId();
    if (!userId) return { overall: 0, total: 0, byChannel: [] };
    
    const since = dayjs().subtract(days, 'day').toDate();
    
    const all = await prisma.scheduledTask.findMany({
        where: {
            campaign: { userId },
            executedAt: { gte: since },
            status: { in: ['SUCCESS', 'FAILED'] },
        },
        select: { status: true, channelId: true },
    });
    
    const successCount = all.filter(t => t.status === 'SUCCESS').length;
    const overall = all.length > 0 ? Math.round((successCount / all.length) * 100) : 0;
    
    // 채널별
    const channelGroups: Record<string, { success: number; total: number }> = {};
    for (const t of all) {
        if (!channelGroups[t.channelId]) channelGroups[t.channelId] = { success: 0, total: 0 };
        channelGroups[t.channelId].total++;
        if (t.status === 'SUCCESS') channelGroups[t.channelId].success++;
    }
    
    const channels = await prisma.marketingChannel.findMany({
        where: { id: { in: Object.keys(channelGroups) } },
        select: { id: true, type: true },
    });
    
    const byChannel = Object.entries(channelGroups).map(([id, stats]) => {
        const ch = channels.find(c => c.id === id);
        return {
            channelType: ch?.type || 'UNKNOWN',
            successRate: stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0,
            total: stats.total,
        };
    }).sort((a, b) => b.total - a.total);
    
    return { overall, total: all.length, byChannel };
}

// 4. 시간대별 분포 (0~23시)
export async function getHourlyDistribution({ days }: StatsRange = { days: 30 }) {
    const userId = await getUserId();
    if (!userId) return [];
    
    const since = dayjs().subtract(days, 'day').toDate();
    
    const tasks = await prisma.scheduledTask.findMany({
        where: {
            campaign: { userId },
            executedAt: { gte: since },
        },
        select: { executedAt: true },
    });
    
    const buckets = Array.from({ length: 24 }, (_, i) => ({
        hour: i.toString().padStart(2, '0') + '시',
        count: 0,
    }));
    
    for (const t of tasks) {
        if (!t.executedAt) continue;
        const h = dayjs(t.executedAt).hour();
        buckets[h].count++;
    }
    
    return buckets;
}

// ════════════════════════════════════════════════════════════
//  Phase 22 — 분석 강화 (Funnel · Cohort · Retention)
// ════════════════════════════════════════════════════════════

/**
 * 캠페인 발행 펀넬 — 작성 → 예약 → 발행 → 성공 단계별 전환율.
 */
export async function getCampaignFunnel({ days }: StatsRange = { days: 30 }) {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    const userId = session.user.id;
    const since = dayjs().subtract(days, 'day').toDate();

    const campaigns = await prisma.campaign.findMany({
        where: { userId, createdAt: { gte: since } },
        select: { id: true, status: true, tasks: { select: { status: true } } },
    });

    const created = campaigns.length;
    const scheduled = campaigns.filter(c => c.status === 'SCHEDULED' || c.tasks.length > 0).length;
    const published = campaigns.filter(c => c.tasks.some(t => t.status === 'SUCCESS' || t.status === 'FAILED')).length;
    const successful = campaigns.filter(c => c.tasks.some(t => t.status === 'SUCCESS')).length;

    return [
        { stage: '작성', count: created, percent: 100 },
        { stage: '예약', count: scheduled, percent: created > 0 ? Math.round((scheduled / created) * 100) : 0 },
        { stage: '발행 시도', count: published, percent: created > 0 ? Math.round((published / created) * 100) : 0 },
        { stage: '성공', count: successful, percent: created > 0 ? Math.round((successful / created) * 100) : 0 },
    ];
}

/**
 * 코호트 분석 — 시리즈 시작 주차별로 다음 주들의 active 비율.
 * 간단 버전: 주별 완성률 (completedPosts / totalPosts).
 */
export async function getSeriesCohort() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    const userId = session.user.id;

    // 최근 12주 시리즈
    const since = dayjs().subtract(12, 'week').toDate();
    const series = await prisma.campaignSeries.findMany({
        where: { userId, startAt: { gte: since } },
        select: {
            id: true, name: true, startAt: true, totalPosts: true, completedPosts: true, status: true,
        },
        orderBy: { startAt: 'desc' },
    });

    // 주별 그룹핑
    const cohorts = new Map<string, { week: string; series: number; avgCompletion: number }>();
    for (const s of series) {
        const week = dayjs(s.startAt).startOf('week').format('YYYY-MM-DD');
        const completion = s.totalPosts > 0 ? (s.completedPosts / s.totalPosts) * 100 : 0;
        const existing = cohorts.get(week);
        if (existing) {
            existing.series += 1;
            existing.avgCompletion = (existing.avgCompletion + completion) / 2;
        } else {
            cohorts.set(week, { week, series: 1, avgCompletion: completion });
        }
    }

    return Array.from(cohorts.values())
        .sort((a, b) => b.week.localeCompare(a.week))
        .map(c => ({ ...c, avgCompletion: Math.round(c.avgCompletion) }));
}

/**
 * 채널 retention — 채널이 처음 등록된 후 N일 동안 발행에 사용된 비율.
 */
export async function getChannelRetention() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    const userId = session.user.id;

    const channels = await prisma.marketingChannel.findMany({
        where: { userId },
        select: {
            id: true, type: true, accountName: true, createdAt: true, lastUsedAt: true,
            _count: { select: { scheduledTasks: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    return channels.map(c => {
        const daysSinceRegistered = dayjs().diff(c.createdAt, 'day');
        const daysSinceLastUse = c.lastUsedAt ? dayjs().diff(c.lastUsedAt, 'day') : null;
        const isActive = daysSinceLastUse !== null && daysSinceLastUse < 30;
        return {
            id: c.id,
            type: c.type,
            accountName: c.accountName,
            registeredDaysAgo: daysSinceRegistered,
            lastUsedDaysAgo: daysSinceLastUse,
            taskCount: c._count.scheduledTasks,
            isActive,
            // 활용률 = task 수 / 등록 후 경과 일 (일평균 발행)
            avgTasksPerDay: daysSinceRegistered > 0
                ? Math.round((c._count.scheduledTasks / daysSinceRegistered) * 10) / 10
                : 0,
        };
    });
}
