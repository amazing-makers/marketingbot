/**
 * Phase 24 — ActivityLog 헬퍼.
 *
 * 워크스페이스 내 활동 기록 — 캠페인 생성·발행 등 협업 시 추적.
 * 워크스페이스 컨텍스트 자동 추출.
 */

import { prisma } from '@/lib/prisma';

export type ActivityKind =
    | 'CAMPAIGN_CREATED'
    | 'CAMPAIGN_PUBLISHED'
    | 'CHANNEL_ADDED'
    | 'SERIES_STARTED'
    | 'SERIES_COMPLETED'
    | 'CLIENT_ADDED'
    | 'INVOICE_CREATED'
    | 'TEMPLATE_CREATED'
    | 'INVOICE_PAID';

export interface LogActivityInput {
    userId: string;
    workspaceId?: string | null;
    kind: ActivityKind;
    title: string;
    body?: string;
    link?: string;
    metadata?: Record<string, any>;
}

export async function logActivity(input: LogActivityInput): Promise<void> {
    try {
        // workspaceId 미지정 시 사용자의 currentWorkspaceId 자동 사용
        let wsId = input.workspaceId;
        if (wsId === undefined) {
            const u = await prisma.user.findUnique({
                where: { id: input.userId },
                select: { currentWorkspaceId: true },
            });
            wsId = u?.currentWorkspaceId ?? null;
        }

        await prisma.activityLog.create({
            data: {
                userId: input.userId,
                workspaceId: wsId,
                kind: input.kind,
                title: input.title,
                body: input.body,
                link: input.link,
                metadata: (input.metadata as any) || undefined,
            },
        });

        // Phase 26 — 워크스페이스 멤버에게 자동 인앱 알림 (행위자 본인 제외)
        if (wsId) {
            notifyWorkspaceMembers({
                workspaceId: wsId,
                actorUserId: input.userId,
                kind: input.kind,
                title: input.title,
                body: input.body,
                link: input.link,
            }).catch(e => console.warn('[activity] notify failed', e));
        }
    } catch (e) {
        console.warn('[activity] log failed', { userId: input.userId, kind: input.kind }, e);
    }
}

async function notifyWorkspaceMembers(input: {
    workspaceId: string;
    actorUserId: string;
    kind: ActivityKind;
    title: string;
    body?: string;
    link?: string;
}): Promise<void> {
    const members = await prisma.workspaceMember.findMany({
        where: {
            workspaceId: input.workspaceId,
            userId: { not: input.actorUserId },
        },
        select: { userId: true },
    });
    if (members.length === 0) return;

    const actor = await prisma.user.findUnique({
        where: { id: input.actorUserId },
        select: { name: true, email: true },
    });
    const actorName = actor?.name || actor?.email?.split('@')[0] || '누군가';

    const { createNotificationDedup } = await import('@/lib/notifications/create');

    await Promise.all(members.map(m => createNotificationDedup({
        userId: m.userId,
        kind: 'SYSTEM',
        title: `${actorName} 님: ${input.title}`,
        body: input.body,
        link: input.link,
        metadata: { workspaceId: input.workspaceId, actorUserId: input.actorUserId, activityKind: input.kind },
    }, 1).catch(() => {})));
}
