/**
 * Phase 21 — REST API v1 인증.
 *
 * Authorization: Bearer <token>  (UserWebhookToken 재사용 — 외부 자동화와 동일 토큰 사용 가능)
 *
 * 응답 헤더:
 *   X-API-Version: v1
 */

import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export interface ApiAuth {
    userId: string;
    tokenId: string;
}

export async function authenticateApi(req: Request): Promise<ApiAuth | NextResponse> {
    const auth = req.headers.get('authorization') || '';
    const match = auth.match(/^Bearer\s+([a-f0-9]{32})$/i);
    if (!match) {
        return NextResponse.json(
            { error: 'unauthorized', message: 'Authorization: Bearer <token> required (32-char hex)' },
            { status: 401 },
        );
    }
    const token = match[1];

    const row = await prisma.userWebhookToken.findUnique({
        where: { token },
        select: { id: true, userId: true, enabled: true },
    });
    if (!row || !row.enabled) {
        return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
    }

    // 마지막 사용 시간 업데이트 (실패해도 무시)
    prisma.userWebhookToken.update({
        where: { id: row.id },
        data: { lastUsedAt: new Date() },
    }).catch(() => {});

    return { userId: row.userId, tokenId: row.id };
}

export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse {
    return NextResponse.json(data, {
        ...init,
        headers: {
            ...(init?.headers || {}),
            'X-API-Version': 'v1',
        },
    });
}
