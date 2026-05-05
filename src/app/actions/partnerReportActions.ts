'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { isR2Configured, uploadToR2 } from '@/lib/storage/r2';
import dayjs from 'dayjs';

async function getSessionUser() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    return session.user;
}

interface ChannelStat { type: string; count: number; }

/**
 * 특정 고객사·기간의 통계 집계 (PDF 생성에 사용).
 * 워크스페이스의 ScheduledTask 기준 — 발행 성공/실패/채널 분포.
 */
async function aggregateClientPeriod(workspaceId: string, periodYearMonth: string) {
    const [y, m] = periodYearMonth.split('-').map(Number);
    const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const end = new Date(y, m, 1, 0, 0, 0, 0);

    // 해당 워크스페이스 캠페인 조회
    const campaigns = await prisma.campaign.findMany({
        where: {
            workspaceId,
            createdAt: { gte: start, lt: end },
        },
        select: { id: true, name: true },
    });
    const campaignIds = campaigns.map(c => c.id);

    if (campaignIds.length === 0) {
        return {
            totalCampaigns: 0,
            totalPublished: 0,
            totalFailed: 0,
            channelMix: [] as ChannelStat[],
            topPerformingCampaign: null as string | null,
        };
    }

    // 해당 캠페인들의 task 통계
    const tasks = await prisma.scheduledTask.findMany({
        where: { campaignId: { in: campaignIds } },
        select: {
            status: true,
            campaignId: true,
            channel: { select: { type: true } },
        },
    });

    let totalPublished = 0;
    let totalFailed = 0;
    const channelCounts = new Map<string, number>();
    const campaignSuccessCount = new Map<string, number>();

    for (const t of tasks) {
        if (t.status === 'SUCCESS') {
            totalPublished++;
            const ct = t.channel.type;
            channelCounts.set(ct, (channelCounts.get(ct) ?? 0) + 1);
            campaignSuccessCount.set(t.campaignId, (campaignSuccessCount.get(t.campaignId) ?? 0) + 1);
        } else if (t.status === 'FAILED') {
            totalFailed++;
        }
    }

    const channelMix: ChannelStat[] = Array.from(channelCounts.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

    // top performing
    let topId: string | null = null;
    let topCount = 0;
    for (const [id, count] of campaignSuccessCount) {
        if (count > topCount) { topCount = count; topId = id; }
    }
    const topPerformingCampaign = topId ? (campaigns.find(c => c.id === topId)?.name ?? null) : null;

    return {
        totalCampaigns: campaigns.length,
        totalPublished,
        totalFailed,
        channelMix,
        topPerformingCampaign,
    };
}

/**
 * 단일 고객사 리포트 생성 (수동 트리거 또는 cron 에서 호출).
 * - PDF 렌더링 → R2 업로드 → DB upsert
 * - R2 미설정 시 통계만 저장 (pdfUrl=null)
 */
export async function generatePartnerClientReport(input: {
    partnerClientId: string;
    periodYearMonth?: string; // 미지정 시 지난달
    generatedBy?: 'cron' | 'manual';
}): Promise<{
    ok: boolean;
    reportId?: string;
    pdfUrl?: string | null;
    error?: string;
}> {
    const callerUser = await getSessionUser();

    const pc = await prisma.partnerClient.findUnique({
        where: { id: input.partnerClientId },
        include: {
            partner: { select: { userId: true, name: true } },
            workspace: { select: { id: true } },
        },
    });
    if (!pc) return { ok: false, error: '고객사를 찾을 수 없습니다' };

    // 권한 — 본인 파트너만 (또는 admin 도 추후 가능)
    if (pc.partner.userId !== callerUser.id) {
        return { ok: false, error: '권한 없음' };
    }

    const periodYearMonth = input.periodYearMonth || dayjs().subtract(1, 'month').format('YYYY-MM');
    const generatedBy = input.generatedBy || 'manual';

    // 통계 집계
    const stats = await aggregateClientPeriod(pc.workspace.id, periodYearMonth);

    // PDF 렌더링 (서버 사이드 — @react-pdf/renderer 의 renderToBuffer 사용)
    let pdfUrl: string | null = null;
    let pdfSizeKb: number | null = null;
    let errorMessage: string | null = null;

    if (isR2Configured()) {
        try {
            const { renderToBuffer } = await import('@react-pdf/renderer');
            const { ClientMonthlyReport } = await import('@/lib/reports/ClientMonthlyReport');

            const element = ClientMonthlyReport({
                period: periodYearMonth,
                clientName: pc.clientName,
                partnerName: pc.partner.name,
                industry: pc.industry,
                totalCampaigns: stats.totalCampaigns,
                totalPublished: stats.totalPublished,
                totalFailed: stats.totalFailed,
                channelMix: stats.channelMix,
                topPerformingCampaign: stats.topPerformingCampaign,
                generatedAt: new Date(),
            });
            const buffer = await renderToBuffer(element as any);

            const upload = await uploadToR2({
                data: buffer,
                keyPrefix: `users/${pc.partner.userId}/reports/${pc.id}`,
                contentType: 'application/pdf',
                filename: `${periodYearMonth}-${pc.clientName.replace(/[^\w가-힣-]/g, '-')}.pdf`,
            });

            pdfUrl = upload.url;
            pdfSizeKb = Math.round(buffer.length / 1024);
        } catch (e: any) {
            console.error('[partnerReport] PDF generation failed', e);
            errorMessage = e?.message || 'PDF 생성 실패';
        }
    } else {
        errorMessage = 'R2 미설정 — 통계만 저장됨 (PDF 다운로드 불가)';
    }

    // upsert
    const report = await prisma.partnerClientReport.upsert({
        where: {
            partnerClientId_periodYearMonth: {
                partnerClientId: pc.id,
                periodYearMonth,
            },
        },
        update: {
            totalCampaigns: stats.totalCampaigns,
            totalPublished: stats.totalPublished,
            totalFailed: stats.totalFailed,
            channelMix: stats.channelMix as any,
            topPerformingCampaign: stats.topPerformingCampaign,
            pdfUrl,
            pdfSizeKb,
            generatedAt: new Date(),
            generatedBy,
            status: pdfUrl ? 'READY' : (errorMessage ? 'FAILED' : 'READY'),
            errorMessage,
        },
        create: {
            partnerClientId: pc.id,
            periodYearMonth,
            totalCampaigns: stats.totalCampaigns,
            totalPublished: stats.totalPublished,
            totalFailed: stats.totalFailed,
            channelMix: stats.channelMix as any,
            topPerformingCampaign: stats.topPerformingCampaign,
            pdfUrl,
            pdfSizeKb,
            generatedBy,
            status: pdfUrl ? 'READY' : (errorMessage ? 'FAILED' : 'READY'),
            errorMessage,
        },
    });

    revalidatePath(`/dashboard/partner/clients/${pc.id}`);
    return { ok: true, reportId: report.id, pdfUrl };
}

/**
 * 고객사의 모든 리포트 목록 (최근순).
 */
export async function listClientReports(partnerClientId: string) {
    const callerUser = await getSessionUser();
    const pc = await prisma.partnerClient.findUnique({
        where: { id: partnerClientId },
        select: { partner: { select: { userId: true } } },
    });
    if (!pc || pc.partner.userId !== callerUser.id) throw new Error('권한 없음');

    return prisma.partnerClientReport.findMany({
        where: { partnerClientId },
        orderBy: { periodYearMonth: 'desc' },
    });
}
