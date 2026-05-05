import { authenticateApi, jsonOk } from '@/lib/api/v1-auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET /api/v1/series?status=RUNNING
 * 자동 발행 시리즈 목록.
 */
export async function GET(req: Request) {
    const auth = await authenticateApi(req);
    if (auth instanceof NextResponse) return auth;

    const url = new URL(req.url);
    const status = url.searchParams.get('status') || undefined;

    const u = await prisma.user.findUnique({ where: { id: auth.userId }, select: { currentWorkspaceId: true } });

    const series = await prisma.campaignSeries.findMany({
        where: {
            userId: auth.userId,
            workspaceId: u?.currentWorkspaceId ?? null,
            ...(status ? { status } : {}),
        },
        select: {
            id: true,
            name: true,
            mode: true,
            captionStyle: true,
            contentCategory: true,
            scheduleType: true,
            status: true,
            totalPosts: true,
            completedPosts: true,
            failedPosts: true,
            startAt: true,
            endAt: true,
            nextRunAt: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    return jsonOk({
        series: series.map(s => ({
            id: s.id,
            name: s.name,
            mode: s.mode,
            captionStyle: s.captionStyle,
            contentCategory: s.contentCategory,
            scheduleType: s.scheduleType,
            status: s.status,
            totalPosts: s.totalPosts,
            completedPosts: s.completedPosts,
            failedPosts: s.failedPosts,
            startAt: s.startAt.toISOString(),
            endAt: s.endAt?.toISOString() || null,
            nextRunAt: s.nextRunAt?.toISOString() || null,
            createdAt: s.createdAt.toISOString(),
        })),
        count: series.length,
    });
}
