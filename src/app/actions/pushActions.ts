'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

async function getSessionUser() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    return session.user;
}

/**
 * 클라이언트의 PushSubscription 객체를 받아 DB에 저장.
 * 같은 endpoint 가 이미 있으면 업데이트.
 */
export async function savePushSubscription(input: {
    endpoint: string;
    p256dh: string;
    authKey: string;
    userAgent?: string;
}): Promise<{ ok: boolean }> {
    const user = await getSessionUser();
    if (!input.endpoint || !input.p256dh || !input.authKey) {
        throw new Error('잘못된 구독 정보');
    }

    await prisma.pushSubscription.upsert({
        where: { endpoint: input.endpoint },
        update: {
            userId: user.id!,
            p256dh: input.p256dh,
            authKey: input.authKey,
            userAgent: input.userAgent,
            lastUsed: new Date(),
        },
        create: {
            userId: user.id!,
            endpoint: input.endpoint,
            p256dh: input.p256dh,
            authKey: input.authKey,
            userAgent: input.userAgent,
        },
    });

    return { ok: true };
}

/**
 * 구독 해제 — 디바이스에서 unsubscribe 후 호출.
 */
export async function deletePushSubscription(endpoint: string): Promise<{ ok: boolean }> {
    const user = await getSessionUser();
    await prisma.pushSubscription.deleteMany({
        where: { endpoint, userId: user.id! },
    });
    return { ok: true };
}

/**
 * VAPID 공개키 조회 (클라이언트 구독 시 필요).
 * 환경변수: NEXT_PUBLIC_VAPID_PUBLIC_KEY (또는 클라에서 직접 사용)
 */
export async function getVapidPublicKey(): Promise<string | null> {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
}
