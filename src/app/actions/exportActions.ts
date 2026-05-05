'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getActiveWorkspaceFilter } from '@/lib/workspace/scope';
import dayjs from 'dayjs';

async function getSessionUser() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    return session.user;
}

/**
 * CSV 행 escape — 콤마/줄바꿈/따옴표 포함 시 큰따옴표로 감싸기.
 */
function csvCell(value: any): string {
    if (value === null || value === undefined) return '';
    const s = String(value);
    if (s.includes(',') || s.includes('\n') || s.includes('"')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function toCsv(rows: Record<string, any>[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const lines = [headers.join(',')];
    for (const row of rows) {
        lines.push(headers.map(h => csvCell(row[h])).join(','));
    }
    // BOM + Windows 줄바꿈 — Excel 한글 호환
    return '﻿' + lines.join('\r\n');
}

/**
 * 캠페인 CSV — 활성 워크스페이스 기준.
 */
export async function exportCampaignsCsv(): Promise<string> {
    const user = await getSessionUser();
    const filter = await getActiveWorkspaceFilter(user.id!);

    const campaigns = await prisma.campaign.findMany({
        where: { userId: filter.userId, workspaceId: filter.workspaceId },
        select: {
            id: true,
            name: true,
            description: true,
            status: true,
            scheduledAt: true,
            completedAt: true,
            createdAt: true,
            seriesId: true,
            _count: { select: { tasks: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5000,
    });

    const rows = campaigns.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description ?? '',
        status: c.status,
        scheduledAt: c.scheduledAt ? dayjs(c.scheduledAt).format('YYYY-MM-DD HH:mm:ss') : '',
        completedAt: c.completedAt ? dayjs(c.completedAt).format('YYYY-MM-DD HH:mm:ss') : '',
        seriesId: c.seriesId ?? '',
        taskCount: c._count.tasks,
        createdAt: dayjs(c.createdAt).format('YYYY-MM-DD HH:mm:ss'),
    }));

    return toCsv(rows);
}

/**
 * 채널 CSV — 자격증명 제외.
 */
export async function exportChannelsCsv(): Promise<string> {
    const user = await getSessionUser();
    const filter = await getActiveWorkspaceFilter(user.id!);

    const channels = await prisma.marketingChannel.findMany({
        where: { userId: filter.userId, workspaceId: filter.workspaceId },
        select: {
            id: true, type: true, accountName: true, status: true,
            region: true, language: true, lastUsedAt: true, createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    const rows = channels.map(c => ({
        id: c.id,
        type: c.type,
        accountName: c.accountName,
        status: c.status,
        region: c.region,
        language: c.language,
        lastUsedAt: c.lastUsedAt ? dayjs(c.lastUsedAt).format('YYYY-MM-DD HH:mm:ss') : '',
        createdAt: dayjs(c.createdAt).format('YYYY-MM-DD HH:mm:ss'),
    }));

    return toCsv(rows);
}

/**
 * 발행된 task CSV — 캠페인별 task 상세 (성공/실패/시간).
 */
export async function exportTasksCsv(): Promise<string> {
    const user = await getSessionUser();
    const filter = await getActiveWorkspaceFilter(user.id!);

    const tasks = await prisma.scheduledTask.findMany({
        where: {
            campaign: { userId: filter.userId, workspaceId: filter.workspaceId },
        },
        select: {
            id: true,
            status: true,
            scheduledAt: true,
            executedAt: true,
            errorLog: true,
            campaign: { select: { name: true } },
            channel: { select: { type: true, accountName: true } },
        },
        orderBy: { scheduledAt: 'desc' },
        take: 10000,
    });

    const rows = tasks.map(t => ({
        id: t.id,
        campaign: t.campaign.name,
        channelType: t.channel.type,
        accountName: t.channel.accountName,
        status: t.status,
        scheduledAt: dayjs(t.scheduledAt).format('YYYY-MM-DD HH:mm:ss'),
        executedAt: t.executedAt ? dayjs(t.executedAt).format('YYYY-MM-DD HH:mm:ss') : '',
        errorLog: t.errorLog ?? '',
    }));

    return toCsv(rows);
}

/**
 * 인보이스 CSV — 파트너 본인의 모든 고객사 인보이스.
 */
export async function exportInvoicesCsv(): Promise<string> {
    const user = await getSessionUser();
    const reseller = await prisma.reseller.findUnique({ where: { userId: user.id! }, select: { id: true } });
    if (!reseller) return '';

    const invoices = await prisma.clientInvoice.findMany({
        where: { partnerClient: { partnerId: reseller.id } },
        include: { partnerClient: { select: { clientName: true } } },
        orderBy: { createdAt: 'desc' },
    });

    const rows = invoices.map(inv => ({
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.partnerClient.clientName,
        period: inv.periodYearMonth,
        amount: inv.amount,
        vat: inv.vat,
        total: inv.total,
        status: inv.status,
        dueDate: inv.dueDate ? dayjs(inv.dueDate).format('YYYY-MM-DD') : '',
        sentAt: inv.sentAt ? dayjs(inv.sentAt).format('YYYY-MM-DD') : '',
        paidAt: inv.paidAt ? dayjs(inv.paidAt).format('YYYY-MM-DD') : '',
        paymentMethod: inv.paymentMethod ?? '',
        description: inv.description ?? '',
        createdAt: dayjs(inv.createdAt).format('YYYY-MM-DD HH:mm:ss'),
    }));

    return toCsv(rows);
}
