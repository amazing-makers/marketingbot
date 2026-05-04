import { NextRequest, NextResponse } from 'next/server';
import { getStripe, planFromPriceId } from '@/lib/billing/stripe';
import { prisma } from '@/lib/prisma';
import type Stripe from 'stripe';

/**
 * Stripe Webhook 엔드포인트.
 *
 * Stripe Dashboard → Developers → Webhooks 에서:
 *   - URL: https://yourapp.com/api/stripe/webhook
 *   - 이벤트 선택: customer.subscription.created/updated/deleted, invoice.payment_failed
 *   - Secret 받아서 STRIPE_WEBHOOK_SECRET 환경변수에 등록
 *
 * 처리하는 이벤트:
 *   - customer.subscription.created/updated → DB Subscription upsert + plan 갱신
 *   - customer.subscription.deleted → plan='FREE' 강등
 *   - invoice.payment_failed → status='past_due' (이메일 알림은 Resend 로 별도)
 */

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature') || '';
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET 미설정' }, { status: 500 });
    }

    const stripe = getStripe();
    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (e: any) {
        console.error('[stripe webhook] signature 검증 실패:', e?.message);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    try {
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const sub = event.data.object as Stripe.Subscription;
                const userId = sub.metadata?.userId;
                const priceId = sub.items.data[0]?.price.id;
                if (!userId) {
                    console.warn('[stripe webhook] subscription metadata.userId 없음', sub.id);
                    break;
                }
                const plan = priceId ? planFromPriceId(priceId) : 'FREE';
                await prisma.subscription.upsert({
                    where: { userId },
                    create: {
                        userId,
                        stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
                        stripeSubscriptionId: sub.id,
                        stripePriceId: priceId,
                        plan,
                        status: sub.status,
                        currentPeriodEnd: (sub as any).current_period_end ? new Date((sub as any).current_period_end * 1000) : null,
                        trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
                        cancelAtPeriodEnd: sub.cancel_at_period_end || false,
                    },
                    update: {
                        stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
                        stripeSubscriptionId: sub.id,
                        stripePriceId: priceId,
                        plan,
                        status: sub.status,
                        currentPeriodEnd: (sub as any).current_period_end ? new Date((sub as any).current_period_end * 1000) : null,
                        trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
                        cancelAtPeriodEnd: sub.cancel_at_period_end || false,
                    },
                });
                break;
            }

            case 'customer.subscription.deleted': {
                const sub = event.data.object as Stripe.Subscription;
                const userId = sub.metadata?.userId;
                if (!userId) break;
                await prisma.subscription.update({
                    where: { userId },
                    data: { plan: 'FREE', status: 'canceled', cancelAtPeriodEnd: false },
                }).catch(() => null);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                const subId = (invoice as any).subscription;
                if (!subId) break;
                await prisma.subscription.updateMany({
                    where: { stripeSubscriptionId: typeof subId === 'string' ? subId : subId.id },
                    data: { status: 'past_due' },
                });
                break;
            }
        }
    } catch (e: any) {
        console.error('[stripe webhook] 처리 실패:', event.type, e?.message);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
