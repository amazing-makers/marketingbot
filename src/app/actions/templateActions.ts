'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getActiveWorkspaceFilter } from '@/lib/workspace/scope';

async function getSessionUser() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    return session.user;
}

export async function listMyTemplates() {
    const user = await getSessionUser();
    const filter = await getActiveWorkspaceFilter(user.id!);
    return prisma.captionTemplate.findMany({
        where: { userId: filter.userId, workspaceId: filter.workspaceId },
        orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }],
    });
}

export async function createTemplate(input: {
    name: string;
    body: string;
    hashtags?: string;
    category?: string;
}) {
    const user = await getSessionUser();
    const filter = await getActiveWorkspaceFilter(user.id!);
    if (!input.name?.trim() || !input.body?.trim()) {
        throw new Error('이름과 본문은 필수입니다');
    }

    const t = await prisma.captionTemplate.create({
        data: {
            userId: user.id!,
            workspaceId: filter.workspaceId,
            name: input.name.trim(),
            body: input.body.trim(),
            hashtags: input.hashtags?.trim() || undefined,
            category: input.category?.trim() || undefined,
        },
    });
    revalidatePath('/dashboard/library');
    return t;
}

export async function updateTemplate(input: {
    id: string;
    name?: string;
    body?: string;
    hashtags?: string;
    category?: string;
}) {
    const user = await getSessionUser();
    const t = await prisma.captionTemplate.findFirst({
        where: { id: input.id, userId: user.id! },
        select: { id: true },
    });
    if (!t) throw new Error('템플릿을 찾을 수 없습니다');

    const data: any = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.body !== undefined) data.body = input.body.trim();
    if (input.hashtags !== undefined) data.hashtags = input.hashtags.trim() || null;
    if (input.category !== undefined) data.category = input.category.trim() || null;

    await prisma.captionTemplate.update({ where: { id: input.id }, data });
    revalidatePath('/dashboard/library');
    return { ok: true };
}

export async function deleteTemplate(id: string) {
    const user = await getSessionUser();
    await prisma.captionTemplate.deleteMany({ where: { id, userId: user.id! } });
    revalidatePath('/dashboard/library');
    return { ok: true };
}

/**
 * 템플릿 사용 마킹 — usageCount 증가 + lastUsedAt 갱신.
 * 캠페인 작성 시 "이 템플릿 사용" 버튼 클릭 시 호출.
 */
export async function markTemplateUsed(id: string) {
    const user = await getSessionUser();
    await prisma.captionTemplate.updateMany({
        where: { id, userId: user.id! },
        data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
    });
    return { ok: true };
}
