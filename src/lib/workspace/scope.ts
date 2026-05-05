/**
 * Phase 18 — 워크스페이스 데이터 격리 헬퍼.
 *
 * User.currentWorkspaceId 가 set 되어 있으면 그 워크스페이스 데이터만 조회/저장.
 * null 이면 "개인 작업" 컨텍스트 — workspaceId IS NULL 인 데이터만.
 *
 * 모든 list/create server action 에서 사용:
 *   const filter = await getActiveWorkspaceFilter(userId);
 *   prisma.channel.findMany({ where: filter });
 */

import { prisma } from '@/lib/prisma';

export interface WorkspaceFilter {
    userId: string;
    workspaceId: string | null;
}

/**
 * 현재 활성 워크스페이스 컨텍스트 — 조회/생성 시 동일하게 사용.
 */
export async function getActiveWorkspaceFilter(userId: string): Promise<WorkspaceFilter> {
    const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { currentWorkspaceId: true },
    });

    const workspaceId = u?.currentWorkspaceId ?? null;

    // currentWorkspaceId 가 있어도 멤버십 검증
    if (workspaceId) {
        const m = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId } },
            select: { role: true },
        });
        if (!m) {
            // 멤버 아님 → 개인 모드로 강등 + currentWorkspaceId 정리
            await prisma.user.update({
                where: { id: userId },
                data: { currentWorkspaceId: null },
            });
            return { userId, workspaceId: null };
        }
    }

    return { userId, workspaceId };
}

/**
 * Prisma where 절에 workspaceId 조건 적용 (null 도 명시적으로 처리).
 *
 * 사용법:
 *   const where = withWorkspaceScope({ status: 'ACTIVE' }, filter);
 */
export function withWorkspaceScope<T extends Record<string, any>>(
    where: T,
    filter: WorkspaceFilter,
): T & { userId: string; workspaceId: string | null } {
    return {
        ...where,
        userId: filter.userId,
        workspaceId: filter.workspaceId,
    };
}
