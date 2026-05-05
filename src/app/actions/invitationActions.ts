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

const INVITATION_EXPIRES_DAYS = 7;

/**
 * 워크스페이스에 미가입/기가입 사용자 모두 초대.
 * - 이미 멤버: 차단
 * - 가입된 사용자: 즉시 멤버 추가 + 알림 이메일
 * - 미가입: 토큰 생성 + 초대 이메일 → 수락 시 가입 후 자동 추가
 */
export async function inviteToWorkspace(input: {
    workspaceId: string;
    email: string;
    role?: 'ADMIN' | 'MEMBER' | 'VIEWER';
    message?: string;
}): Promise<{
    ok: boolean;
    type?: 'instant_added' | 'invitation_sent';
    error?: string;
    invitationId?: string;
}> {
    const me = await getSessionUser();
    const targetEmail = input.email.trim().toLowerCase();
    if (!/^\S+@\S+$/.test(targetEmail)) {
        return { ok: false, error: '유효한 이메일이 아닙니다' };
    }

    // 권한 확인 — owner / admin 만 초대 가능
    const myMembership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: me.id! } },
    });
    if (!myMembership || (myMembership.role !== 'OWNER' && myMembership.role !== 'ADMIN')) {
        return { ok: false, error: '초대 권한이 없습니다 (Owner/Admin 만 가능)' };
    }

    const workspace = await prisma.workspace.findUnique({
        where: { id: input.workspaceId },
        select: { id: true, name: true },
    });
    if (!workspace) return { ok: false, error: '워크스페이스를 찾을 수 없습니다' };

    const role = input.role || 'MEMBER';

    // 가입된 사용자인지 확인
    const existingUser = await prisma.user.findUnique({
        where: { email: targetEmail },
        select: { id: true, name: true, email: true },
    });

    // 이미 멤버이면 차단
    if (existingUser) {
        const dup = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: input.workspaceId, userId: existingUser.id } },
        });
        if (dup) return { ok: false, error: '이미 멤버입니다' };
    }

    // 같은 이메일로 PENDING invitation 이 있으면 차단 (재발송은 별도 액션)
    const pendingInvite = await prisma.workspaceInvitation.findUnique({
        where: { workspaceId_email: { workspaceId: input.workspaceId, email: targetEmail } },
    });
    if (pendingInvite && pendingInvite.status === 'PENDING' && pendingInvite.expiresAt > new Date()) {
        return { ok: false, error: '이미 발송된 초대가 있습니다 (만료 전 재발송하려면 먼저 취소)' };
    }

    // ─── 가입 사용자 → 즉시 추가 + 통지 ───
    if (existingUser) {
        await prisma.workspaceMember.create({
            data: {
                workspaceId: input.workspaceId,
                userId: existingUser.id,
                role,
                invitedBy: me.id!,
            },
        });

        // 인앱 알림 (Phase 20)
        try {
            const { createNotification } = await import('@/lib/notifications/create');
            await createNotification({
                userId: existingUser.id,
                kind: 'WORKSPACE_INVITE',
                title: `🤝 ${workspace.name} 합류`,
                body: `${me.name || me.email} 님이 ${workspace.name} 워크스페이스에 ${role === 'ADMIN' ? '관리자' : role === 'VIEWER' ? '뷰어' : '멤버'} 로 추가했어요`,
                link: `/dashboard/workspace/${workspace.id}`,
                metadata: { workspaceId: workspace.id, role },
            });
        } catch (e) {
            console.warn('[notification] workspace invite inapp failed', e);
        }

        // 알림 이메일 (실패해도 차단 안 함)
        try {
            const { sendEmail } = await import('@/lib/email/send');
            const { WorkspaceInvitationEmail } = await import('@/lib/email/templates/WorkspaceInvitation');
            const baseUrl = process.env.NEXTAUTH_URL || 'https://marketingbot.amakers.co.kr';
            await sendEmail({
                to: existingUser.email,
                subject: `🤝 ${workspace.name} 워크스페이스에 추가되었습니다`,
                react: WorkspaceInvitationEmail({
                    inviterName: me.name || me.email || '관리자',
                    workspaceName: workspace.name,
                    role,
                    message: input.message,
                    inviteUrl: `${baseUrl}/dashboard/workspace/${workspace.id}`,
                    expiresInDays: 0, // 즉시 추가
                }),
            });
        } catch (e) {
            console.warn('[invitation] email send failed', e);
        }
        revalidatePath(`/dashboard/workspace/${input.workspaceId}`);
        return { ok: true, type: 'instant_added' };
    }

    // ─── 미가입 → 초대 토큰 생성 + 이메일 ───
    // 기존 EXPIRED/REVOKED invitation 이 있으면 새로 갱신 (upsert 패턴)
    const token = randomBytes(20).toString('hex');
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    const inv = await prisma.workspaceInvitation.upsert({
        where: { workspaceId_email: { workspaceId: input.workspaceId, email: targetEmail } },
        update: {
            role,
            token,
            invitedBy: me.id!,
            message: input.message?.trim() || null,
            status: 'PENDING',
            expiresAt,
            acceptedAt: null,
            acceptedBy: null,
        },
        create: {
            workspaceId: input.workspaceId,
            email: targetEmail,
            role,
            token,
            invitedBy: me.id!,
            message: input.message?.trim() || null,
            expiresAt,
        },
    });

    try {
        const { sendEmail } = await import('@/lib/email/send');
        const { WorkspaceInvitationEmail } = await import('@/lib/email/templates/WorkspaceInvitation');
        const baseUrl = process.env.NEXTAUTH_URL || 'https://marketingbot.amakers.co.kr';
        await sendEmail({
            to: targetEmail,
            subject: `🤝 ${workspace.name} 워크스페이스 초대`,
            react: WorkspaceInvitationEmail({
                inviterName: me.name || me.email || '초대자',
                workspaceName: workspace.name,
                role,
                message: input.message,
                inviteUrl: `${baseUrl}/invite/${token}`,
                expiresInDays: INVITATION_EXPIRES_DAYS,
            }),
        });
    } catch (e) {
        console.warn('[invitation] email send failed', e);
    }

    revalidatePath(`/dashboard/workspace/${input.workspaceId}`);
    return { ok: true, type: 'invitation_sent', invitationId: inv.id };
}

/**
 * 워크스페이스의 PENDING 초대 목록.
 */
export async function listPendingInvitations(workspaceId: string) {
    const me = await getSessionUser();
    const myMembership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: me.id! } },
    });
    if (!myMembership) throw new Error('해당 워크스페이스의 멤버가 아닙니다');

    return prisma.workspaceInvitation.findMany({
        where: { workspaceId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
    });
}

/**
 * 초대 취소 (REVOKED 처리).
 */
export async function revokeInvitation(invitationId: string): Promise<{ ok: boolean; error?: string }> {
    const me = await getSessionUser();
    const inv = await prisma.workspaceInvitation.findUnique({
        where: { id: invitationId },
        select: { workspaceId: true, status: true },
    });
    if (!inv) return { ok: false, error: '초대를 찾을 수 없습니다' };

    const myMembership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: inv.workspaceId, userId: me.id! } },
    });
    if (!myMembership || (myMembership.role !== 'OWNER' && myMembership.role !== 'ADMIN')) {
        return { ok: false, error: '권한 없음' };
    }

    if (inv.status !== 'PENDING') return { ok: false, error: '이미 처리된 초대입니다' };

    await prisma.workspaceInvitation.update({
        where: { id: invitationId },
        data: { status: 'REVOKED' },
    });
    revalidatePath(`/dashboard/workspace/${inv.workspaceId}`);
    return { ok: true };
}

/**
 * 초대 토큰 조회 (수락 페이지에서 사용) — 인증 불필요.
 */
export async function getInvitationByToken(token: string) {
    const inv = await prisma.workspaceInvitation.findUnique({
        where: { token },
        include: {
            workspace: { select: { id: true, name: true, slug: true, brandColor: true } },
        },
    });
    if (!inv) return null;
    if (inv.status !== 'PENDING') return { ...inv, isValid: false, reason: 'already_processed' as const };
    if (inv.expiresAt < new Date()) return { ...inv, isValid: false, reason: 'expired' as const };
    return { ...inv, isValid: true as const };
}

/**
 * 초대 수락 — 로그인된 사용자가 호출. 이메일 일치하면 멤버 추가.
 */
export async function acceptInvitation(token: string): Promise<{
    ok: boolean;
    workspaceId?: string;
    workspaceSlug?: string;
    error?: string;
}> {
    const me = await getSessionUser();

    const inv = await prisma.workspaceInvitation.findUnique({
        where: { token },
        include: { workspace: { select: { id: true, slug: true } } },
    });
    if (!inv) return { ok: false, error: '초대를 찾을 수 없습니다' };
    if (inv.status !== 'PENDING') return { ok: false, error: '이미 처리된 초대입니다' };
    if (inv.expiresAt < new Date()) {
        await prisma.workspaceInvitation.update({ where: { id: inv.id }, data: { status: 'EXPIRED' } });
        return { ok: false, error: '만료된 초대입니다' };
    }

    // 이메일 일치 확인 (대소문자 무시)
    if (me.email?.toLowerCase() !== inv.email.toLowerCase()) {
        return { ok: false, error: `초대받은 이메일(${inv.email}) 과 로그인 계정(${me.email}) 이 일치하지 않습니다` };
    }

    // 이미 멤버이면 그냥 success
    const dup = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: inv.workspaceId, userId: me.id! } },
    });
    if (dup) {
        await prisma.workspaceInvitation.update({
            where: { id: inv.id },
            data: { status: 'ACCEPTED', acceptedAt: new Date(), acceptedBy: me.id! },
        });
        return { ok: true, workspaceId: inv.workspace.id, workspaceSlug: inv.workspace.slug };
    }

    await prisma.$transaction([
        prisma.workspaceMember.create({
            data: {
                workspaceId: inv.workspaceId,
                userId: me.id!,
                role: inv.role,
                invitedBy: inv.invitedBy,
            },
        }),
        prisma.workspaceInvitation.update({
            where: { id: inv.id },
            data: { status: 'ACCEPTED', acceptedAt: new Date(), acceptedBy: me.id! },
        }),
    ]);

    revalidatePath('/dashboard');
    return { ok: true, workspaceId: inv.workspace.id, workspaceSlug: inv.workspace.slug };
}
