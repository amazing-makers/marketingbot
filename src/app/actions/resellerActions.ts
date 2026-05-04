'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

async function getSessionUser() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    return session.user;
}

/**
 * 현재 로그인한 사용자가 리셀러인지 확인 + 정보 반환.
 */
export async function getMyReseller() {
    const user = await getSessionUser();
    return prisma.reseller.findUnique({
        where: { userId: user.id! },
        include: {
            referralCodes: {
                include: { _count: { select: { referrals: true } } },
                orderBy: { createdAt: 'desc' },
            },
        },
    });
}

/**
 * 리셀러로 등록 (사용자가 직접 신청 → 슈퍼관리자 승인은 추후. 현재는 즉시 ACTIVE).
 */
export async function registerAsReseller(input: {
    name: string;
    contactEmail: string;
    taxStatus: 'INDIVIDUAL' | 'BUSINESS';
    businessNumber?: string;
    bankAccount?: string;
}): Promise<{ id: string; defaultCode: string }> {
    const user = await getSessionUser();

    const existing = await prisma.reseller.findUnique({ where: { userId: user.id! } });
    if (existing) throw new Error('이미 리셀러로 등록되어 있습니다.');

    if (!input.name?.trim()) throw new Error('이름을 입력하세요');
    if (input.taxStatus === 'BUSINESS' && !input.businessNumber?.trim()) {
        throw new Error('사업자 번호를 입력하세요');
    }

    // 기본 코드 자동 생성 (이름 첫 글자 + random 4자리)
    const codePrefix = input.name.replace(/[^A-Z0-9가-힣]/gi, '').toUpperCase().slice(0, 6) || 'RESELLER';
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const defaultCode = `${codePrefix}-${random}`;

    const result = await prisma.$transaction(async (tx) => {
        const reseller = await tx.reseller.create({
            data: {
                userId: user.id!,
                name: input.name.trim(),
                contactEmail: input.contactEmail.trim(),
                taxStatus: input.taxStatus,
                businessNumber: input.businessNumber?.trim(),
                bankAccount: input.bankAccount?.trim(),
            },
        });
        const code = await tx.referralCode.create({
            data: {
                code: defaultCode,
                resellerId: reseller.id,
                description: '기본 코드 (자동 생성)',
            },
        });
        return { id: reseller.id, defaultCode: code.code };
    });

    revalidatePath('/dashboard/reseller');
    return result;
}

/**
 * 리셀러의 commission 요약 — 누적·이번 달·정산 대기.
 */
export async function getMyResellerSummary() {
    const reseller = await getMyReseller();
    if (!reseller) return null;

    const [pending, paid, recentReferrals] = await Promise.all([
        prisma.referralCommission.aggregate({
            where: { resellerId: reseller.id, status: 'PENDING' },
            _sum: { amount: true },
            _count: true,
        }),
        prisma.referralCommission.aggregate({
            where: { resellerId: reseller.id, status: 'PAID' },
            _sum: { amount: true },
            _count: true,
        }),
        prisma.user.findMany({
            where: { referredByCode: { resellerId: reseller.id } },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                subscription: { select: { plan: true, status: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 30,
        }),
    ]);

    return {
        reseller,
        pendingTotal: Number(pending._sum.amount || 0),
        pendingCount: pending._count,
        paidTotal: Number(paid._sum.amount || 0),
        paidCount: paid._count,
        recentReferrals,
    };
}

/**
 * 리셀러가 새 커스텀 코드 추가 (예: 이벤트별·캠페인별 분리).
 */
export async function createReferralCode(input: { code: string; description?: string }) {
    const user = await getSessionUser();
    const reseller = await prisma.reseller.findUnique({ where: { userId: user.id! } });
    if (!reseller) throw new Error('리셀러로 등록되어 있지 않습니다');

    const normalized = input.code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '-');
    if (normalized.length < 4) throw new Error('코드는 4자 이상이어야 합니다');

    const dup = await prisma.referralCode.findUnique({ where: { code: normalized } });
    if (dup) throw new Error('이미 사용 중인 코드입니다');

    const created = await prisma.referralCode.create({
        data: {
            code: normalized,
            resellerId: reseller.id,
            description: input.description?.trim(),
        },
    });
    revalidatePath('/dashboard/reseller');
    return created;
}
