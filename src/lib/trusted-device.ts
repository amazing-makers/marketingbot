/**
 * Phase 50 — 같은 PC 에서 비밀번호 없이 다른 계정으로 전환하기 위한 token helper.
 *
 * raw token: 클라이언트의 httpOnly cookie 에만 보관 (JS 접근 불가).
 * DB 에는 bcrypt 해시만 저장.
 *
 * cookie 구조: 'amakers_td' = JSON {"<userId>": "<rawToken>", ...}
 * 7일 만료. 한 PC 에서 여러 계정을 동시에 등록 가능 (가족/팀 PC).
 */

import * as crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export const TD_COOKIE_NAME = 'amakers_td';
export const TD_TTL_DAYS = 7;
export const TD_TTL_SECONDS = TD_TTL_DAYS * 24 * 60 * 60;

/** 32-byte 랜덤 hex token. */
export function generateRawToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

export async function hashToken(raw: string): Promise<string> {
    return bcrypt.hash(raw, 10);
}

export async function verifyTokenHash(raw: string, hash: string): Promise<boolean> {
    try {
        return await bcrypt.compare(raw, hash);
    } catch {
        return false;
    }
}

/** cookie 의 token map 읽기. 형식 깨졌으면 빈 객체. */
export async function readTrustedDevicesCookie(): Promise<Record<string, string>> {
    const c = await cookies();
    const raw = c.get(TD_COOKIE_NAME)?.value;
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return parsed as Record<string, string>;
        }
    } catch { /* corrupt cookie — 무시 */ }
    return {};
}

/** cookie 에 (userId, rawToken) 페어 추가/갱신. 같은 userId 가 있으면 덮어씀. */
export async function writeTrustedDeviceCookie(userId: string, rawToken: string) {
    const c = await cookies();
    const map = await readTrustedDevicesCookie();
    map[userId] = rawToken;
    c.set(TD_COOKIE_NAME, JSON.stringify(map), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: TD_TTL_SECONDS,
    });
}

/** cookie 에서 특정 userId 항목 제거 (다른 항목은 유지). */
export async function removeTrustedDeviceCookie(userId: string) {
    const c = await cookies();
    const map = await readTrustedDevicesCookie();
    delete map[userId];
    if (Object.keys(map).length === 0) {
        c.delete(TD_COOKIE_NAME);
    } else {
        c.set(TD_COOKIE_NAME, JSON.stringify(map), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: TD_TTL_SECONDS,
        });
    }
}
