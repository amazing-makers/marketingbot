'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export interface SearchHit {
    type: 'campaign' | 'series' | 'channel';
    id: string;
    label: string;
    sublabel: string;
    href: string;
}

/**
 * Phase 32 — 글로벌 검색 (Cmd+K 동적 결과).
 * 캠페인 이름 / 시리즈 이름 / 채널 계정명 부분 일치.
 * 각 타입당 최대 5개 → 총 15개 상한.
 */
export async function globalSearch(query: string): Promise<SearchHit[]> {
    const session = await auth();
    if (!session?.user?.id) return [];
    const userId = session.user.id;

    const q = query.trim();
    if (q.length < 1) return [];

    const [campaigns, series, channels] = await Promise.all([
        prisma.campaign.findMany({
            where: {
                userId,
                name: { contains: q, mode: 'insensitive' },
            },
            select: { id: true, name: true, status: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 5,
        }),
        prisma.campaignSeries.findMany({
            where: {
                userId,
                name: { contains: q, mode: 'insensitive' },
            },
            select: { id: true, name: true, status: true, completedPosts: true, totalPosts: true },
            orderBy: { createdAt: 'desc' },
            take: 5,
        }),
        prisma.marketingChannel.findMany({
            where: {
                userId,
                accountName: { contains: q, mode: 'insensitive' },
            },
            select: { id: true, accountName: true, type: true, status: true },
            take: 5,
        }),
    ]);

    const hits: SearchHit[] = [];

    for (const c of campaigns) {
        hits.push({
            type: 'campaign',
            id: c.id,
            label: c.name,
            sublabel: `📋 캠페인 · ${c.status}`,
            href: `/dashboard/campaigns/${c.id}`,
        });
    }
    for (const s of series) {
        hits.push({
            type: 'series',
            id: s.id,
            label: s.name,
            sublabel: `🔁 시리즈 · ${s.status} · ${s.completedPosts}/${s.totalPosts}`,
            href: `/dashboard/campaigns/series/${s.id}`,
        });
    }
    for (const ch of channels) {
        hits.push({
            type: 'channel',
            id: ch.id,
            label: ch.accountName,
            sublabel: `🌐 ${ch.type} · ${ch.status}`,
            href: `/dashboard/channels`,
        });
    }

    return hits;
}
