/**
 * Stripe SDK 초기화 + 플랜 정의 + 헬퍼.
 *
 * 환경변수:
 *   STRIPE_SECRET_KEY        — sk_live_... 또는 sk_test_...
 *   STRIPE_WEBHOOK_SECRET    — webhook 서명 검증
 *   NEXT_PUBLIC_APP_URL      — checkout success/cancel 리다이렉트 base
 *
 * 플랜 정의는 코드에 하드코딩 (Stripe Dashboard 의 Price ID 와 매핑).
 * 사용자가 Stripe Dashboard 에서 가격 만들고 그 priceId 를 .env 또는 아래 PLANS 에 입력.
 */
import Stripe from 'stripe';

let cached: Stripe | null = null;

export function getStripe(): Stripe {
    if (cached) return cached;
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY 환경변수 미설정');
    cached = new Stripe(key, {
        apiVersion: '2025-09-30.clover' as any,
        typescript: true,
        appInfo: { name: 'MarketingBot', version: '0.1.0' },
    });
    return cached;
}

export function isStripeConfigured(): boolean {
    return !!process.env.STRIPE_SECRET_KEY;
}

export type PlanKey = 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS';

export interface PlanDefinition {
    key: PlanKey;
    name: string;
    /** 월 가격 (원) — UI 표시용. 실제 결제는 Stripe Price ID 가 결정 */
    priceMonthlyKrw: number;
    /** Stripe Price ID — Dashboard 에서 만든 것 */
    stripePriceId?: string;
    description: string;
    features: string[];
    /** 한도 — 빌링 외 코드에서도 사용 (사용량 차단) */
    limits: {
        channels: number;
        campaignsPerMonth: number;
        aiCaptionsPerMonth: number;
        aiImagesPerMonth: number;
        teamMembers: number;
    };
    highlight?: boolean;
}

export const PLANS: Record<PlanKey, PlanDefinition> = {
    FREE: {
        key: 'FREE',
        name: '무료',
        priceMonthlyKrw: 0,
        description: '개인 사용자, 도구 체험용',
        features: [
            '채널 2개',
            '월 10개 캠페인',
            'AI 캡션 30회/월 (Gemini Free)',
            'AI 이미지 10회/월 (Pollinations 무료)',
            '커뮤니티 지원',
        ],
        limits: { channels: 2, campaignsPerMonth: 10, aiCaptionsPerMonth: 30, aiImagesPerMonth: 10, teamMembers: 1 },
    },
    STARTER: {
        key: 'STARTER',
        name: '스타터',
        priceMonthlyKrw: 19000,
        stripePriceId: process.env.STRIPE_PRICE_STARTER,
        description: '1인 마케터·소상공인',
        features: [
            '채널 5개',
            '월 50개 캠페인',
            'AI 캡션 200회/월',
            'AI 이미지 50회/월',
            '데스크톱 에이전트 1대',
            '이메일 지원',
        ],
        limits: { channels: 5, campaignsPerMonth: 50, aiCaptionsPerMonth: 200, aiImagesPerMonth: 50, teamMembers: 1 },
    },
    PRO: {
        key: 'PRO',
        name: '프로',
        priceMonthlyKrw: 49000,
        stripePriceId: process.env.STRIPE_PRICE_PRO,
        description: '소규모 팀·에이전시',
        features: [
            '채널 20개',
            '월 500개 캠페인',
            'AI 캡션 무제한',
            'AI 이미지 500회/월 (DALL-E 포함)',
            '데스크톱 에이전트 5대',
            '팀 멤버 5명',
            '우선 이메일 지원',
        ],
        limits: { channels: 20, campaignsPerMonth: 500, aiCaptionsPerMonth: 999999, aiImagesPerMonth: 500, teamMembers: 5 },
        highlight: true,
    },
    BUSINESS: {
        key: 'BUSINESS',
        name: '비즈니스',
        priceMonthlyKrw: 199000,
        stripePriceId: process.env.STRIPE_PRICE_BUSINESS,
        description: '에이전시·중견 기업',
        features: [
            '채널 무제한',
            '캠페인 무제한',
            'AI 무제한',
            '데스크톱 에이전트 무제한',
            '팀 멤버 무제한',
            '워크스페이스 다중 브랜드',
            '전담 매니저 + 전화 지원',
        ],
        limits: { channels: 999999, campaignsPerMonth: 999999, aiCaptionsPerMonth: 999999, aiImagesPerMonth: 999999, teamMembers: 999999 },
    },
};

/** Stripe priceId → PlanKey 역매핑 (webhook 처리용) */
export function planFromPriceId(priceId: string): PlanKey {
    for (const [key, def] of Object.entries(PLANS)) {
        if (def.stripePriceId === priceId) return key as PlanKey;
    }
    return 'FREE';
}
