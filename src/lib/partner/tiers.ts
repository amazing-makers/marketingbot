/**
 * 파트너 티어 시스템 — 누적 commission 기준 자동 승급.
 *
 * 'use server' 파일에서는 async 함수만 export 가능하므로 티어 정의·계산은 별도 모듈.
 */

export type PartnerTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface TierDef {
    tier: PartnerTier;
    label: string;
    emoji: string;
    color: string;
    minLifetimeCommissionKrw: number;
    commissionRate: number;
    perks: string[];
}

export const PARTNER_TIERS: TierDef[] = [
    {
        tier: 'BRONZE',
        label: '브론즈',
        emoji: '🥉',
        color: 'orange',
        minLifetimeCommissionKrw: 0,
        commissionRate: 0.10,
        perks: ['10% 수수료', '기본 추천 코드', '월별 정산'],
    },
    {
        tier: 'SILVER',
        label: '실버',
        emoji: '🥈',
        color: 'gray',
        minLifetimeCommissionKrw: 1_000_000,
        commissionRate: 0.12,
        perks: ['12% 수수료', '커스텀 코드 무제한', '우선 지원'],
    },
    {
        tier: 'GOLD',
        label: '골드',
        emoji: '🥇',
        color: 'yellow',
        minLifetimeCommissionKrw: 5_000_000,
        commissionRate: 0.15,
        perks: ['15% 수수료', '월간 자동 리포트', '브랜드 키트', '전담 매니저'],
    },
    {
        tier: 'PLATINUM',
        label: '플래티넘',
        emoji: '💎',
        color: 'violet',
        minLifetimeCommissionKrw: 20_000_000,
        commissionRate: 0.20,
        perks: ['20% 수수료', 'co-marketing', '전용 API quota', 'beta 기능 우선', '연 1회 파트너 컨퍼런스 초대'],
    },
];

export interface TierInfo {
    current: TierDef;
    next: TierDef | null;
    progressPercent: number;
    amountToNextKrw: number;
}

export function calcPartnerTier(lifetimeCommissionKrw: number): TierInfo {
    let current = PARTNER_TIERS[0];
    let next: TierDef | null = PARTNER_TIERS[1] || null;
    for (let i = PARTNER_TIERS.length - 1; i >= 0; i--) {
        if (lifetimeCommissionKrw >= PARTNER_TIERS[i].minLifetimeCommissionKrw) {
            current = PARTNER_TIERS[i];
            next = PARTNER_TIERS[i + 1] || null;
            break;
        }
    }
    if (!next) {
        return { current, next: null, progressPercent: 100, amountToNextKrw: 0 };
    }
    const range = next.minLifetimeCommissionKrw - current.minLifetimeCommissionKrw;
    const progress = lifetimeCommissionKrw - current.minLifetimeCommissionKrw;
    return {
        current,
        next,
        progressPercent: Math.min(100, Math.round((progress / range) * 100)),
        amountToNextKrw: Math.max(0, next.minLifetimeCommissionKrw - lifetimeCommissionKrw),
    };
}
