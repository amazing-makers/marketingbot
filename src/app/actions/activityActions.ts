'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getActiveWorkspaceFilter } from '@/lib/workspace/scope';

async function getSessionUser() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    return session.user;
}

/**
 * 활성 워크스페이스의 최근 활동 (모든 멤버 통합).
 * 개인 모드면 본인 활동만.
 */
export async function listWorkspaceActivities(limit: number = 50) {
    const user = await getSessionUser();
    const filter = await getActiveWorkspaceFilter(user.id!);

    const where = filter.workspaceId
        ? { workspaceId: filter.workspaceId }                  // 워크스페이스 모든 멤버
        : { userId: filter.userId, workspaceId: null };        // 개인 본인만

    const activities = await prisma.activityLog.findMany({
        where,
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 200),
    });

    return activities;
}
