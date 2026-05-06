'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { calcPartnerTier } from '@/lib/partner/tiers';

async function getSessionUser() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    return session.user;
}

/**
 * 현재 사용자의 권한 플래그 — 사이드바·드롭다운 메뉴 분기용.
 * 비로그인이면 모두 false.
 */
/**
 * Phase 39 — 활성 파트너만 접근 가능한 server-side guard.
 * 파트너 미등록 또는 SUSPENDED 면 throw → caller 가 catch 후 redirect.
 *
 * 사용 예 (server component):
 *   try { await requireActivePartner(); } catch { redirect('/dashboard/partner'); }
 */
export async function requireActivePartner(): Promise<{ resellerId: string; userId: string }> {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    const reseller = await prisma.reseller.findUnique({
        where: { userId: session.user.id },
        select: { id: true, status: true },
    });
    if (!reseller) throw new Error('NOT_PARTNER');
    if (reseller.status !== 'ACTIVE') throw new Error('PARTNER_SUSPENDED');
    return { resellerId: reseller.id, userId: session.user.id };
}

export async function getMyAccountFlags(): Promise<{
    isAdmin: boolean;
    isPartner: boolean;
    partnerStatus: 'ACTIVE' | 'SUSPENDED' | null;
}> {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
        return { isAdmin: false, isPartner: false, partnerStatus: null };
    }

    const adminEmails = (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
    const isAdmin = adminEmails.includes(session.user.email.toLowerCase());

    const reseller = await prisma.reseller.findUnique({
        where: { userId: session.user.id },
        select: { status: true },
    });

    return {
        isAdmin,
        isPartner: !!reseller,
        partnerStatus: (reseller?.status as 'ACTIVE' | 'SUSPENDED') || null,
    };
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
 * 리셀러의 commission 요약 — 누적·이번 달·정산 대기 + 티어 + 시계열.
 */
export async function getMyResellerSummary() {
    const reseller = await getMyReseller();
    if (!reseller) return null;

    const monthsBack = 6;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - monthsBack);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [pending, paid, recentReferrals, monthlyHistory, partnerClientCount] = await Promise.all([
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
        prisma.referralCommission.findMany({
            where: { resellerId: reseller.id },
            select: { periodYearMonth: true, amount: true, status: true },
        }),
        prisma.partnerClient.count({
            where: { partnerId: reseller.id, status: 'ACTIVE' },
        }).catch(() => 0),
    ]);

    // 시계열 — 최근 6개월 commission per month
    const byMonth = new Map<string, number>();
    for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        byMonth.set(key, 0);
    }
    for (const c of monthlyHistory) {
        if (byMonth.has(c.periodYearMonth)) {
            byMonth.set(c.periodYearMonth, (byMonth.get(c.periodYearMonth) || 0) + Number(c.amount));
        }
    }
    const monthlySeries = Array.from(byMonth.entries()).map(([k, v]) => ({
        label: k.slice(2).replace('-', '/'),
        ymKey: k,
        commission: v,
    }));

    const lifetimeCommission = Number(pending._sum.amount || 0) + Number(paid._sum.amount || 0);
    const tierInfo = calcPartnerTier(lifetimeCommission);

    return {
        reseller,
        pendingTotal: Number(pending._sum.amount || 0),
        pendingCount: pending._count,
        paidTotal: Number(paid._sum.amount || 0),
        paidCount: paid._count,
        lifetimeCommission,
        recentReferrals,
        monthlySeries,
        partnerClientCount,
        tierInfo,
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
