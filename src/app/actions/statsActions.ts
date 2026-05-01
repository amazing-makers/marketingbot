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
