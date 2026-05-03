/**
 * Webhook rate limit — 분당 60회 · 일 200회.
 * UserWebhookHit 테이블 카운터 사용 (Prisma upsert + atomic increment).
 *
 * 분 키:  YYYYMMDDHHMM (UTC 기준)
 * 일 키:  YYYYMMDD     (UTC 기준)
 *
 * 만료된 분 카운터는 별도 cron 에서 정리 (>2일 지난 행 삭제 가능).
 */
import { prisma } from '@/lib/prisma';

const MINUTE_LIMIT = 60;
const DAY_LIMIT = 200;

function bucketKeys(now: Date = new Date()): { minute: string; day: string } {
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mi = String(now.getUTCMinutes()).padStart(2, '0');
    return {
        minute: `${yyyy}${mm}${dd}${hh}${mi}`,
        day:    `${yyyy}${mm}${dd}`,
    };
}

export interface RateLimitResult {
    allowed: boolean;
    minuteCount: number;
    dayCount: number;
    minuteRemaining: number;
    dayRemaining: number;
    /** 거부 시 사유. 'minute' | 'day' | undefined */
    deniedBy?: 'minute' | 'day';
}

/**
 * Atomic incr + 한도 검사. 한도 도달 후엔 카운터 증가 안 시킴 (선언만).
 * @returns RateLimitResult — allowed=false 면 deniedBy 사유 포함.
 */
export async function checkAndIncrement(tokenId: string): Promise<RateLimitResult> {
    const { minute, day } = bucketKeys();

    // 두 카운터를 트랜잭션으로 동시 incr
    const [minuteRow, dayRow] = await prisma.$transaction([
        prisma.userWebhookHit.upsert({
            where: { tokenId_bucketKey_bucketType: { tokenId, bucketKey: minute, bucketType: 'minute' } },
            create: { tokenId, bucketKey: minute, bucketType: 'minute', count: 1 },
            update: { count: { increment: 1 } },
        }),
        prisma.userWebhookHit.upsert({
            where: { tokenId_bucketKey_bucketType: { tokenId, bucketKey: day, bucketType: 'day' } },
            create: { tokenId, bucketKey: day, bucketType: 'day', count: 1 },
            update: { count: { increment: 1 } },
        }),
    ]);

    const minuteCount = minuteRow.count;
    const dayCount = dayRow.count;

    if (minuteCount > MINUTE_LIMIT) {
        return {
            allowed: false,
            minuteCount, dayCount,
            minuteRemaining: 0,
            dayRemaining: Math.max(0, DAY_LIMIT - dayCount),
            deniedBy: 'minute',
        };
    }
    if (dayCount > DAY_LIMIT) {
        return {
            allowed: false,
            minuteCount, dayCount,
            minuteRemaining: Math.max(0, MINUTE_LIMIT - minuteCount),
            dayRemaining: 0,
            deniedBy: 'day',
        };
    }
    return {
        allowed: true,
        minuteCount, dayCount,
        minuteRemaining: MINUTE_LIMIT - minuteCount,
        dayRemaining: DAY_LIMIT - dayCount,
    };
}

export const WEBHOOK_LIMITS = { MINUTE_LIMIT, DAY_LIMIT } as const;
