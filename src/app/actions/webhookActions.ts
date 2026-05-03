'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';

async function getSessionUser() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    return session.user;
}

function generateToken(): string {
    // 32자 hex (16바이트 random) — URL-safe, 충분히 unique
    return randomBytes(16).toString('hex');
}

export interface UserWebhookTokenSummary {
    id: string;
    label: string | null;
    enabled: boolean;
    /** 표시용 마스킹: 'abcd…1234' */
    masked: string;
    /** 생성/마지막 사용 */
    createdAt: Date;
    lastUsedAt: Date | null;
}

/** 사용자 토큰 목록 조회 — 평문 토큰은 발급 직후 1회만 노출됨. */
export async function listMyWebhookTokens(): Promise<{
    success: boolean;
    tokens?: UserWebhookTokenSummary[];
    error?: string;
}> {
    try {
        const user = await getSessionUser();
        const rows = await prisma.userWebhookToken.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
        });
        return {
            success: true,
            tokens: rows.map((r) => ({
                id: r.id,
                label: r.label,
                enabled: r.enabled,
                masked: r.token.slice(0, 4) + '…' + r.token.slice(-4),
                createdAt: r.createdAt,
                lastUsedAt: r.lastUsedAt,
            })),
        };
    } catch (e: any) {
        return { success: false, error: e?.message };
    }
}

/** 새 토큰 발급 — 평문은 1회만 반환 (DB에는 평문 저장하지만 UI에는 발급 직후만 보여줌). */
export async function createWebhookToken(label?: string): Promise<{
    success: boolean;
    token?: string;
    id?: string;
    error?: string;
}> {
    try {
        const user = await getSessionUser();
        // 한 사용자가 너무 많은 토큰 만드는 것 방지 (10개 상한)
        const count = await prisma.userWebhookToken.count({ where: { userId: user.id } });
        if (count >= 10) return { success: false, error: '토큰은 최대 10개까지 발급 가능합니다.' };

        const token = generateToken();
        const row = await prisma.userWebhookToken.create({
            data: {
                userId: user.id!,
                token,
                label: label?.trim() || null,
            },
        });
        revalidatePath('/dashboard/settings/webhooks');
        return { success: true, token, id: row.id };
    } catch (e: any) {
        return { success: false, error: e?.message };
    }
}

export async function toggleWebhookToken(id: string, enabled: boolean): Promise<{ success: boolean }> {
    const user = await getSessionUser();
    await prisma.userWebhookToken.updateMany({
        where: { id, userId: user.id },
        data: { enabled },
    });
    revalidatePath('/dashboard/settings/webhooks');
    return { success: true };
}

export async function deleteWebhookToken(id: string): Promise<{ success: boolean }> {
    const user = await getSessionUser();
    await prisma.userWebhookToken.deleteMany({
        where: { id, userId: user.id },
    });
    revalidatePath('/dashboard/settings/webhooks');
    return { success: true };
}
