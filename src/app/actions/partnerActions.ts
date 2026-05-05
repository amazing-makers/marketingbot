'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

async function getSessionUser() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    return session.user;
}

async function getMyReseller() {
    const user = await getSessionUser();
    const reseller = await prisma.reseller.findUnique({ where: { userId: user.id! } });
    if (!reseller) throw new Error('파트너로 등록되어 있지 않습니다');
    if (reseller.status !== 'ACTIVE') throw new Error('정지된 파트너 계정입니다');
    return { user, reseller };
}

function slugify(input: string): string {
    return input
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^\w\s가-힣-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 40)
        || 'client';
}

/**
 * 새 고객사 등록 — 자동으로 워크스페이스도 1개 생성하고 1:1 매핑.
 * 호출 파트너가 자동으로 OWNER 가 됨.
 */
export async function createPartnerClient(input: {
    clientName: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    industry?: string;
    monthlyFee?: number;
    notes?: string;
    brandColor?: string;
}): Promise<{ id: string; workspaceId: string; workspaceSlug: string }> {
    const { user, reseller } = await getMyReseller();
    if (!input.clientName?.trim()) throw new Error('고객사 이름을 입력하세요');

    // slug 결정 (워크스페이스용)
    const baseSlug = slugify(input.clientName);
    let slug = baseSlug;
    let i = 2;
    while (i < 100 && (await prisma.workspace.findUnique({ where: { slug } }))) {
        slug = `${baseSlug}-${i++}`;
    }

    const result = await prisma.$transaction(async (tx) => {
        // 1. 워크스페이스 생성 (파트너가 owner)
        const ws = await tx.workspace.create({
            data: {
                name: input.clientName.trim(),
                slug,
                ownerId: user.id!,
                description: input.notes?.trim() || undefined,
                brandColor: input.brandColor || '#7C3AED',
                members: {
                    create: { userId: user.id!, role: 'OWNER' },
                },
            },
        });

        // 2. PartnerClient 매핑 생성
        const pc = await tx.partnerClient.create({
            data: {
                partnerId: reseller.id,
                workspaceId: ws.id,
                clientName: input.clientName.trim(),
                contactName: input.contactName?.trim(),
                contactEmail: input.contactEmail?.trim(),
                contactPhone: input.contactPhone?.trim(),
                industry: input.industry?.trim(),
                monthlyFee: input.monthlyFee,
                notes: input.notes?.trim(),
            },
        });

        return { id: pc.id, workspaceId: ws.id, workspaceSlug: ws.slug };
    });

    revalidatePath('/dashboard/partner');
    return result;
}

/**
 * 내 고객사 목록 + 각 워크스페이스의 채널·캠페인 수.
 */
export async function listMyPartnerClients() {
    const { reseller } = await getMyReseller();

    const clients = await prisma.partnerClient.findMany({
        where: { partnerId: reseller.id },
        include: {
            workspace: {
                include: {
                    _count: { select: { members: true } },
                },
            },
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    // 각 워크스페이스의 채널·캠페인 카운트 (현재는 user.id 기반이라 owner.id 의 데이터로 추정)
    // TODO: 향후 channel/campaign 에 workspaceId 추가 시 정확한 카운트로 교체
    return clients.map(c => ({
        id: c.id,
        clientName: c.clientName,
        contactName: c.contactName,
        contactEmail: c.contactEmail,
        contactPhone: c.contactPhone,
        industry: c.industry,
        monthlyFee: c.monthlyFee,
        status: c.status as 'ACTIVE' | 'PAUSED' | 'CHURNED',
        notes: c.notes,
        startedAt: c.startedAt,
        endedAt: c.endedAt,
        workspace: {
            id: c.workspace.id,
            name: c.workspace.name,
            slug: c.workspace.slug,
            brandColor: c.workspace.brandColor,
            memberCount: c.workspace._count.members,
        },
    }));
}

/**
 * 고객사 상태 변경 (ACTIVE / PAUSED / CHURNED).
 */
export async function updatePartnerClientStatus(input: {
    clientId: string;
    status: 'ACTIVE' | 'PAUSED' | 'CHURNED';
}): Promise<{ ok: boolean }> {
    const { reseller } = await getMyReseller();
    const c = await prisma.partnerClient.findUnique({ where: { id: input.clientId }, select: { partnerId: true } });
    if (!c || c.partnerId !== reseller.id) throw new Error('권한 없음');

    await prisma.partnerClient.update({
        where: { id: input.clientId },
        data: {
            status: input.status,
            endedAt: input.status === 'CHURNED' ? new Date() : null,
        },
    });
    revalidatePath('/dashboard/partner');
    return { ok: true };
}

/**
 * 고객사 정보 업데이트 (연락처·월 관리비·메모 등).
 */
export async function updatePartnerClient(input: {
    clientId: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    industry?: string;
    monthlyFee?: number;
    notes?: string;
}): Promise<{ ok: boolean }> {
    const { reseller } = await getMyReseller();
    const c = await prisma.partnerClient.findUnique({ where: { id: input.clientId }, select: { partnerId: true } });
    if (!c || c.partnerId !== reseller.id) throw new Error('권한 없음');

    await prisma.partnerClient.update({
        where: { id: input.clientId },
        data: {
            contactName: input.contactName?.trim(),
            contactEmail: input.contactEmail?.trim(),
            contactPhone: input.contactPhone?.trim(),
            industry: input.industry?.trim(),
            monthlyFee: input.monthlyFee,
            notes: input.notes?.trim(),
        },
    });
    revalidatePath('/dashboard/partner');
    return { ok: true };
}

/**
 * 활성 워크스페이스를 해당 고객사로 전환 (= 파트너가 그 고객사 컨텍스트로 진입).
 * User.currentWorkspaceId 를 갱신해서 이후 채널·캠페인 작업이 그 워크스페이스 안에서 일어나도록.
 */
export async function enterClientWorkspace(clientId: string): Promise<{ ok: boolean; workspaceSlug: string }> {
    const { user, reseller } = await getMyReseller();

    const c = await prisma.partnerClient.findUnique({
        where: { id: clientId },
        include: { workspace: { select: { id: true, slug: true } } },
    });
    if (!c || c.partnerId !== reseller.id) throw new Error('권한 없음');

    await prisma.user.update({
        where: { id: user.id! },
        data: { currentWorkspaceId: c.workspace.id },
    });
    revalidatePath('/dashboard');
    return { ok: true, workspaceSlug: c.workspace.slug };
}
