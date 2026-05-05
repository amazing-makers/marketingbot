'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Workspace 관련 server actions — Phase 6 골격.
 *
 * 현재 채널/캠페인은 user.id 기준으로 분리되어 있음 (호환성).
 * 향후 별도 단계에서 채널/캠페인에 workspaceId 추가 + 데이터 마이그레이션
 * (사용자가 워크스페이스 모드 활성화 시).
 *
 * 지금 가능한 동작:
 *   - 사용자가 자기 워크스페이스 N 개 생성 가능
 *   - 멤버 초대 (이메일 기준 — 가입 사용자만)
 *   - 활성 워크스페이스 전환 (User.currentWorkspaceId)
 */

async function getSessionUserId(): Promise<string> {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    return session.user.id;
}

function slugify(input: string): string {
    return input
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^\w\s가-힣-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 40)
        || 'workspace';
}

/**
 * 새 워크스페이스 생성 — 호출자가 owner.
 * slug 충돌 시 -2, -3 자동 부여.
 */
export async function createWorkspace(input: {
    name: string;
    description?: string;
    brandColor?: string;
}): Promise<{ id: string; slug: string }> {
    const userId = await getSessionUserId();
    if (!input.name?.trim()) throw new Error('워크스페이스 이름을 입력하세요');

    // slug 결정 — 충돌 시 -2, -3...
    const baseSlug = slugify(input.name);
    let slug = baseSlug;
    let i = 2;
    // 안전 상한 100회 (이론상 도달 불가)
    while (i < 100 && (await prisma.workspace.findUnique({ where: { slug } }))) {
        slug = `${baseSlug}-${i++}`;
    }

    const ws = await prisma.workspace.create({
        data: {
            name: input.name.trim(),
            slug,
            ownerId: userId,
            description: input.description || null,
            brandColor: input.brandColor || '#1D1D1B',
            members: {
                create: { userId, role: 'OWNER' },
            },
        },
    });

    revalidatePath('/dashboard');
    return { id: ws.id, slug: ws.slug };
}

/**
 * 호출자가 소속된 모든 워크스페이스 목록.
 */
export async function listMyWorkspaces() {
    const userId = await getSessionUserId();
    const memberships = await prisma.workspaceMember.findMany({
        where: { userId },
        include: { workspace: { include: { _count: { select: { members: true } } } } },
        orderBy: { joinedAt: 'asc' },
    });
    return memberships.map(m => ({
        id: m.workspace.id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        role: m.role,
        memberCount: m.workspace._count.members,
        plan: m.workspace.plan,
        brandColor: m.workspace.brandColor,
        logoUrl: m.workspace.logoUrl,
        isOwner: m.workspace.ownerId === userId,
    }));
}

/**
 * 활성 워크스페이스 전환 — User.currentWorkspaceId 갱신.
 * null 전달 시 "개인" (워크스페이스 미선택) 모드 — 기존 user.id 데이터.
 */
export async function switchWorkspace(workspaceId: string | null): Promise<{ ok: boolean }> {
    const userId = await getSessionUserId();

    if (workspaceId) {
        // 멤버십 검증
        const membership = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId } },
        });
        if (!membership) throw new Error('해당 워크스페이스의 멤버가 아닙니다');
    }

    await prisma.user.update({
        where: { id: userId },
        data: { currentWorkspaceId: workspaceId },
    });

    revalidatePath('/dashboard');
    return { ok: true };
}

/**
 * 멤버 초대 — 이메일로 가입된 사용자 검색 후 추가. 미가입 사용자는 별도 invite token 시스템 필요 (향후).
 */
export async function inviteWorkspaceMember(input: {
    workspaceId: string;
    email: string;
    role?: 'ADMIN' | 'MEMBER' | 'VIEWER';
}): Promise<{ ok: boolean; invitedUserId?: string; error?: string }> {
    const userId = await getSessionUserId();

    // 권한 — owner 또는 admin 만 초대 가능
    const me = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: input.workspaceId, userId } },
    });
    if (!me || (me.role !== 'OWNER' && me.role !== 'ADMIN')) {
        return { ok: false, error: '초대 권한이 없습니다 (Owner/Admin 만 가능)' };
    }

    const target = await prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() } });
    if (!target) return { ok: false, error: '해당 이메일의 가입 사용자를 찾을 수 없습니다 (이메일 초대는 향후 지원)' };

    // 중복 체크
    const existing = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: target.id } },
    });
    if (existing) return { ok: false, error: '이미 멤버입니다' };

    await prisma.workspaceMember.create({
        data: {
            workspaceId: input.workspaceId,
            userId: target.id,
            role: input.role || 'MEMBER',
            invitedBy: userId,
        },
    });

    revalidatePath('/dashboard');
    return { ok: true, invitedUserId: target.id };
}

/**
 * 멤버 제거 — owner 만 가능. owner 본인 제거는 차단.
 */
export async function removeWorkspaceMember(input: {
    workspaceId: string;
    userId: string;
}): Promise<{ ok: boolean; error?: string }> {
    const callerId = await getSessionUserId();
    const ws = await prisma.workspace.findUnique({ where: { id: input.workspaceId } });
    if (!ws) return { ok: false, error: '워크스페이스를 찾을 수 없습니다' };
    if (ws.ownerId !== callerId) return { ok: false, error: 'Owner 만 멤버를 제거할 수 있습니다' };
    if (input.userId === ws.ownerId) return { ok: false, error: 'Owner 본인은 제거할 수 없습니다 (워크스페이스 삭제로 진행)' };

    await prisma.workspaceMember.delete({
        where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } },
    });
    revalidatePath('/dashboard');
    return { ok: true };
}

/**
 * 특정 워크스페이스의 멤버 목록 + 권한 정보 (멤버만 조회 가능).
 */
export async function listWorkspaceMembers(workspaceId: string) {
    const userId = await getSessionUserId();
    const me = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!me) throw new Error('해당 워크스페이스의 멤버가 아닙니다');

    const ws = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, name: true, slug: true, ownerId: true, plan: true, brandColor: true, logoUrl: true, description: true },
    });
    if (!ws) throw new Error('워크스페이스를 찾을 수 없습니다');

    const members = await prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { joinedAt: 'asc' },
    });

    // Phase 38 — 멤버별 활동 통계 (이번 주 / 이번 달 캠페인·시리즈 수)
    const memberIds = members.map(m => m.userId);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date();
    monthStart.setDate(monthStart.getDate() - 30);

    const [weekCampaigns, monthCampaigns, weekSeries, monthSeries] = memberIds.length === 0 ? [[], [], [], []] : await Promise.all([
        prisma.campaign.groupBy({
            by: ['userId'],
            where: { workspaceId, userId: { in: memberIds }, createdAt: { gte: weekStart } },
            _count: { _all: true },
        }),
        prisma.campaign.groupBy({
            by: ['userId'],
            where: { workspaceId, userId: { in: memberIds }, createdAt: { gte: monthStart } },
            _count: { _all: true },
        }),
        prisma.campaignSeries.groupBy({
            by: ['userId'],
            where: { workspaceId, userId: { in: memberIds }, createdAt: { gte: weekStart } },
            _count: { _all: true },
        }),
        prisma.campaignSeries.groupBy({
            by: ['userId'],
            where: { workspaceId, userId: { in: memberIds }, createdAt: { gte: monthStart } },
            _count: { _all: true },
        }),
    ]);

    const wc = Object.fromEntries(weekCampaigns.map(g => [g.userId, g._count._all]));
    const mc = Object.fromEntries(monthCampaigns.map(g => [g.userId, g._count._all]));
    const ws7 = Object.fromEntries(weekSeries.map(g => [g.userId, g._count._all]));
    const ws30 = Object.fromEntries(monthSeries.map(g => [g.userId, g._count._all]));

    return {
        workspace: { ...ws, isOwner: ws.ownerId === userId },
        myRole: me.role,
        members: members.map(m => ({
            userId: m.userId,
            email: m.user.email,
            name: m.user.name,
            role: m.role,
            joinedAt: m.joinedAt,
            isOwner: m.userId === ws.ownerId,
            isMe: m.userId === userId,
            weekCampaigns: wc[m.userId] || 0,
            monthCampaigns: mc[m.userId] || 0,
            weekSeries: ws7[m.userId] || 0,
            monthSeries: ws30[m.userId] || 0,
        })),
    };
}

/**
 * 멤버 권한 변경 (Owner 만 가능, Owner 자신은 변경 불가).
 */
export async function updateMemberRole(input: {
    workspaceId: string;
    userId: string;
    role: 'ADMIN' | 'MEMBER' | 'VIEWER';
}): Promise<{ ok: boolean; error?: string }> {
    const callerId = await getSessionUserId();
    const ws = await prisma.workspace.findUnique({ where: { id: input.workspaceId }, select: { ownerId: true } });
    if (!ws) return { ok: false, error: '워크스페이스를 찾을 수 없습니다' };
    if (ws.ownerId !== callerId) return { ok: false, error: 'Owner 만 권한을 변경할 수 있습니다' };
    if (input.userId === ws.ownerId) return { ok: false, error: 'Owner 권한은 변경할 수 없습니다' };

    await prisma.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: input.userId } },
        data: { role: input.role },
    });
    revalidatePath('/dashboard/workspace');
    return { ok: true };
}

/**
 * 활성 워크스페이스 정보 — server component / 헤더 표시용.
 */
export async function getCurrentWorkspace() {
    const userId = await getSessionUserId();
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { currentWorkspaceId: true },
    });
    if (!user?.currentWorkspaceId) return null;
    const ws = await prisma.workspace.findUnique({
        where: { id: user.currentWorkspaceId },
        include: { _count: { select: { members: true } } },
    });
    if (!ws) {
        // 잘못된 ID 가 남아있으면 자동 정리
        await prisma.user.update({ where: { id: userId }, data: { currentWorkspaceId: null } });
        return null;
    }
    return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        plan: ws.plan,
        brandColor: ws.brandColor,
        logoUrl: ws.logoUrl,
        memberCount: ws._count.members,
        isOwner: ws.ownerId === userId,
    };
}
