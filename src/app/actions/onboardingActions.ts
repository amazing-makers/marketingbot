'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { INDUSTRY_PRESETS, INDUSTRY_LIST } from '@/lib/onboarding/industry-presets';

async function getSessionUser() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    return session.user;
}

/**
 * Phase 42 — 업종 프리셋 적용.
 * 사용자 선택한 업종에 맞는 캡션 템플릿 3개 자동 등록.
 * 이미 같은 이름 템플릿이 있으면 skip (중복 방지).
 */
export async function applyIndustryPreset(industryId: string): Promise<{
    ok: boolean;
    industry: string;
    templatesCreated: number;
}> {
    const user = await getSessionUser();
    const preset = INDUSTRY_PRESETS[industryId];
    if (!preset) throw new Error(`알 수 없는 업종: ${industryId}`);

    // 이미 등록된 템플릿 이름 조회 (중복 회피)
    const existing = await prisma.captionTemplate.findMany({
        where: { userId: user.id! },
        select: { name: true },
    });
    const existingNames = new Set(existing.map(t => t.name));

    let created = 0;
    for (const tpl of preset.templates) {
        if (existingNames.has(tpl.name)) continue;
        await prisma.captionTemplate.create({
            data: {
                userId: user.id!,
                name: tpl.name,
                body: tpl.body,
                hashtags: tpl.hashtags,
                category: tpl.category,
            },
        });
        created++;
    }

    // 사용자 emailPreferences 에 industry 저장 (스키마 변경 없이)
    const u = await prisma.user.findUnique({
        where: { id: user.id! },
        select: { emailPreferences: true },
    });
    const prefs = (u?.emailPreferences as any) || {};
    await prisma.user.update({
        where: { id: user.id! },
        data: {
            emailPreferences: { ...prefs, industry: industryId } as any,
        },
    });

    revalidatePath('/dashboard/library');
    revalidatePath('/dashboard');

    return { ok: true, industry: preset.label, templatesCreated: created };
}

/**
 * Phase 42 — 사용자의 저장된 industry 조회.
 */
export async function getMyIndustry(): Promise<string | null> {
    const user = await getSessionUser();
    const u = await prisma.user.findUnique({
        where: { id: user.id! },
        select: { emailPreferences: true },
    });
    const prefs = (u?.emailPreferences as any) || {};
    return prefs.industry || null;
}

export async function listIndustries() {
    return INDUSTRY_LIST.map(p => ({
        id: p.id,
        label: p.label,
        emoji: p.emoji,
        description: p.description,
        recommendedChannels: p.recommendedChannels,
        recommendedFrequency: p.recommendedFrequency,
    }));
}
