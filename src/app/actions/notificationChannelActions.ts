'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

async function getSessionUser() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    return session.user;
}

export async function listMyNotificationChannels() {
    const user = await getSessionUser();
    return prisma.userNotificationChannel.findMany({
        where: { userId: user.id! },
        orderBy: { createdAt: 'desc' },
    });
}

export async function createNotificationChannel(input: {
    type: 'SLACK' | 'DISCORD';
    webhookUrl: string;
    label?: string;
}) {
    const user = await getSessionUser();
    if (!input.webhookUrl?.startsWith('https://')) {
        throw new Error('webhook URL 은 https:// 로 시작해야 합니다');
    }
    // 간단 검증
    const isSlack = input.webhookUrl.includes('hooks.slack.com');
    const isDiscord = input.webhookUrl.includes('discord.com/api/webhooks') || input.webhookUrl.includes('discordapp.com/api/webhooks');
    if (input.type === 'SLACK' && !isSlack) throw new Error('Slack webhook URL 형식이 아닙니다');
    if (input.type === 'DISCORD' && !isDiscord) throw new Error('Discord webhook URL 형식이 아닙니다');

    const ch = await prisma.userNotificationChannel.create({
        data: {
            userId: user.id!,
            type: input.type,
            webhookUrl: input.webhookUrl.trim(),
            label: input.label?.trim() || undefined,
        },
    });
    revalidatePath('/dashboard/settings/notifications');
    return ch;
}

export async function toggleNotificationChannel(id: string, enabled: boolean) {
    const user = await getSessionUser();
    await prisma.userNotificationChannel.updateMany({
        where: { id, userId: user.id! },
        data: { enabled },
    });
    revalidatePath('/dashboard/settings/notifications');
    return { ok: true };
}

export async function deleteNotificationChannel(id: string) {
    const user = await getSessionUser();
    await prisma.userNotificationChannel.deleteMany({ where: { id, userId: user.id! } });
    revalidatePath('/dashboard/settings/notifications');
    return { ok: true };
}

/**
 * Phase 27 — 채널의 kind 필터 업데이트.
 * null = 모든 종류 발송 / [...kinds] = 화이트리스트.
 */
export async function updateChannelKindFilter(input: {
    id: string;
    kinds: string[] | null;
}): Promise<{ ok: boolean }> {
    const user = await getSessionUser();
    await prisma.userNotificationChannel.updateMany({
        where: { id: input.id, userId: user.id! },
        data: { kindFilter: input.kinds === null ? null : (input.kinds as any) },
    });
    revalidatePath('/dashboard/settings/notifications');
    return { ok: true };
}

/**
 * 테스트 발송 — 등록 직후 작동 확인용.
 */
export async function testNotificationChannel(id: string): Promise<{ ok: boolean; error?: string }> {
    const user = await getSessionUser();
    const ch = await prisma.userNotificationChannel.findFirst({
        where: { id, userId: user.id! },
    });
    if (!ch) return { ok: false, error: '채널을 찾을 수 없습니다' };

    try {
        const message = ch.type === 'SLACK'
            ? { text: '🔔 *마케팅봇 테스트 알림*\n연동이 정상 작동합니다!' }
            : {
                embeds: [{
                    title: '🔔 마케팅봇 테스트 알림',
                    description: '연동이 정상 작동합니다!',
                    color: 0x7c3aed,
                }],
            };

        const res = await fetch(ch.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message),
        });
        if (!res.ok) return { ok: false, error: `webhook 응답 ${res.status}` };
        return { ok: true };
    } catch (e: any) {
        return { ok: false, error: e?.message || '발송 실패' };
    }
}
