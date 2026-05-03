/**
 * Publisher dispatcher — 채널 type 기반으로 클라우드 직접 발행 vs 에이전트 위임 결정.
 *
 * 클라우드 직접 발행 (HTTP-only API):
 *   - TELEGRAM (✅ 구현)
 *   - WORDPRESS, TISTORY (TODO — REST API 있음)
 *   - LINE, X(Twitter API), LINKEDIN (TODO — OAuth 필요)
 *   - YOUTUBE (TODO — Data API v3)
 *
 * 에이전트 위임 (브라우저 자동화 필요):
 *   - INSTAGRAM, NAVER_BLOG, NAVER_CAFE, FACEBOOK, THREADS, TIKTOK, KAKAO, etc.
 *   - status PENDING 으로 두면 에이전트가 폴링해서 가져감.
 *
 * 본 dispatcher 는 ScheduledTask 단위로 호출되며,
 * - SUCCESS / FAILED 로 status 갱신
 * - errorLog 에 실패 사유 기록
 */
import type { ChannelType, MarketingChannel, ScheduledTask } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { decryptJSON } from '@/lib/crypto/aes';
import { publishToTelegram, type TelegramCredentials } from './telegram';
import { publishToWordPress, type WordPressCredentials } from './wordpress';
import { publishToDiscord, type DiscordCredentials } from './discord';

// HTTP-only 발행 가능 채널 (클라우드 직접 처리)
export const CLOUD_PUBLISHED_CHANNELS = new Set<ChannelType>([
    'TELEGRAM',
    'WORDPRESS',
    'DISCORD',
] as ChannelType[]);

export interface PublishOutcome {
    /** 'cloud' = 즉시 발행 완료, 'agent' = 에이전트가 처리하도록 PENDING 유지 */
    handler: 'cloud' | 'agent';
    success: boolean;
    externalId?: string;
    error?: string;
}

/**
 * 단일 task 발행 시도. 클라우드 처리 가능하면 즉시 실행, 아니면 PENDING 유지.
 *
 * task.status 를 SUCCESS / FAILED 로 갱신 (cloud 케이스만). 에이전트 케이스는 호출 측 결정.
 */
export async function publishTask(taskId: string): Promise<PublishOutcome> {
    const task = await prisma.scheduledTask.findUnique({
        where: { id: taskId },
        include: { channel: true },
    });
    if (!task) throw new Error(`Task ${taskId} 미존재`);
    if (!task.channel) throw new Error(`Task ${taskId} 채널 정보 없음`);

    const channel = task.channel;

    // 에이전트 위임 채널 — 그대로 PENDING (에이전트가 폴링)
    if (!CLOUD_PUBLISHED_CHANNELS.has(channel.type)) {
        return {
            handler: 'agent',
            success: false,
            error: '클라우드 직접 발행 미지원 채널 — 에이전트 폴링 대기 중',
        };
    }

    // ── 자격증명 복호화 ──
    let creds: any;
    try {
        creds = decryptJSON(channel.encryptedCredentials);
    } catch (e: any) {
        await markFailed(taskId, `자격증명 복호화 실패: ${e?.message || e}`);
        return { handler: 'cloud', success: false, error: '자격증명 복호화 실패' };
    }

    try {
        switch (channel.type) {
            case 'TELEGRAM': {
                const result = await publishToTelegram({
                    credentials: creds as TelegramCredentials,
                    text: task.content,
                    photoUrl: extractPhotoUrl(task.mediaUrls),
                });
                await prisma.scheduledTask.update({
                    where: { id: taskId },
                    data: {
                        status: 'SUCCESS',
                        executedAt: new Date(),
                        errorLog: `Telegram message_id=${result.messageId}`,
                    },
                });
                await prisma.marketingChannel.update({
                    where: { id: channel.id },
                    data: { lastUsedAt: new Date(), status: 'ACTIVE' },
                });
                return {
                    handler: 'cloud',
                    success: true,
                    externalId: String(result.messageId),
                };
            }
            case 'WORDPRESS': {
                const result = await publishToWordPress({
                    credentials: creds as WordPressCredentials,
                    content: task.content,
                    photoUrl: extractPhotoUrl(task.mediaUrls),
                });
                await prisma.scheduledTask.update({
                    where: { id: taskId },
                    data: {
                        status: 'SUCCESS',
                        executedAt: new Date(),
                        errorLog: `WordPress post_id=${result.postId} url=${result.link}`,
                    },
                });
                await prisma.marketingChannel.update({
                    where: { id: channel.id },
                    data: { lastUsedAt: new Date(), status: 'ACTIVE' },
                });
                return {
                    handler: 'cloud',
                    success: true,
                    externalId: String(result.postId),
                };
            }
            case 'DISCORD': {
                const result = await publishToDiscord({
                    credentials: creds as DiscordCredentials,
                    text: task.content,
                    photoUrl: extractPhotoUrl(task.mediaUrls),
                    asEmbed: !!extractPhotoUrl(task.mediaUrls), // 이미지 있으면 자동으로 embed
                });
                await prisma.scheduledTask.update({
                    where: { id: taskId },
                    data: {
                        status: 'SUCCESS',
                        executedAt: new Date(),
                        errorLog: `Discord message_id=${result.messageId}`,
                    },
                });
                await prisma.marketingChannel.update({
                    where: { id: channel.id },
                    data: { lastUsedAt: new Date(), status: 'ACTIVE' },
                });
                return {
                    handler: 'cloud',
                    success: true,
                    externalId: result.messageId,
                };
            }
            default: {
                // CLOUD_PUBLISHED_CHANNELS 에 추가했지만 스위치 케이스 없는 경우 (개발자 실수 방지)
                throw new Error(`클라우드 핸들러 미구현 채널: ${channel.type}`);
            }
        }
    } catch (e: any) {
        const msg = e?.message || String(e);
        await markFailed(taskId, msg);
        return { handler: 'cloud', success: false, error: msg };
    }
}

async function markFailed(taskId: string, errorLog: string) {
    try {
        await prisma.scheduledTask.update({
            where: { id: taskId },
            data: {
                status: 'FAILED',
                executedAt: new Date(),
                errorLog: errorLog.slice(0, 1000),
            },
        });
    } catch {
        // 이미 다른 곳에서 갱신됐을 수 있음
    }
}

function extractPhotoUrl(mediaUrls: any): string | undefined {
    if (!mediaUrls) return undefined;
    const arr = Array.isArray(mediaUrls) ? mediaUrls : [];
    const first = arr[0];
    if (typeof first === 'string' && first.startsWith('http')) return first;
    return undefined;
}

/**
 * 사용자 ID 의 PENDING task 중 클라우드 처리 가능한 것만 한꺼번에 실행.
 * scheduledAt 도래 + 미실행만 대상. 5초 이내 짧게 끝나는 작업이라 cron 에서 호출 OK.
 */
export async function publishCloudReadyTasks(opts?: {
    userId?: string;
    /** 최대 처리 개수 (기본 50, cron 1회당 안전한 상한) */
    limit?: number;
}): Promise<{ processed: number; succeeded: number; failed: number }> {
    const limit = opts?.limit ?? 50;
    const now = new Date();
    const tasks = await prisma.scheduledTask.findMany({
        where: {
            status: 'PENDING',
            scheduledAt: { lte: now },
            channel: {
                ...(opts?.userId ? { userId: opts.userId } : {}),
                type: { in: Array.from(CLOUD_PUBLISHED_CHANNELS) },
            },
        },
        orderBy: { scheduledAt: 'asc' },
        take: limit,
        select: { id: true },
    });

    let succeeded = 0, failed = 0;
    for (const t of tasks) {
        try {
            const r = await publishTask(t.id);
            if (r.success) succeeded++; else failed++;
        } catch {
            failed++;
        }
    }
    return { processed: tasks.length, succeeded, failed };
}

export { publishToTelegram, type TelegramCredentials };
export { publishToWordPress, type WordPressCredentials };
export { publishToDiscord, type DiscordCredentials };
