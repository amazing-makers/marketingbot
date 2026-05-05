'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import dayjs from 'dayjs';

async function getSessionUser() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    return session.user;
}

async function requireOwnedClient(partnerClientId: string, userId: string) {
    const pc = await prisma.partnerClient.findUnique({
        where: { id: partnerClientId },
        select: { partner: { select: { userId: true } }, monthlyFee: true, clientName: true },
    });
    if (!pc || pc.partner.userId !== userId) throw new Error('권한 없음');
    return pc;
}

/**
 * 인보이스 번호 생성 — INV-YYYY-MM-NNN (해당 고객사 그 달 시퀀스).
 */
async function nextInvoiceNumber(partnerClientId: string, periodYearMonth: string): Promise<string> {
    const count = await prisma.clientInvoice.count({
        where: { partnerClientId, periodYearMonth },
    });
    const seq = String(count + 1).padStart(3, '0');
    return `INV-${periodYearMonth}-${seq}`;
}

export async function createInvoice(input: {
    partnerClientId: string;
    periodYearMonth?: string;
    amount: number;
    description?: string;
    dueDate?: Date;
}) {
    const user = await getSessionUser();
    await requireOwnedClient(input.partnerClientId, user.id!);

    if (input.amount < 0) throw new Error('금액은 0 이상이어야 합니다');
    const period = input.periodYearMonth || dayjs().subtract(1, 'month').format('YYYY-MM');
    const vat = Math.round(input.amount * 0.1);
    const total = input.amount + vat;
    const invoiceNumber = await nextInvoiceNumber(input.partnerClientId, period);

    const invoice = await prisma.clientInvoice.create({
        data: {
            partnerClientId: input.partnerClientId,
            invoiceNumber,
            periodYearMonth: period,
            amount: input.amount,
            vat,
            total,
            description: input.description,
            dueDate: input.dueDate,
            status: 'DRAFT',
        },
    });

    revalidatePath(`/dashboard/partner/clients/${input.partnerClientId}`);
    return invoice;
}

export async function listClientInvoices(partnerClientId: string) {
    const user = await getSessionUser();
    await requireOwnedClient(partnerClientId, user.id!);
    return prisma.clientInvoice.findMany({
        where: { partnerClientId },
        orderBy: { createdAt: 'desc' },
    });
}

export async function updateInvoiceStatus(input: {
    invoiceId: string;
    status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    paymentMethod?: string;
    paymentNotes?: string;
}) {
    const user = await getSessionUser();
    const inv = await prisma.clientInvoice.findUnique({
        where: { id: input.invoiceId },
        select: { partnerClient: { select: { partner: { select: { userId: true } } } }, partnerClientId: true },
    });
    if (!inv || inv.partnerClient.partner.userId !== user.id) throw new Error('권한 없음');

    const data: any = { status: input.status };
    if (input.status === 'SENT' && !data.sentAt) data.sentAt = new Date();
    if (input.status === 'PAID') {
        data.paidAt = new Date();
        if (input.paymentMethod) data.paymentMethod = input.paymentMethod;
        if (input.paymentNotes) data.paymentNotes = input.paymentNotes;
    }

    await prisma.clientInvoice.update({ where: { id: input.invoiceId }, data });
    revalidatePath(`/dashboard/partner/clients/${inv.partnerClientId}`);
    return { ok: true };
}

export async function deleteInvoice(invoiceId: string) {
    const user = await getSessionUser();
    const inv = await prisma.clientInvoice.findUnique({
        where: { id: invoiceId },
        select: { partnerClient: { select: { partner: { select: { userId: true } } } }, partnerClientId: true },
    });
    if (!inv || inv.partnerClient.partner.userId !== user.id) throw new Error('권한 없음');
    await prisma.clientInvoice.delete({ where: { id: invoiceId } });
    revalidatePath(`/dashboard/partner/clients/${inv.partnerClientId}`);
    return { ok: true };
}
