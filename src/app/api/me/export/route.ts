import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Phase 39 — 사용자 본인 데이터 전체 익스포트 (GDPR Right to Data Portability).
 *
 * GET /api/me/export → JSON 다운로드.
 * 캠페인·시리즈·채널·구독·라이센스·알림·피드백·워크스페이스 멤버십 포함.
 * 자격증명 (encryptedCredentials) 은 제외 — 보안상.
 */
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    const [
        user,
        campaigns,
        series,
        channels,
        subscription,
        licenses,
        notifications,
        feedbacks,
        workspaces,
        webhookTokens,
    ] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
                onboardingCompletedAt: true,
                emailPreferences: true,
            },
        }),
        prisma.campaign.findMany({
            where: { userId },
            include: {
                tasks: {
                    select: {
                        id: true,
                        channelId: true,
                        content: true,
                        mediaUrls: true,
                        status: true,
                        scheduledAt: true,
                        executedAt: true,
                        errorLog: true,
                    },
                },
            },
        }),
        prisma.campaignSeries.findMany({ where: { userId } }),
        prisma.marketingChannel.findMany({
            where: { userId },
            select: {
                id: true,
                type: true,
                accountName: true,
                region: true,
                language: true,
                status: true,
                createdAt: true,
                lastUsedAt: true,
                // encryptedCredentials 는 의도적으로 제외 — 보안 + 사용자가 직접 저장 권장
            },
        }),
        prisma.subscription.findUnique({ where: { userId } }),
        prisma.license.findMany({ where: { userId } }),
        prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 500 }),
        prisma.userFeedback.findMany({ where: { userId } }),
        prisma.workspaceMember.findMany({
            where: { userId },
            include: {
                workspace: {
                    select: { id: true, name: true, slug: true, plan: true, ownerId: true },
                },
            },
        }),
        prisma.userWebhookToken.findMany({
            where: { userId },
            select: { id: true, label: true, enabled: true, createdAt: true, lastUsedAt: true },
            // token 자체는 익스포트 안 함 (재발급으로 노출 막기)
        }),
    ]);

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const exportData = {
        meta: {
            exportedAt: new Date().toISOString(),
            userId,
            note: '이 파일은 마케팅봇의 GDPR Article 20 (Right to Data Portability) 요구를 충족합니다. 자격증명·webhook 토큰 값은 보안상 제외됨.',
        },
        user,
        subscription,
        licenses,
        channels,
        campaigns,
        campaignSeries: series,
        notifications,
        feedbacks,
        workspaces: workspaces.map(w => ({
            workspaceId: w.workspace.id,
            workspaceName: w.workspace.name,
            workspaceSlug: w.workspace.slug,
            workspacePlan: w.workspace.plan,
            myRole: w.role,
            isOwner: w.workspace.ownerId === userId,
            joinedAt: w.joinedAt,
        })),
        webhookTokens,
    };

    const filename = `amakers-export-${userId}-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
        status: 200,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    });
}
