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
