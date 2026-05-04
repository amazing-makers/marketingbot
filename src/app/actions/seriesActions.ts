'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { TaskStatus } from '@prisma/client';
import { generateCaption, type ContentBrief } from '@/lib/ai/caption';
import { generateImage } from '@/lib/ai/image-gen';
import { isR2Configured, uploadToR2 } from '@/lib/storage/r2';
import { translateText } from '@/lib/ai/translator';

async function getSessionUser() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    return session.user;
}

// ════════════════════════════════════════════════════════════
//  타입
// ════════════════════════════════════════════════════════════
export type SeriesMode = 'POOL_VARY' | 'AI_FRESH' | 'POOL_SIMILAR' | 'PARAPHRASE';
export type ScheduleType = 'INTERVAL' | 'DAILY' | 'WEEKLY' | 'FIXED_COUNT';
export type SeriesStatus = 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';

export interface CreateSeriesInput {
    name: string;
    channelIds: string[];
    mode: SeriesMode;
    scheduleType: ScheduleType;
    intervalHours?: number;
    dailyTimes?: string[];   // 'HH:mm' 형식
    weeklyDays?: number[];   // 0=일 ~ 6=토
    totalPosts: number;
    mediaPool?: string[];    // R2 URL 배열
    contentSeed?: string;
    briefData?: ContentBrief;
    startAt?: Date;
    endAt?: Date;
    /** 시작 시점부터 즉시 RUNNING 으로 시작 (false 면 DRAFT 로 저장 후 사용자가 시작) */
    startNow?: boolean;
}

// ════════════════════════════════════════════════════════════
//  CRUD
// ════════════════════════════════════════════════════════════

export async function createSeries(input: CreateSeriesInput): Promise<{ id: string }> {
    const user = await getSessionUser();
    if (!input.name?.trim()) throw new Error('시리즈 이름을 입력하세요');
    if (!input.channelIds?.length) throw new Error('채널을 1개 이상 선택하세요');
    if (input.totalPosts < 1 || input.totalPosts > 1000) {
        throw new Error('총 발행 수는 1-1000 사이여야 합니다');
    }

    const startAt = input.startAt || new Date();
    const status: SeriesStatus = input.startNow ? 'RUNNING' : 'DRAFT';
    const nextRunAt = status === 'RUNNING' ? computeNextRun({
        scheduleType: input.scheduleType,
        intervalHours: input.intervalHours,
        dailyTimes: input.dailyTimes,
        weeklyDays: input.weeklyDays,
        startAt,
        endAt: input.endAt,
        totalPosts: input.totalPosts,
        completedPosts: 0,
        from: startAt,
    }) : null;

    const series = await prisma.campaignSeries.create({
        data: {
            userId: user.id!,
            name: input.name.trim(),
            channelIds: input.channelIds as any,
            mode: input.mode,
            scheduleType: input.scheduleType,
            intervalHours: input.intervalHours,
            dailyTimes: input.dailyTimes as any,
            weeklyDays: input.weeklyDays as any,
            totalPosts: input.totalPosts,
            mediaPool: input.mediaPool as any,
            contentSeed: input.contentSeed,
            briefData: input.briefData as any,
            status,
            startAt,
            endAt: input.endAt,
            nextRunAt,
        },
    });
    revalidatePath('/dashboard/campaigns/series');
    return { id: series.id };
}

export async function listSeries() {
    const user = await getSessionUser();
    const list = await prisma.campaignSeries.findMany({
        where: { userId: user.id! },
        orderBy: { createdAt: 'desc' },
    });
    return list.map(s => ({
        id: s.id,
        name: s.name,
        mode: s.mode,
        scheduleType: s.scheduleType,
        status: s.status,
        totalPosts: s.totalPosts,
        completedPosts: s.completedPosts,
        failedPosts: s.failedPosts,
        startAt: s.startAt.toISOString(),
        endAt: s.endAt?.toISOString() || null,
        nextRunAt: s.nextRunAt?.toISOString() || null,
        lastRunAt: s.lastRunAt?.toISOString() || null,
        lastError: s.lastError,
        channelCount: Array.isArray(s.channelIds) ? (s.channelIds as any[]).length : 0,
        mediaPoolCount: Array.isArray(s.mediaPool) ? (s.mediaPool as any[]).length : 0,
    }));
}

export async function updateSeriesStatus(id: string, status: 'RUNNING' | 'PAUSED' | 'COMPLETED'): Promise<{ ok: boolean }> {
    const user = await getSessionUser();
    const series = await prisma.campaignSeries.findFirst({ where: { id, userId: user.id! } });
    if (!series) throw new Error('시리즈 미존재');

    let nextRunAt: Date | null = series.nextRunAt;
    if (status === 'RUNNING' && !nextRunAt) {
        nextRunAt = computeNextRun({
            scheduleType: series.scheduleType as any,
            intervalHours: series.intervalHours || undefined,
            dailyTimes: (series.dailyTimes as any) || undefined,
            weeklyDays: (series.weeklyDays as any) || undefined,
            startAt: series.startAt,
            endAt: series.endAt || undefined,
            totalPosts: series.totalPosts,
            completedPosts: series.completedPosts,
            from: new Date(),
        });
    } else if (status !== 'RUNNING') {
        // PAUSED/COMPLETED 면 다음 발행 X
        nextRunAt = null;
    }

    await prisma.campaignSeries.update({
        where: { id },
        data: { status, nextRunAt },
    });
    revalidatePath('/dashboard/campaigns/series');
    return { ok: true };
}

export async function deleteSeries(id: string): Promise<{ ok: boolean }> {
    const user = await getSessionUser();
    await prisma.campaignSeries.delete({ where: { id, userId: user.id! } });
    revalidatePath('/dashboard/campaigns/series');
    return { ok: true };
}

/**
 * 시리즈 상세 + 이 시리즈가 생성한 캠페인들의 task 통계 + 최근 발행 이력.
 */
export async function getSeriesDetail(id: string) {
    const user = await getSessionUser();
    const series = await prisma.campaignSeries.findFirst({
        where: { id, userId: user.id! },
    });
    if (!series) throw new Error('시리즈 미존재');

    // 이 시리즈에서 만들어진 캠페인들 — seriesId FK 정확 매칭 (Phase 9).
    // 이전 버전 (description 매칭) 호환을 위해 OR 조건도 유지.
    const campaigns = await prisma.campaign.findMany({
        where: {
            userId: user.id!,
            OR: [
                { seriesId: series.id },
                {
                    seriesId: null,
                    name: { startsWith: `[시리즈] ${series.name}` },
                },
            ],
        },
        include: {
            tasks: {
                include: { channel: { select: { type: true, accountName: true } } },
                orderBy: { scheduledAt: 'desc' },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });

    // task 통계
    const allTasks = campaigns.flatMap(c => c.tasks);
    const stats = {
        total: allTasks.length,
        pending: allTasks.filter(t => t.status === 'PENDING').length,
        running: allTasks.filter(t => t.status === 'RUNNING').length,
        success: allTasks.filter(t => t.status === 'SUCCESS').length,
        failed: allTasks.filter(t => t.status === 'FAILED').length,
        cancelled: allTasks.filter(t => t.status === 'CANCELLED').length,
    };

    // 최근 발행 30건
    const recentTasks = allTasks.slice(0, 30).map(t => ({
        id: t.id,
        campaignId: t.campaignId,
        content: t.content.slice(0, 200),
        channelType: t.channel.type,
        accountName: t.channel.accountName,
        status: t.status,
        scheduledAt: t.scheduledAt.toISOString(),
        executedAt: t.executedAt?.toISOString() || null,
        errorLog: t.errorLog?.slice(0, 300) || null,
    }));

    return {
        series: {
            id: series.id,
            name: series.name,
            mode: series.mode,
            scheduleType: series.scheduleType,
            intervalHours: series.intervalHours,
            dailyTimes: (series.dailyTimes as any) || [],
            weeklyDays: (series.weeklyDays as any) || [],
            totalPosts: series.totalPosts,
            completedPosts: series.completedPosts,
            failedPosts: series.failedPosts,
            mediaPool: (series.mediaPool as any) || [],
            contentSeed: series.contentSeed,
            briefData: (series.briefData as any) || {},
            channelIds: (series.channelIds as any) || [],
            status: series.status,
            startAt: series.startAt.toISOString(),
            endAt: series.endAt?.toISOString() || null,
            nextRunAt: series.nextRunAt?.toISOString() || null,
            lastRunAt: series.lastRunAt?.toISOString() || null,
            lastError: series.lastError,
        },
        stats,
        recentTasks,
        campaignCount: campaigns.length,
    };
}

// ════════════════════════════════════════════════════════════
//  스케줄 계산 (다음 nextRunAt)
// ════════════════════════════════════════════════════════════
function computeNextRun(opts: {
    scheduleType: ScheduleType;
    intervalHours?: number;
    dailyTimes?: string[];   // ['09:00','12:00','19:00']
    weeklyDays?: number[];   // [1,3,5]
    startAt: Date;
    endAt?: Date;
    totalPosts: number;
    completedPosts: number;
    from: Date;
}): Date | null {
    const { scheduleType, from, endAt, totalPosts, completedPosts, startAt } = opts;
    if (completedPosts >= totalPosts) return null;
    if (endAt && from >= endAt) return null;

    if (scheduleType === 'INTERVAL') {
        const hours = opts.intervalHours || 3;
        const candidate = new Date(from.getTime() + hours * 60 * 60 * 1000);
        if (endAt && candidate > endAt) return null;
        return candidate;
    }

    if (scheduleType === 'DAILY' || scheduleType === 'WEEKLY') {
        const times = opts.dailyTimes && opts.dailyTimes.length > 0 ? opts.dailyTimes : ['09:00'];
        const days = scheduleType === 'WEEKLY' ? (opts.weeklyDays && opts.weeklyDays.length ? opts.weeklyDays : [1, 3, 5]) : null;
        // 향후 14일 이내 중 가장 빠른 매치
        for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
            const day = new Date(from);
            day.setDate(day.getDate() + dayOffset);
            day.setHours(0, 0, 0, 0);
            if (days && !days.includes(day.getDay())) continue;
            for (const t of times) {
                const [h, m] = t.split(':').map(Number);
                const candidate = new Date(day);
                candidate.setHours(h || 9, m || 0, 0, 0);
                if (candidate > from && (!endAt || candidate <= endAt)) {
                    return candidate;
                }
            }
        }
        return null;
    }

    if (scheduleType === 'FIXED_COUNT') {
        // startAt~endAt 사이 totalPosts 개 균등 분배
        if (!endAt) return null;
        const totalMs = endAt.getTime() - startAt.getTime();
        if (totalMs <= 0) return null;
        const stepMs = totalMs / Math.max(1, totalPosts);
        const candidate = new Date(startAt.getTime() + stepMs * (completedPosts + 1));
        if (candidate <= from) return new Date(from.getTime() + 5 * 60 * 1000); // 5분 후
        return candidate;
    }

    return null;
}

// ════════════════════════════════════════════════════════════
//  시리즈 1회 실행 (cron 또는 사용자 즉시 트리거)
// ════════════════════════════════════════════════════════════

/**
 * 단일 시리즈의 다음 발행분 1개 처리.
 *   - 콘텐츠 생성 (모드별)
 *   - 채널별 ScheduledTask 생성 (각 채널 언어로 자동 번역)
 *   - completedPosts++ + nextRunAt 갱신
 */
export async function processSeriesOnce(seriesId: string): Promise<{ ok: boolean; tasksCreated?: number; error?: string }> {
    const series = await prisma.campaignSeries.findUnique({ where: { id: seriesId } });
    if (!series) return { ok: false, error: '시리즈 미존재' };
    if (series.status !== 'RUNNING') return { ok: false, error: `RUNNING 상태가 아님 (${series.status})` };

    const channelIds = (series.channelIds as any) as string[];
    if (!channelIds?.length) return { ok: false, error: '채널 없음' };

    const channels = await prisma.marketingChannel.findMany({
        where: { id: { in: channelIds }, userId: series.userId },
    });
    if (!channels.length) return { ok: false, error: '채널을 찾을 수 없음' };

    try {
        // ── 1. 콘텐츠 결정 (모드별) ──
        const result = await produceContent(series);

        // ── 2. 캠페인 1개 생성 (seriesId FK 사용 — Phase 9) ──
        const campaign = await prisma.$transaction(async (tx) => {
            const c = await tx.campaign.create({
                data: {
                    userId: series.userId,
                    seriesId: series.id, // 정확한 FK
                    name: `[시리즈] ${series.name} #${series.completedPosts + 1}`,
                    description: `시리즈 자동 생성 (모드: ${series.mode})`,
                    status: 'SCHEDULED',
                    scheduledAt: new Date(),
                },
            });

            // 채널별 task — 자동 번역
            for (const ch of channels) {
                let content = result.content;
                const sourceLang = 'ko';
                if (ch.language && ch.language !== sourceLang) {
                    try {
                        content = await translateText({
                            text: result.content,
                            targetLang: ch.language,
                            sourceLang,
                            platform: ch.type.toLowerCase(),
                            region: ch.region || '',
                            userId: series.userId,
                        });
                    } catch {
                        // 번역 실패 시 원문 그대로
                    }
                }
                await tx.scheduledTask.create({
                    data: {
                        campaignId: c.id,
                        channelId: ch.id,
                        content,
                        mediaUrls: result.mediaUrls.length > 0 ? (result.mediaUrls as any) : undefined,
                        scheduledAt: new Date(),
                        status: TaskStatus.PENDING,
                    },
                });
            }

            return c;
        });

        // ── 3. series 갱신 (다음 nextRunAt 계산) ──
        const nextCompleted = series.completedPosts + 1;
        const newStatus: SeriesStatus = nextCompleted >= series.totalPosts ? 'COMPLETED' : 'RUNNING';
        const nextRunAt = newStatus === 'COMPLETED' ? null : computeNextRun({
            scheduleType: series.scheduleType as any,
            intervalHours: series.intervalHours || undefined,
            dailyTimes: (series.dailyTimes as any) || undefined,
            weeklyDays: (series.weeklyDays as any) || undefined,
            startAt: series.startAt,
            endAt: series.endAt || undefined,
            totalPosts: series.totalPosts,
            completedPosts: nextCompleted,
            from: new Date(),
        });

        await prisma.campaignSeries.update({
            where: { id: seriesId },
            data: {
                completedPosts: nextCompleted,
                status: newStatus,
                lastRunAt: new Date(),
                nextRunAt,
                lastError: null,
            },
        });

        // 시리즈 완료 시 이메일 알림 (한 번만)
        if (newStatus === 'COMPLETED' && !series.notifiedCompletedAt) {
            try {
                await sendSeriesCompletedNotification(seriesId);
            } catch (e) {
                console.warn('[series] 완료 알림 발송 실패:', e);
            }
        }

        return { ok: true, tasksCreated: channels.length };
    } catch (e: any) {
        await prisma.campaignSeries.update({
            where: { id: seriesId },
            data: {
                failedPosts: { increment: 1 },
                lastError: (e?.message || String(e)).slice(0, 1000),
                lastRunAt: new Date(),
            },
        });
        return { ok: false, error: e?.message || '처리 실패' };
    }
}

/**
 * 모드별 콘텐츠 생성.
 * 반환: { content (텍스트 본문), mediaUrls (이미지 URL 배열) }
 */
async function produceContent(series: any): Promise<{ content: string; mediaUrls: string[] }> {
    const mode = series.mode as SeriesMode;
    const brief = (series.briefData as ContentBrief) || undefined;
    const seed = series.contentSeed || '';
    const pool = (series.mediaPool as string[]) || [];

    // ── 미디어 결정 ──
    let mediaUrls: string[] = [];
    if (mode === 'POOL_VARY' || mode === 'POOL_SIMILAR') {
        // 풀에서 1장 선택 (라운드로빈: completedPosts 인덱스)
        if (pool.length > 0) {
            const idx = series.completedPosts % pool.length;
            mediaUrls = [pool[idx]];
        }
    } else if (mode === 'AI_FRESH') {
        // AI 이미지 생성 (R2 설정 시 업로드)
        try {
            const imgPrompt = seed || `${brief?.industry || '마케팅'} 콘텐츠 — ${brief?.tone || 'modern'} 스타일`;
            const imgRes = await generateImage({
                prompt: imgPrompt,
                width: 1024, height: 1024,
                userId: series.userId,
            });
            if (isR2Configured()) {
                try {
                    const uploaded = await uploadToR2({
                        data: imgRes.bytes,
                        keyPrefix: `users/${series.userId}/series/${series.id}`,
                        contentType: imgRes.mimeType,
                    });
                    mediaUrls = [uploaded.url];
                } catch {
                    // R2 실패 → media 없이
                }
            }
            // R2 미설정이면 mediaUrls 비어있게 (data URL 은 외부 publisher 에 첨부 불가)
        } catch (e) {
            console.warn('[series] AI 이미지 생성 실패:', e);
        }
    }
    // PARAPHRASE 는 이미지 없음

    // ── 본문 결정 ──
    let content = '';

    if (mode === 'POOL_SIMILAR' || mode === 'PARAPHRASE') {
        // 같은 톤 — seed 기반으로 약간 paraphrase
        const platforms = ['instagram'];
        try {
            const r = await generateCaption({
                platforms,
                userHint: `다음 본문을 의미는 동일하게 유지하되 표현을 자연스럽게 바꿔서 다시 작성하세요. 너무 다르면 안 됨, 약간만 변형:\n\n"${seed || brief?.industry || '오늘의 콘텐츠'}"`,
                language: 'ko',
                userId: series.userId,
                brief,
            });
            const first = Object.values(r)[0];
            content = first?.text || seed;
        } catch {
            content = seed;
        }
    } else {
        // POOL_VARY / AI_FRESH — 매번 새 캡션
        const platforms = ['instagram'];
        try {
            const r = await generateCaption({
                platforms,
                userHint: seed || `${brief?.industry || '신선한'} 콘텐츠`,
                language: 'ko',
                userId: series.userId,
                brief,
                imageDataUrl: mediaUrls[0] && mediaUrls[0].startsWith('http') ? undefined : undefined, // 향후 fetch 가능
            });
            const first = Object.values(r)[0];
            content = first?.text || seed || '새 콘텐츠';
            // 해시태그 합치기
            if (first?.hashtags?.length) {
                content += '\n\n' + first.hashtags.map((t: string) => `#${t}`).join(' ');
            }
        } catch {
            content = seed || '새 콘텐츠';
        }
    }

    return { content: content.trim(), mediaUrls };
}

/**
 * A/B 테스트 — 같은 시드 본문 → AI 가 N개 변형 생성 → 사용자가 선택한 채널들에 즉시 동시 발행.
 *
 * 향후 강화:
 *   - 발행 후 24-48시간 후 좋아요/댓글 수집 (에이전트 또는 Instagram Graph API)
 *   - 가장 성과 좋은 변형 자동 선택 → 비슷한 변형 시리즈로 확장
 */
export async function createAbTest(input: {
    name: string;
    channelIds: string[];
    seed: string;
    variantCount: number;        // 2-5
    brief?: ContentBrief;
}): Promise<{ campaignIds: string[]; variants: { content: string }[] }> {
    const user = await getSessionUser();
    if (!input.seed?.trim()) throw new Error('시드 본문을 입력하세요');
    if (input.channelIds.length === 0) throw new Error('채널을 1개 이상 선택하세요');
    const n = Math.max(2, Math.min(5, input.variantCount));

    // N개 변형 생성 (병렬)
    const variants = await Promise.all(
        Array.from({ length: n }).map(async (_, i) => {
            try {
                const r = await generateCaption({
                    platforms: ['instagram'],
                    userHint: `다음 본문을 같은 의도로 다르게 표현 — 변형 ${i + 1}/${n} (각 변형은 서로 다른 후킹/CTA/구조 사용):\n"${input.seed}"`,
                    language: 'ko',
                    userId: user.id!,
                    brief: input.brief,
                });
                const first = Object.values(r)[0];
                let text = first?.text || input.seed;
                if (first?.hashtags?.length) {
                    text += '\n\n' + first.hashtags.map((t: string) => `#${t}`).join(' ');
                }
                return { content: text.trim() };
            } catch {
                return { content: input.seed };
            }
        })
    );

    const channels = await prisma.marketingChannel.findMany({
        where: { id: { in: input.channelIds }, userId: user.id! },
    });

    // 각 변형마다 캠페인 1개 + 채널별 task 생성
    const campaignIds: string[] = [];
    for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const campaign = await prisma.$transaction(async (tx) => {
            const c = await tx.campaign.create({
                data: {
                    userId: user.id!,
                    name: `[A/B] ${input.name} — 변형 ${String.fromCharCode(65 + i)}`,
                    description: `A/B 테스트 ${i + 1}/${variants.length}`,
                    status: 'SCHEDULED',
                    scheduledAt: new Date(),
                },
            });
            await tx.scheduledTask.createMany({
                data: channels.map(ch => ({
                    campaignId: c.id,
                    channelId: ch.id,
                    content: v.content,
                    scheduledAt: new Date(),
                    status: TaskStatus.PENDING,
                })),
            });
            return c;
        });
        campaignIds.push(campaign.id);
    }

    revalidatePath('/dashboard/campaigns');
    return { campaignIds, variants };
}

/**
 * 시리즈 완료 이메일 발송 (한 번만 — notifiedCompletedAt 플래그로 중복 방지).
 */
async function sendSeriesCompletedNotification(seriesId: string): Promise<void> {
    const series = await prisma.campaignSeries.findUnique({
        where: { id: seriesId },
        include: {
            user: { select: { email: true, name: true, emailPreferences: true } },
            campaigns: { include: { tasks: { select: { status: true } } } },
        },
    });
    if (!series || !series.user.email) return;
    // 이미 발송됐으면 skip
    if (series.notifiedCompletedAt) return;

    // 사용자 알림 환경설정 확인 (failures 키 활용 — 시리즈 완료/실패도 같은 카테고리로)
    const prefs = (series.user.emailPreferences as any) || {};
    if (prefs.failures === false) return;

    const allTasks = series.campaigns.flatMap(c => c.tasks);
    const successCount = allTasks.filter(t => t.status === 'SUCCESS').length;
    const failedTaskCount = allTasks.filter(t => t.status === 'FAILED').length;

    const { sendEmail } = await import('@/lib/email/send');
    const { SeriesCompletedEmail } = await import('@/lib/email/templates/SeriesCompleted');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://marketingbot.co.kr';

    await sendEmail({
        to: series.user.email,
        subject: `🤖 시리즈 "${series.name}" 완료 — ${series.completedPosts}/${series.totalPosts} 발행`,
        react: SeriesCompletedEmail({
            userName: series.user.name || series.user.email,
            seriesName: series.name,
            seriesId: series.id,
            totalPosts: series.totalPosts,
            completedPosts: series.completedPosts,
            failedPosts: series.failedPosts,
            successCount,
            failedTaskCount,
            appUrl,
        }),
    });

    // 발송 플래그 갱신
    await prisma.campaignSeries.update({
        where: { id: seriesId },
        data: { notifiedCompletedAt: new Date() },
    });
}

/**
 * 모든 RUNNING 시리즈 중 nextRunAt 도래분 처리 (cron 호출).
 * 1회 호출에서 동시 5개까지 처리 (서버 부담 방지).
 */
export async function processDueSeries(): Promise<{ processed: number; succeeded: number; failed: number }> {
    const now = new Date();
    const due = await prisma.campaignSeries.findMany({
        where: {
            status: 'RUNNING',
            nextRunAt: { lte: now },
        },
        orderBy: { nextRunAt: 'asc' },
        take: 5,
    });

    let succeeded = 0, failed = 0;
    for (const s of due) {
        const r = await processSeriesOnce(s.id);
        if (r.ok) succeeded++; else failed++;
    }
    return { processed: due.length, succeeded, failed };
}
