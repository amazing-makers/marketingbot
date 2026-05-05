import { authenticateApi, jsonOk } from '@/lib/api/v1-auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET /api/v1/campaigns?limit=50&status=SCHEDULED
 * 사용자의 캠페인 목록 (활성 워크스페이스 기준).
 */
export async function GET(req: Request) {
    const auth = await authenticateApi(req);
    if (auth instanceof NextResponse) return auth;

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || '50'), 200);
    const status = url.searchParams.get('status') || undefined;

    // 활성 워크스페이스
    const u = await prisma.user.findUnique({ where: { id: auth.userId }, select: { currentWorkspaceId: true } });

    const campaigns = await prisma.campaign.findMany({
        where: {
            userId: auth.userId,
            workspaceId: u?.currentWorkspaceId ?? null,
            ...(status ? { status } : {}),
        },
        select: {
            id: true,
            name: true,
            description: true,
            status: true,
            scheduledAt: true,
            completedAt: true,
            createdAt: true,
            seriesId: true,
            _count: { select: { tasks: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });

    return jsonOk({
        campaigns: campaigns.map(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
            status: c.status,
            scheduledAt: c.scheduledAt?.toISOString() || null,
            completedAt: c.completedAt?.toISOString() || null,
            createdAt: c.createdAt.toISOString(),
            seriesId: c.seriesId,
            taskCount: c._count.tasks,
        })),
        count: campaigns.length,
        limit,
    });
}
