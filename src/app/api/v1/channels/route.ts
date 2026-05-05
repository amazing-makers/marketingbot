import { authenticateApi, jsonOk } from '@/lib/api/v1-auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET /api/v1/channels
 * 사용자의 채널 목록 (활성 워크스페이스 기준, 자격증명 제외).
 */
export async function GET(req: Request) {
    const auth = await authenticateApi(req);
    if (auth instanceof NextResponse) return auth;

    const u = await prisma.user.findUnique({ where: { id: auth.userId }, select: { currentWorkspaceId: true } });

    const channels = await prisma.marketingChannel.findMany({
        where: { userId: auth.userId, workspaceId: u?.currentWorkspaceId ?? null },
        select: {
            id: true,
            type: true,
            accountName: true,
            status: true,
            region: true,
            language: true,
            lastUsedAt: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    return jsonOk({
        channels: channels.map(c => ({
            id: c.id,
            type: c.type,
            accountName: c.accountName,
            status: c.status,
            region: c.region,
            language: c.language,
            lastUsedAt: c.lastUsedAt?.toISOString() || null,
            createdAt: c.createdAt.toISOString(),
        })),
        count: channels.length,
    });
}
