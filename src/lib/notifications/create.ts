/**
 * Phase 20 — 인앱 알림 생성 헬퍼.
 *
 * 다양한 server action 에서 호출되어 사용자에게 인앱 알림 발송.
 * 이메일과 동시에 발생 (이메일은 별도 send 호출).
 */

import { prisma } from '@/lib/prisma';

export type NotificationKind =
    | 'REFERRAL_NEW'
    | 'COMMISSION_NEW'
    | 'TIER_UPGRADE'
    | 'WORKSPACE_INVITE'
    | 'SERIES_COMPLETE'
    | 'SYSTEM';

export interface CreateNotificationInput {
    userId: string;
    kind: NotificationKind;
    title: string;
    body?: string;
    link?: string;
    metadata?: Record<string, any>;
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
    try {
        await prisma.notification.create({
            data: {
                userId: input.userId,
                kind: input.kind,
                title: input.title,
                body: input.body,
                link: input.link,
                metadata: (input.metadata as any) || undefined,
            },
        });
    } catch (e) {
        console.warn('[notification] create failed', { userId: input.userId, kind: input.kind }, e);
    }

    // Phase 23 — Web Push 동시 발송 (VAPID 키 없으면 자동 skip)
    try {
        const { sendPushToUser } = await import('./push');
        await sendPushToUser(input.userId, {
            title: input.title,
            body: input.body,
            link: input.link,
            kind: input.kind,
        });
    } catch (e) {
        // push 실패는 차단 안 함
        console.warn('[notification] push send failed', e);
    }
}

/**
 * 같은 사용자에게 같은 종류의 unread 알림이 이미 있으면 건너뜀 (스팸 방지).
 * 매월 1일 commission cron 에서 사용 — 이전 사이클 unread 가 있으면 새로 안 만듦.
 */
export async function createNotificationDedup(input: CreateNotificationInput, withinHours: number = 24): Promise<void> {
    const since = new Date(Date.now() - withinHours * 60 * 60 * 1000);
    const existing = await prisma.notification.findFirst({
        where: {
            userId: input.userId,
            kind: input.kind,
            readAt: null,
            createdAt: { gte: since },
        },
        select: { id: true },
    });
    if (existing) return; // 중복 — skip
    await createNotification(input);
}
