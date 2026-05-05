'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

async function getSessionUser() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    return session.user;
}

/**
 * 헤더 벨 드롭다운용 — 최근 30개 + unread 카운트.
 */
export async function listMyNotifications() {
    const user = await getSessionUser();
    const [items, unread] = await Promise.all([
        prisma.notification.findMany({
            where: { userId: user.id! },
            orderBy: { createdAt: 'desc' },
            take: 30,
        }),
        prisma.notification.count({
            where: { userId: user.id!, readAt: null },
        }),
    ]);
    return {
        items: items.map(n => ({
            id: n.id,
            kind: n.kind,
            title: n.title,
            body: n.body,
            link: n.link,
            metadata: n.metadata,
            readAt: n.readAt?.toISOString() || null,
            createdAt: n.createdAt.toISOString(),
        })),
        unreadCount: unread,
    };
}

/**
 * unread 카운트만 — 헤더 배지 폴링용 (가벼움).
 */
export async function getUnreadNotificationCount(): Promise<number> {
    const session = await auth();
    if (!session?.user?.id) return 0;
    return prisma.notification.count({ where: { userId: session.user.id, readAt: null } });
}

export async function markNotificationRead(id: string): Promise<{ ok: boolean }> {
    const user = await getSessionUser();
    await prisma.notification.updateMany({
        where: { id, userId: user.id! },
        data: { readAt: new Date() },
    });
    revalidatePath('/dashboard');
    return { ok: true };
}

export async function markAllNotificationsRead(): Promise<{ ok: boolean; count: number }> {
    const user = await getSessionUser();
    const r = await prisma.notification.updateMany({
        where: { userId: user.id!, readAt: null },
        data: { readAt: new Date() },
    });
    revalidatePath('/dashboard');
    return { ok: true, count: r.count };
}

export async function deleteNotification(id: string): Promise<{ ok: boolean }> {
    const user = await getSessionUser();
    await prisma.notification.deleteMany({ where: { id, userId: user.id! } });
    revalidatePath('/dashboard');
    return { ok: true };
}

/**
 * Phase 37 — 알림 페이지 강화: 필터·검색·페이지네이션 지원.
 */
export async function listMyNotificationsPaged(input: {
    kind?: string;
    q?: string;
    unreadOnly?: boolean;
    page?: number;
    pageSize?: number;
}) {
    const user = await getSessionUser();
    const page = Math.max(1, input.page || 1);
    const pageSize = Math.min(100, Math.max(10, input.pageSize || 30));

    const where: any = { userId: user.id! };
    if (input.kind) where.kind = input.kind;
    if (input.unreadOnly) where.readAt = null;
    if (input.q?.trim()) {
        const q = input.q.trim();
        where.OR = [
            { title: { contains: q, mode: 'insensitive' } },
            { body: { contains: q, mode: 'insensitive' } },
        ];
    }

    const [items, total, unread, kindCounts] = await Promise.all([
        prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({ where: { userId: user.id!, readAt: null } }),
        prisma.notification.groupBy({
            by: ['kind'],
            where: { userId: user.id! },
            _count: { _all: true },
        }),
    ]);

    return {
        items: items.map(n => ({
            id: n.id,
            kind: n.kind,
            title: n.title,
            body: n.body,
            link: n.link,
            readAt: n.readAt?.toISOString() || null,
            createdAt: n.createdAt.toISOString(),
        })),
        total,
        unread,
        page,
        pageSize,
        pageCount: Math.max(1, Math.ceil(total / pageSize)),
        kindCounts: Object.fromEntries(kindCounts.map(k => [k.kind, k._count._all])),
    };
}

/**
 * Phase 37 — 특정 kind 의 알림만 모두 읽음.
 */
export async function markKindNotificationsRead(kind: string): Promise<{ ok: boolean; count: number }> {
    const user = await getSessionUser();
    const r = await prisma.notification.updateMany({
        where: { userId: user.id!, readAt: null, kind: kind as any },
        data: { readAt: new Date() },
    });
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/notifications');
    return { ok: true, count: r.count };
}
