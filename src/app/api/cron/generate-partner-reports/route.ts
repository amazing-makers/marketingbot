import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calcPartnerTier } from '@/lib/partner/tiers';
import { isR2Configured, uploadToR2 } from '@/lib/storage/r2';
import dayjs from 'dayjs';

/**
 * Phase 19 — 매월 1일 새벽, Gold+ 등급 파트너의 활성 고객사별로 PDF 리포트 자동 생성.
 *
 * Vercel cron (vercel.json):
 *   { "path": "/api/cron/generate-partner-reports", "schedule": "30 3 1 * *" }
 *
 * commission cron (03:00) 보다 30분 늦게 실행 — 그 사이에 commission 업데이트 완료.
 *
 * 동작:
 *   1. 모든 ACTIVE 파트너 조회 + 누적 commission 으로 티어 계산
 *   2. Gold/Platinum 등급만 필터
 *   3. 각 파트너의 ACTIVE PartnerClient 들에 대해 지난달 리포트 생성
 *   4. R2 업로드 → PartnerClientReport upsert
 *
 * 보안: Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(req: Request) {
    const auth = req.headers.get('authorization') || '';
    const expected = `Bearer ${process.env.CRON_SECRET || ''}`;
    if (!process.env.CRON_SECRET || auth !== expected) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const periodYearMonth = dayjs().subtract(1, 'month').format('YYYY-MM');
    const [y, m] = periodYearMonth.split('-').map(Number);
    const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
    const end = new Date(y, m, 1, 0, 0, 0, 0);

    // 1. 활성 파트너 + 누적 commission 으로 등급 계산 → Gold+ 만 처리
    const partners = await prisma.reseller.findMany({
        where: { status: 'ACTIVE' },
        select: {
            id: true,
            name: true,
            userId: true,
            commissions: {
                where: { status: { in: ['PENDING', 'PAID'] } },
                select: { amount: true },
            },
            clients: {
                where: { status: 'ACTIVE' },
                select: {
                    id: true,
                    clientName: true,
                    industry: true,
                    workspace: { select: { id: true } },
                },
            },
        },
    });

    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let skippedTier = 0;
    let skippedNoR2 = 0;

    if (!isR2Configured()) {
        skippedNoR2 = partners.flatMap(p => p.clients).length;
        return NextResponse.json({
            ok: true,
            period: periodYearMonth,
            note: 'R2 미설정 — PDF 생성 skip',
            partners: partners.length,
            skippedNoR2,
        });
    }

    // 동적 import (PDF 라이브러리 무거움)
    const { renderToBuffer } = await import('@react-pdf/renderer');
    const { ClientMonthlyReport } = await import('@/lib/reports/ClientMonthlyReport');

    for (const partner of partners) {
        const lifetime = partner.commissions.reduce((s, c) => s + Number(c.amount), 0);
        const tier = calcPartnerTier(lifetime);
        if (tier.current.tier !== 'GOLD' && tier.current.tier !== 'PLATINUM') {
            skippedTier += partner.clients.length;
            continue;
        }

        for (const client of partner.clients) {
            processed++;
            try {
                // 통계 집계 (간단 버전 — partnerReportActions.aggregate 와 동일 로직)
                const campaigns = await prisma.campaign.findMany({
                    where: {
                        workspaceId: client.workspace.id,
                        createdAt: { gte: start, lt: end },
                    },
                    select: { id: true, name: true },
                });
                const campaignIds = campaigns.map(c => c.id);
                const tasks = campaignIds.length > 0 ? await prisma.scheduledTask.findMany({
                    where: { campaignId: { in: campaignIds } },
                    select: { status: true, campaignId: true, channel: { select: { type: true } } },
                }) : [];

                let totalPublished = 0;
                let totalFailed = 0;
                const channelCounts = new Map<string, number>();
                const campaignSuccessCount = new Map<string, number>();
                for (const t of tasks) {
                    if (t.status === 'SUCCESS') {
                        totalPublished++;
                        channelCounts.set(t.channel.type, (channelCounts.get(t.channel.type) ?? 0) + 1);
                        campaignSuccessCount.set(t.campaignId, (campaignSuccessCount.get(t.campaignId) ?? 0) + 1);
                    } else if (t.status === 'FAILED') {
                        totalFailed++;
                    }
                }
                const channelMix = Array.from(channelCounts.entries())
                    .map(([type, count]) => ({ type, count }))
                    .sort((a, b) => b.count - a.count);
                let topId: string | null = null;
                let topCount = 0;
                for (const [id, count] of campaignSuccessCount) {
                    if (count > topCount) { topCount = count; topId = id; }
                }
                const topPerformingCampaign = topId ? (campaigns.find(c => c.id === topId)?.name ?? null) : null;

                // PDF
                const element = ClientMonthlyReport({
                    period: periodYearMonth,
                    clientName: client.clientName,
                    partnerName: partner.name,
                    industry: client.industry,
                    totalCampaigns: campaigns.length,
                    totalPublished,
                    totalFailed,
                    channelMix,
                    topPerformingCampaign,
                    generatedAt: new Date(),
                });
                const buffer = await renderToBuffer(element as any);
                const upload = await uploadToR2({
                    data: buffer,
                    keyPrefix: `users/${partner.userId}/reports/${client.id}`,
                    contentType: 'application/pdf',
                    filename: `${periodYearMonth}-${client.clientName.replace(/[^\w가-힣-]/g, '-')}.pdf`,
                });

                await prisma.partnerClientReport.upsert({
                    where: {
                        partnerClientId_periodYearMonth: { partnerClientId: client.id, periodYearMonth },
                    },
                    update: {
                        totalCampaigns: campaigns.length,
                        totalPublished,
                        totalFailed,
                        channelMix: channelMix as any,
                        topPerformingCampaign,
                        pdfUrl: upload.url,
                        pdfSizeKb: Math.round(buffer.length / 1024),
                        generatedAt: new Date(),
                        generatedBy: 'cron',
                        status: 'READY',
                        errorMessage: null,
                    },
                    create: {
                        partnerClientId: client.id,
                        periodYearMonth,
                        totalCampaigns: campaigns.length,
                        totalPublished,
                        totalFailed,
                        channelMix: channelMix as any,
                        topPerformingCampaign,
                        pdfUrl: upload.url,
                        pdfSizeKb: Math.round(buffer.length / 1024),
                        generatedBy: 'cron',
                        status: 'READY',
                    },
                });
                succeeded++;
            } catch (e: any) {
                console.error('[generate-partner-reports] failed', { partnerId: partner.id, clientId: client.id }, e);
                failed++;
                await prisma.partnerClientReport.upsert({
                    where: {
                        partnerClientId_periodYearMonth: { partnerClientId: client.id, periodYearMonth },
                    },
                    update: { status: 'FAILED', errorMessage: e?.message || 'unknown', generatedBy: 'cron' },
                    create: {
                        partnerClientId: client.id,
                        periodYearMonth,
                        status: 'FAILED',
                        errorMessage: e?.message || 'unknown',
                        generatedBy: 'cron',
                    },
                });
            }
        }
    }

    return NextResponse.json({
        ok: true,
        period: periodYearMonth,
        partners: partners.length,
        processed,
        succeeded,
        failed,
        skippedTier,
    });
}
