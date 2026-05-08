'use server';

/**
 * Phase 50 — 같은 PC 비밀번호 없는 계정 전환 server actions.
 */

import { prisma } from '@/lib/prisma';
import { auth, signIn } from '@/auth';
import {
    generateRawToken,
    hashToken,
    verifyTokenHash,
    readTrustedDevicesCookie,
    writeTrustedDeviceCookie,
    removeTrustedDeviceCookie,
    TD_TTL_DAYS,
} from '@/lib/trusted-device';
import { headers } from 'next/headers';

/**
 * 현재 로그인된 사용자에게 7일짜리 trusted device token 발급.
 * 로그인/가입 직후에 자동으로 호출됨.
 */
export async function issueTrustedDeviceForCurrentUser(): Promise<{ ok: boolean; error?: string }> {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return { ok: false, error: 'unauthenticated' };

    const rawToken = generateRawToken();
    const tokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + TD_TTL_DAYS * 24 * 60 * 60 * 1000);

    const ua = (await headers()).get('user-agent') || null;

    await prisma.trustedDevice.create({
        data: { userId, tokenHash, expiresAt, userAgent: ua },
    });

    await writeTrustedDeviceCookie(userId, rawToken);
    return { ok: true };
}

/**
 * cookie 에 등록된 모든 trusted device 를 검증 → 비번 없이 전환 가능한 사용자 목록 반환.
 * 만료되었거나 hash 매칭 실패한 항목은 cookie 에서 자동 제거 (cleanup).
 */
export async function listSwitchableAccounts(): Promise<Array<{
    id: string;
    email: string;
    name: string | null;
}>> {
    const map = await readTrustedDevicesCookie();
    const userIds = Object.keys(map);
    if (userIds.length === 0) return [];

    const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, name: true },
    });

    const valid: Array<{ id: string; email: string; name: string | null }> = [];

    for (const user of users) {
        const rawToken = map[user.id];
        if (!rawToken) continue;

        const tds = await prisma.trustedDevice.findMany({
            where: { userId: user.id, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });

        let matched = false;
        for (const td of tds) {
            if (await verifyTokenHash(rawToken, td.tokenHash)) {
                matched = true;
                break;
            }
        }
        if (matched) {
            valid.push(user);
        } else {
            // 매칭 실패 — cookie 에서 제거
            await removeTrustedDeviceCookie(user.id);
        }
    }

    return valid;
}

/**
 * 비밀번호 없이 targetUserId 로 전환.
 * cookie 의 raw token + DB hashed token 매칭 시 NextAuth signIn (provider: 'trusted-device').
 *
 * 성공 시 클라이언트는 window.location.href = '/dashboard' 로 hard navigation 권장
 * (signIn 결과로 새 세션 cookie 가 server response 에 set 되므로 페이지 reload 필요).
 */
export async function switchToTrustedAccount(targetUserId: string): Promise<{
    ok: boolean;
    error?: string;
}> {
    const map = await readTrustedDevicesCookie();
    const rawToken = map[targetUserId];
    if (!rawToken) return { ok: false, error: '저장된 token 이 없습니다 — 다시 비밀번호로 로그인해주세요.' };

    // NextAuth signIn — 'trusted-device' provider 가 token 검증 후 user 반환.
    try {
        await signIn('trusted-device', {
            userId: targetUserId,
            token: rawToken,
            redirect: false,
        });
        return { ok: true };
    } catch (e: any) {
        // signIn 실패 — token 만료/무효
        await removeTrustedDeviceCookie(targetUserId);
        return { ok: false, error: e?.message || '전환 실패 — token 만료/무효' };
    }
}

/** 현재 cookie 의 한 항목 제거 (사용자가 "이 계정 안 쓸래"). */
export async function forgetTrustedAccount(targetUserId: string): Promise<{ ok: boolean }> {
    await removeTrustedDeviceCookie(targetUserId);
    // 운영 보안 — 같은 user 의 모든 trusted device record 도 정리.
    await prisma.trustedDevice.deleteMany({ where: { userId: targetUserId } }).catch(() => { /* ignore */ });
    return { ok: true };
}
