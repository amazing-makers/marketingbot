/**
 * Phase 33 — 플랜별 한도 정의 + 체크 헬퍼.
 *
 * 정책:
 *   - FREE: 매우 제한적 (체험 후 자동 다운그레이드 시 적용)
 *   - FREE_TRIAL: 14일 동안 PRO 와 동일 한도 (만료되면 FREE 로 강등)
 *   - STARTER: 소상공인용
 *   - PRO: 일반 사용자
 *   - BUSINESS: 무제한급
 *
 * enforcement 시점:
 *   - 채널 추가 시 (channel limit)
 *   - 캠페인 생성 시 (daily task limit)
 *   - 시리즈 생성 시 (active series limit)
 *
 * 한도 도달 시 throw 하지 않고 객체 반환 → caller 가 UX 결정.
 */

import { prisma } from '@/lib/prisma';
import dayjs from 'dayjs';

export type PlanCode = 'FREE' | 'FREE_TRIAL' | 'STARTER' | 'PRO' | 'BUSINESS';

export interface PlanLimits {
    /** 등록 가능한 채널 수 */
    maxChannels: number;
    /** 동시 RUNNING 시리즈 수 */
    maxActiveSeries: number;
    /** 하루에 생성·발행 가능한 task 수 (스케줄링 시점 기준) */
    dailyTaskLimit: number;
    /** AI 캡션 생성 일일 한도 */
    aiCaptionDaily: number;
    /** AI 이미지 생성 일일 한도 */
    aiImageDaily: number;
    /** 라벨 — UI 표시용 */
    label: string;
}

const LIMITS: Record<PlanCode, PlanLimits> = {
    FREE: {
        maxChannels: 2,
        maxActiveSeries: 1,
        dailyTaskLimit: 5,
        aiCaptionDaily: 5,
        aiImageDaily: 2,
        label: 'FREE (제한적)',
    },
    FREE_TRIAL: {
        maxChannels: 10,
        maxActiveSeries: 5,
        dailyTaskLimit: 100,
        aiCaptionDaily: 100,
        aiImageDaily: 30,
        label: 'FREE_TRIAL (14일 체험)',
    },
    STARTER: {
        maxChannels: 5,
        maxActiveSeries: 3,
        dailyTaskLimit: 30,
        aiCaptionDaily: 30,
        aiImageDaily: 10,
        label: 'STARTER',
    },
    PRO: {
        maxChannels: 20,
        maxActiveSeries: 10,
        dailyTaskLimit: 200,
        aiCaptionDaily: 300,
        aiImageDaily: 100,
        label: 'PRO',
    },
    BUSINESS: {
        // 무료 전환 — 사실상 무제한 (전 기능 개방).
        maxChannels: 1_000_000,
        maxActiveSeries: 1_000_000,
        dailyTaskLimit: 1_000_000,
        aiCaptionDaily: 1_000_000,
        aiImageDaily: 1_000_000,
        label: '무료(무제한)',
    },
};

/**
 * 사용자의 현재 effective 플랜을 결정.
 *   1. 활성 유료 구독 있으면 그 플랜
 *   2. FREE_TRIAL 라이센스 만료 안 됐으면 FREE_TRIAL
 *   3. 그 외 FREE
 */
export async function getUserEffectivePlan(_userId: string): Promise<PlanCode> {
    // 무료 전환 — 모든 사용자에게 전 기능 개방(무제한). 구독/Stripe 는 휴면.
    // (수익은 향후 유료티어/광고로 재설계 — 현재는 한도 없음.)
    return 'BUSINESS';
}

export function getPlanLimits(plan: PlanCode): PlanLimits {
    return LIMITS[plan] || LIMITS.FREE;
}

/**
 * 일일 task 한도 체크 (오늘 생성된 ScheduledTask 수 + 추가하려는 N개가 한도 이하인지).
 *
 * 사용처: createCampaign / createSplitCampaign / processSeriesOnce 시작 부분에서 호출.
 * caller 가 throw 시킬지 결정.
 */
export async function checkDailyTaskLimit(
    userId: string,
    addingCount: number = 1,
): Promise<{ allowed: boolean; current: number; limit: number; plan: PlanCode; remaining: number }> {
    const plan = await getUserEffectivePlan(userId);
    const limit = getPlanLimits(plan).dailyTaskLimit;
    const startOfDay = dayjs().startOf('day').toDate();

    const current = await prisma.scheduledTask.count({
        where: {
            campaign: { userId },
            createdAt: { gte: startOfDay },
        },
    });

    const remaining = Math.max(0, limit - current);
    const allowed = current + addingCount <= limit;
    return { allowed, current, limit, plan, remaining };
}

/**
 * 채널 추가 한도 체크.
 */
export async function checkChannelLimit(userId: string): Promise<{
    allowed: boolean; current: number; limit: number; plan: PlanCode;
}> {
    const plan = await getUserEffectivePlan(userId);
    const limit = getPlanLimits(plan).maxChannels;
    const current = await prisma.marketingChannel.count({ where: { userId } });
    return { allowed: current < limit, current, limit, plan };
}

/**
 * 활성 시리즈 한도 체크.
 */
export async function checkActiveSeriesLimit(userId: string): Promise<{
    allowed: boolean; current: number; limit: number; plan: PlanCode;
}> {
    const plan = await getUserEffectivePlan(userId);
    const limit = getPlanLimits(plan).maxActiveSeries;
    const current = await prisma.campaignSeries.count({
        where: { userId, status: 'RUNNING' },
    });
    return { allowed: current < limit, current, limit, plan };
}

/**
 * 사용자의 오늘 사용량 + 한도 요약 — UI 표시용.
 */
export async function getUsageSummary(userId: string): Promise<{
    plan: PlanCode;
    limits: PlanLimits;
    usage: {
        channels: number;
        activeSeries: number;
        todayTasks: number;
    };
    pctUsed: {
        channels: number;
        activeSeries: number;
        todayTasks: number;
    };
}> {
    const plan = await getUserEffectivePlan(userId);
    const limits = getPlanLimits(plan);
    const startOfDay = dayjs().startOf('day').toDate();

    const [channels, activeSeries, todayTasks] = await Promise.all([
        prisma.marketingChannel.count({ where: { userId } }),
        prisma.campaignSeries.count({ where: { userId, status: 'RUNNING' } }),
        prisma.scheduledTask.count({ where: { campaign: { userId }, createdAt: { gte: startOfDay } } }),
    ]);

    return {
        plan,
        limits,
        usage: { channels, activeSeries, todayTasks },
        pctUsed: {
            channels: Math.min(100, Math.round((channels / limits.maxChannels) * 100)),
            activeSeries: Math.min(100, Math.round((activeSeries / limits.maxActiveSeries) * 100)),
            todayTasks: Math.min(100, Math.round((todayTasks / limits.dailyTaskLimit) * 100)),
        },
    };
}
