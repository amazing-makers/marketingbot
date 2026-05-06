'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

async function getSessionUser() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    return session.user;
}

/**
 * Phase 48 — 사용자 추천 링크 (refer-a-friend).
 *
 * 모든 user 가 가지는 단순 추천 코드. user.id 의 마지막 8자를 base36 으로 변환.
 * 스키마 변경 없이 emailPreferences JSON 에 referredByUserId 저장.
 *
 * 리셀러 ReferralCode 와는 별도 — 일반 사용자가 친구 초대 시 사용.
 * 추천 보상: 추천한 사용자에게 트라이얼 7일 추가 (가입자 결제 시).
 */

function userIdToCode(userId: string): string {
    // user id 마지막 8자 → 대문자
    return userId.slice(-8).toUpperCase();
}

export async function getMyReferralCode(): Promise<{
    code: string;
    referralUrl: string;
    referredCount: number;
    paidReferredCount: number;
}> {
    const user = await getSessionUser();
    const code = userIdToCode(user.id!);

    // 이 사용자가 추천한 사람 수 (emailPreferences.referredByUserId 매칭)
    const allUsers = await prisma.user.findMany({
        select: { id: true, emailPreferences: true, subscription: { select: { plan: true, status: true } } },
    });
    const referred = allUsers.filter(u => {
        const prefs = (u.emailPreferences as any) || {};
        return prefs.referredByUserId === user.id;
    });
    const paid = referred.filter(u =>
        u.subscription?.status === 'active' &&
        u.subscription.plan && u.subscription.plan !== 'FREE'
    );

    const appUrl = process.env.NEXTAUTH_URL || 'https://marketingbot.amakers.co.kr';
    return {
        code,
        referralUrl: `${appUrl}/register?refby=${code}`,
        referredCount: referred.length,
        paidReferredCount: paid.length,
    };
}

/**
 * 가입 시 ?refby=CODE 쿼리에서 추천한 사용자 찾기 + 저장.
 * register/page.tsx 의 registerUser 액션에서 호출.
 */
export async function applyReferralCode(newUserId: string, code: string): Promise<boolean> {
    if (!code || code.length < 4) return false;
    const upperCode = code.toUpperCase().trim();

    // user.id 의 마지막 8자가 매칭되는 사용자 찾기 (id 는 cuid 임의)
    // SQL 인덱스 없이 풀 스캔이지만 가입은 드물어 OK
    const candidates = await prisma.user.findMany({
        select: { id: true },
    });
    const referrer = candidates.find(u => userIdToCode(u.id) === upperCode);
    if (!referrer || referrer.id === newUserId) return false;

    // 신규 user 의 emailPreferences 에 referredByUserId 저장
    const u = await prisma.user.findUnique({
        where: { id: newUserId },
        select: { emailPreferences: true },
    });
    const prefs = (u?.emailPreferences as any) || {};
    await prisma.user.update({
        where: { id: newUserId },
        data: {
            emailPreferences: {
                ...prefs,
                referredByUserId: referrer.id,
                referredAt: new Date().toISOString(),
            } as any,
        },
    });

    return true;
}

/**
 * 추천한 사람 목록 (개인정보 보호 — 이메일 마스킹).
 */
export async function listMyReferrals(): Promise<Array<{
    id: string;
    emailMasked: string;
    name: string | null;
    plan: string;
    status: string;
    referredAt: string | null;
    isPaid: boolean;
}>> {
    const user = await getSessionUser();

    const all = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            emailPreferences: true,
            createdAt: true,
            subscription: { select: { plan: true, status: true } },
        },
    });

    const referred = all.filter(u => {
        const prefs = (u.emailPreferences as any) || {};
        return prefs.referredByUserId === user.id;
    });

    const maskEmail = (email: string) => {
        const [local, domain] = email.split('@');
        if (!domain) return email;
        const masked = local.length <= 3
            ? local[0] + '**'
            : local.slice(0, 2) + '*'.repeat(Math.min(local.length - 3, 5)) + local.slice(-1);
        return `${masked}@${domain}`;
    };

    return referred.map(u => {
        const prefs = (u.emailPreferences as any) || {};
        const plan = u.subscription?.plan || 'FREE';
        const status = u.subscription?.status || 'inactive';
        return {
            id: u.id,
            emailMasked: maskEmail(u.email),
            name: u.name,
            plan,
            status,
            referredAt: prefs.referredAt || u.createdAt.toISOString(),
            isPaid: status === 'active' && plan !== 'FREE',
        };
    }).sort((a, b) => (b.referredAt || '').localeCompare(a.referredAt || ''));
}
