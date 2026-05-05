/**
 * Phase 24 — 외부 채팅 채널 알림 (Slack / Discord webhook).
 *
 * createNotification 헬퍼 안에서 인앱·푸시와 동시에 호출.
 * 사용자가 등록한 webhook URL 들에 메시지 발송.
 */

import { prisma } from '@/lib/prisma';

export interface ExternalNotificationPayload {
    title: string;
    body?: string;
    link?: string;
    kind?: string;
}

export async function sendExternalNotifications(userId: string, payload: ExternalNotificationPayload): Promise<void> {
    const channels = await prisma.userNotificationChannel.findMany({
        where: { userId, enabled: true },
    });
    if (channels.length === 0) return;

    await Promise.all(channels.map(async (ch) => {
        // kindFilter 가 설정되어 있으면 필터링
        if (ch.kindFilter && payload.kind) {
            const allowed = (ch.kindFilter as any) as string[];
            if (Array.isArray(allowed) && !allowed.includes(payload.kind)) return;
        }

        try {
            const message = ch.type === 'SLACK'
                ? buildSlackMessage(payload)
                : buildDiscordMessage(payload);

            const res = await fetch(ch.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(message),
            });

            if (res.ok) {
                prisma.userNotificationChannel.update({
                    where: { id: ch.id },
                    data: { lastUsedAt: new Date() },
                }).catch(() => {});
            } else {
                console.warn('[external notify] non-200', { type: ch.type, status: res.status });
            }
        } catch (e) {
            console.warn('[external notify] failed', { type: ch.type }, e);
        }
    }));
}

function buildSlackMessage(p: ExternalNotificationPayload) {
    const text = p.body ? `*${p.title}*\n${p.body}` : `*${p.title}*`;
    return {
        text,
        blocks: [
            {
                type: 'section',
                text: { type: 'mrkdwn', text },
            },
            ...(p.link
                ? [{
                    type: 'actions',
                    elements: [{
                        type: 'button',
                        text: { type: 'plain_text', text: '대시보드에서 보기' },
                        url: p.link.startsWith('http') ? p.link : `https://marketingbot.amakers.co.kr${p.link}`,
                    }],
                }]
                : []),
        ],
    };
}

function buildDiscordMessage(p: ExternalNotificationPayload) {
    const baseUrl = 'https://marketingbot.amakers.co.kr';
    const fullLink = p.link?.startsWith('http') ? p.link : (p.link ? `${baseUrl}${p.link}` : null);
    return {
        embeds: [{
            title: p.title,
            description: p.body || '',
            color: 0x7c3aed, // violet
            url: fullLink,
            footer: { text: 'MarketingBot · amakers' },
            timestamp: new Date().toISOString(),
        }],
    };
}
