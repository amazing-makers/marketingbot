import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAndIncrement, WEBHOOK_LIMITS } from '@/lib/rate-limit';

/**
 * Webhook 외부 트리거 — 사용자별 토큰으로 캠페인 즉시 생성.
 * sns-auto-platform webhook.py 포팅. Zapier · Make · 자체 자동화 통합용.
 *
 * POST /api/webhook/[token]/publish
 * Body: {
 *   content: string,
 *   channelIds?: string[],     // 미지정 시 사용자의 ACTIVE 채널 모두
 *   name?: string,             // 캠페인 이름 (기본 'Webhook trigger 시각')
 *   scheduledAt?: string,      // ISO 8601, 미지정 시 즉시 (지금)
 *   sourceLanguage?: string,   // 기본 'ko'
 *   autoTranslate?: boolean,   // 기본 true
 * }
 *
 * Rate limit: 60/분 · 200/일 (token 단위). 응답 헤더에 X-RateLimit-* 노출.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ token: string }> },
) {
    const { token } = await params;

    // 1. 토큰 검증
    const tokenRow = await prisma.userWebhookToken.findUnique({
        where: { token },
    });
    if (!tokenRow || !tokenRow.enabled) {
        return NextResponse.json({ error: 'Invalid or disabled token' }, { status: 401 });
    }

    // 2. Rate limit
    const rl = await checkAndIncrement(tokenRow.id);
    const baseHeaders = {
        'X-RateLimit-Minute-Remaining': String(rl.minuteRemaining),
        'X-RateLimit-Day-Remaining': String(rl.dayRemaining),
    };
    if (!rl.allowed) {
        return NextResponse.json(
            {
                error: `Rate limit exceeded (${rl.deniedBy})`,
                limits: { minute: WEBHOOK_LIMITS.MINUTE_LIMIT, day: WEBHOOK_LIMITS.DAY_LIMIT },
            },
            { status: 429, headers: baseHeaders },
        );
    }

    // 3. Payload 파싱
    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: baseHeaders });
    }
    const content = String(body?.content || '').trim();
    if (!content) {
        return NextResponse.json({ error: 'content 필수' }, { status: 400, headers: baseHeaders });
    }

    // 4. 채널 결정 — 미지정 시 사용자의 ACTIVE 채널 모두
    let channelIds: string[] = Array.isArray(body?.channelIds) ? body.channelIds.slice(0, 50) : [];
    if (channelIds.length === 0) {
        const active = await prisma.marketingChannel.findMany({
            where: { userId: tokenRow.userId, status: 'ACTIVE' },
            select: { id: true },
        });
        channelIds = active.map(c => c.id);
        if (channelIds.length === 0) {
            return NextResponse.json(
                { error: '활성 채널이 없습니다. /dashboard/channels 에서 채널을 등록하세요.' },
                { status: 400, headers: baseHeaders },
            );
        }
    } else {
        // 지정된 채널이 사용자 소유인지 검증
        const own = await prisma.marketingChannel.findMany({
            where: { id: { in: channelIds }, userId: tokenRow.userId },
            select: { id: true },
        });
        if (own.length !== channelIds.length) {
            return NextResponse.json(
                { error: '일부 채널 소유권 검증 실패' },
                { status: 403, headers: baseHeaders },
            );
        }
    }

    // 5. 캠페인 생성 (createCampaign 액션 직접 호출 — 트랜잭션 + 자동 번역 흐름 재사용)
    try {
        const { createCampaign } = await import('@/app/actions/campaignActions');
        // createCampaign 은 auth() 기반인데 webhook 은 token 기반이라 직접 호출 불가.
        // → 인라인으로 prisma 호출 + translator 직접 사용.
        const { translateText } = await import('@/lib/ai/translator');

        const sourceLanguage = String(body?.sourceLanguage || 'ko');
        const autoTranslate = body?.autoTranslate !== false;
        const scheduledAt = body?.scheduledAt ? new Date(body.scheduledAt) : new Date();
        const name = String(body?.name || `Webhook ${new Date().toISOString().slice(0, 16)}`);

        const channels = await prisma.marketingChannel.findMany({
            where: { id: { in: channelIds }, userId: tokenRow.userId },
        });

        const channelContents = await Promise.all(channels.map(async (ch) => {
            if (!autoTranslate || !ch.language || ch.language === sourceLanguage) {
                return { channelId: ch.id, content };
            }
            try {
                const translated = await translateText({
                    text: content,
                    targetLang: ch.language,
                    sourceLang: sourceLanguage,
                    platform: ch.type.toLowerCase(),
                    region: ch.region || '',
                    userId: tokenRow.userId,
                });
                return { channelId: ch.id, content: translated };
            } catch {
                return { channelId: ch.id, content };
            }
        }));

        const campaign = await prisma.$transaction(async (tx) => {
            const c = await tx.campaign.create({
                data: {
                    userId: tokenRow.userId,
                    name,
                    description: 'Created via webhook',
                    status: 'SCHEDULED',
                    scheduledAt,
                },
            });
            await tx.scheduledTask.createMany({
                data: channelContents.map(({ channelId, content }) => ({
                    campaignId: c.id,
                    channelId,
                    content,
                    scheduledAt,
                    status: 'PENDING',
                })),
            });
            return c;
        });

        // 토큰 lastUsedAt 갱신
        await prisma.userWebhookToken.update({
            where: { id: tokenRow.id },
            data: { lastUsedAt: new Date() },
        });

        return NextResponse.json({
            ok: true,
            campaignId: campaign.id,
            taskCount: channelContents.length,
            scheduledAt: scheduledAt.toISOString(),
        }, { headers: baseHeaders });
    } catch (e: any) {
        console.error('[webhook publish]', e);
        return NextResponse.json(
            { error: e?.message || '캠페인 생성 실패' },
            { status: 500, headers: baseHeaders },
        );
    }
}

// 헬스체크 — 토큰 유효성만 빠르게 확인
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ token: string }> },
) {
    const { token } = await params;
    const t = await prisma.userWebhookToken.findUnique({
        where: { token },
        select: { id: true, enabled: true, label: true },
    });
    if (!t) return NextResponse.json({ ok: false, error: 'invalid token' }, { status: 404 });
    return NextResponse.json({
        ok: true,
        enabled: t.enabled,
        label: t.label,
        limits: WEBHOOK_LIMITS,
    });
}
