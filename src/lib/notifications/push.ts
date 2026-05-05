/**
 * Phase 23 — Web Push 발송 통합.
 *
 * createNotification 헬퍼 안에서 자동 호출되어 인앱 + Web Push 동시 처리.
 * VAPID 키 미설정 시 자동 skip (이메일·인앱은 계속 작동).
 */

import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

let configured = false;

function configure() {
    if (configured) return true;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:help@amakers.co.kr';

    if (!publicKey || !privateKey) return false;

    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
    return true;
}

export interface PushPayload {
    title: string;
    body?: string;
    link?: string;
    kind?: string;
}

/**
 * 사용자의 모든 디바이스에 Web Push 발송. 만료된 구독은 자동 정리.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!configure()) return; // VAPID 키 없으면 skip

    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    if (subs.length === 0) return;

    const data = JSON.stringify(payload);

    await Promise.all(subs.map(async (sub) => {
        try {
            await webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.authKey },
                },
                data,
            );
            // lastUsed 업데이트 (성공 시)
            prisma.pushSubscription.update({
                where: { id: sub.id },
                data: { lastUsed: new Date() },
            }).catch(() => {});
        } catch (e: any) {
            const code = e?.statusCode;
            if (code === 404 || code === 410) {
                // 구독 만료 — 정리
                prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
            } else {
                console.warn('[push] send failed', { userId, endpoint: sub.endpoint.slice(0, 50), code }, e?.message);
            }
        }
    }));
}
