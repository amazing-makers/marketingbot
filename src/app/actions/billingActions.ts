'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getStripe, isStripeConfigured, PLANS, type PlanKey } from '@/lib/billing/stripe';
import { revalidatePath } from 'next/cache';

async function getSessionUser() {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) throw new Error('Unauthorized');
    return { id: session.user.id, email: session.user.email, name: session.user.name };
}

/**
 * 사용자의 현재 구독 정보 조회 (자동 생성 보장 — 가입 직후라도 FREE 행 있음).
 */
export async function getMySubscription() {
    const user = await getSessionUser();
    let sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
    if (!sub) {
        sub = await prisma.subscription.create({
            data: { userId: user.id, plan: 'FREE', status: 'active' },
        });
    }
    const planDef = PLANS[sub.plan as PlanKey] || PLANS.FREE;
    return {
        plan: sub.plan as PlanKey,
        planName: planDef.name,
        priceMonthlyKrw: planDef.priceMonthlyKrw,
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd?.toISOString() || null,
        trialEndsAt: sub.trialEndsAt?.toISOString() || null,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        limits: planDef.limits,
    };
}

/**
 * Stripe Checkout 세션 생성 → URL 반환.
 *
 * 호출 흐름:
 *   1. 가격제 페이지에서 사용자 "구독" 버튼 클릭
 *   2. 이 server action 호출 → Stripe checkout URL 받음
 *   3. window.location = url 로 리다이렉트
 *   4. 결제 완료 → success URL 로 돌아옴
 *   5. webhook 이 customer.subscription.created 처리 → DB 갱신
 */
export async function createCheckoutSession(plan: PlanKey): Promise<{ url: string }> {
    const user = await getSessionUser();
    if (!isStripeConfigured()) throw new Error('STRIPE_SECRET_KEY 미설정');

    const planDef = PLANS[plan];
    if (!planDef || !planDef.stripePriceId) {
        throw new Error(`${plan} 플랜의 STRIPE_PRICE_${plan} 환경변수 미설정`);
    }

    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // 기존 customer 재사용 (이메일 단위)
    let customerId: string | undefined;
    const existingSub = await prisma.subscription.findUnique({ where: { userId: user.id } });
    if (existingSub?.stripeCustomerId) customerId = existingSub.stripeCustomerId;

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        ...(customerId ? { customer: customerId } : { customer_email: user.email }),
        line_items: [{ price: planDef.stripePriceId, quantity: 1 }],
        subscription_data: {
            // 14일 무료 체험
            trial_period_days: 14,
            metadata: { userId: user.id, plan },
        },
        client_reference_id: user.id,
        success_url: `${baseUrl}/dashboard/settings/billing?success=true`,
        cancel_url: `${baseUrl}/pricing?cancel=true`,
        allow_promotion_codes: true,
    });

    if (!session.url) throw new Error('Stripe checkout URL 생성 실패');
    return { url: session.url };
}

/**
 * Customer Portal — 구독 변경/취소/카드 업데이트.
 */
export async function createCustomerPortalSession(): Promise<{ url: string }> {
    const user = await getSessionUser();
    if (!isStripeConfigured()) throw new Error('STRIPE_SECRET_KEY 미설정');

    const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
    if (!sub?.stripeCustomerId) {
        throw new Error('아직 결제 정보가 없습니다 — 먼저 구독해주세요.');
    }

    const stripe = getStripe();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const session = await stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: `${baseUrl}/dashboard/settings/billing`,
    });
    return { url: session.url };
}

/**
 * 즉시 구독 취소 (현재 결제기간 종료까지는 유지).
 */
export async function cancelSubscriptionAtPeriodEnd(): Promise<{ ok: boolean; cancelAt?: string }> {
    const user = await getSessionUser();
    if (!isStripeConfigured()) throw new Error('STRIPE_SECRET_KEY 미설정');

    const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
    if (!sub?.stripeSubscriptionId) throw new Error('활성 구독 없음');

    const stripe = getStripe();
    const updated = await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: true,
    });

    await prisma.subscription.update({
        where: { userId: user.id },
        data: {
            cancelAtPeriodEnd: true,
            currentPeriodEnd: updated.current_period_end ? new Date(updated.current_period_end * 1000) : null,
        },
    });

    revalidatePath('/dashboard/settings/billing');
    return {
        ok: true,
        cancelAt: updated.current_period_end ? new Date(updated.current_period_end * 1000).toISOString() : undefined,
    };
}
