'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { TaskStatus } from '@prisma/client';
import { generateCaption, type ContentBrief } from '@/lib/ai/caption';
import { generateImage } from '@/lib/ai/image-gen';
import { isR2Configured, uploadToR2 } from '@/lib/storage/r2';
import { translateText } from '@/lib/ai/translator';
import { getActiveWorkspaceFilter } from '@/lib/workspace/scope';

async function getSessionUser() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    return session.user;
}

// ════════════════════════════════════════════════════════════
//  타입 (Phase 11 — 모드 재구성)
// ════════════════════════════════════════════════════════════
export type SeriesMode = 'POOL' | 'AI_IMAGE' | 'AI_VIDEO';
export type CaptionStyle = 'VARY' | 'SIMILAR'; // POOL 모드용
export type ContentCategory = 'SNS' | 'BLOG';
export type ScheduleType = 'INTERVAL' | 'DAILY' | 'WEEKLY' | 'FIXED_COUNT';
export type SeriesStatus = 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';

export interface CreateSeriesInput {
    name: string;
    channelIds: string[];
    mode: SeriesMode;
    captionStyle?: CaptionStyle;       // POOL 모드 시 글 스타일
    contentCategory?: ContentCategory; // SNS / BLOG
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
    const filter = await getActiveWorkspaceFilter(user.id!);
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
            workspaceId: filter.workspaceId,
            name: input.name.trim(),
            channelIds: input.channelIds as any,
            mode: input.mode,
            captionStyle: input.captionStyle || (input.mode === 'POOL' ? 'VARY' : undefined),
            contentCategory: input.contentCategory || 'SNS',
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
    const filter = await getActiveWorkspaceFilter(user.id!);
    const list = await prisma.campaignSeries.findMany({
        where: { userId: filter.userId, workspaceId: filter.workspaceId },
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
    const filter = await getActiveWorkspaceFilter(user.id!);
    const series = await prisma.campaignSeries.findFirst({
        where: { id, userId: filter.userId, workspaceId: filter.workspaceId },
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
 * 모드별 콘텐츠 생성 (Phase 11).
 *
 * mode:
 *   POOL       — 사용자 사진풀에서 N장 선택 (BLOG 면 여러 장, SNS 면 1장)
 *   AI_IMAGE   — AI 가 이미지 생성 (BLOG 면 N장, SNS 면 1장)
 *   AI_VIDEO   — 향후 출시 (현재는 fallback to AI_IMAGE)
 *
 * captionStyle (POOL 모드만):
 *   VARY     — 매번 다른 글 (기본)
 *   SIMILAR  — 비슷한 톤·스타일 (브랜드 일관성)
 *
 * contentCategory:
 *   SNS  — 짧은 글 + 이미지 1장 (instagram 포맷)
 *   BLOG — 긴 글 + 이미지 여러 장 (naver_blog 포맷)
 */
/**
 * 시리즈를 실제로 만들기 전에 샘플 N개를 미리 생성해서 사용자가 확인할 수 있게 함.
 * DB 에 저장하지 않고 produceContent 만 N 회 실행해서 결과만 반환.
 */
export async function previewSeriesContent(
    input: Pick<CreateSeriesInput, 'mode' | 'captionStyle' | 'contentCategory' | 'mediaPool' | 'contentSeed' | 'briefData'>,
    sampleCount: number = 3,
): Promise<Array<{ index: number; content: string; mediaUrls: string[]; error?: string }>> {
    const user = await getSessionUser();
    const N = Math.min(Math.max(sampleCount, 1), 5);

    const fakeSeries = {
        id: `preview-${Date.now()}`,
        userId: user.id!,
        mode: input.mode,
        captionStyle: input.captionStyle,
        contentCategory: input.contentCategory,
        mediaPool: input.mediaPool || [],
        contentSeed: input.contentSeed || '',
        briefData: input.briefData,
    };

    const results: Array<{ index: number; content: string; mediaUrls: string[]; error?: string }> = [];
    for (let i = 0; i < N; i++) {
        try {
            const r = await produceContent({ ...fakeSeries, completedPosts: i });
            results.push({ index: i, content: r.content, mediaUrls: r.mediaUrls });
        } catch (e: any) {
            results.push({ index: i, content: '', mediaUrls: [], error: e?.message || '생성 실패' });
        }
    }
    return results;
}

async function produceContent(series: any): Promise<{ content: string; mediaUrls: string[] }> {
    const mode = series.mode as SeriesMode;
    const captionStyle = (series.captionStyle as CaptionStyle) || 'VARY';
    const category = (series.contentCategory as ContentCategory) || 'SNS';
    const brief = (series.briefData as ContentBrief) || undefined;
    const seed = series.contentSeed || '';
    const pool = (series.mediaPool as string[]) || [];

    // 카테고리별 이미지 개수
    const imagesNeeded = category === 'BLOG' ? 5 : 1;
    // 카테고리별 platform 키 (캡션 포맷 결정)
    const platforms = category === 'BLOG' ? ['naver_blog'] : ['instagram'];

    // ── 1. 미디어 결정 ──
    let mediaUrls: string[] = [];
    if (mode === 'POOL') {
        // 풀에서 N장 선택 — 라운드로빈으로 시작점 결정
        if (pool.length > 0) {
            const start = (series.completedPosts * imagesNeeded) % pool.length;
            for (let i = 0; i < Math.min(imagesNeeded, pool.length); i++) {
                mediaUrls.push(pool[(start + i) % pool.length]);
            }
        }
    } else if (mode === 'AI_IMAGE' || mode === 'AI_VIDEO') {
        // AI 이미지 N장 생성 (AI_VIDEO 도 일단 이미지로 — 영상 출시 전 폴백)
        const imgPrompt = seed || `${brief?.industry || '마케팅'} 콘텐츠 — ${brief?.tone || 'modern'} 스타일`;
        for (let i = 0; i < imagesNeeded; i++) {
            try {
                const variantPrompt = imagesNeeded > 1
                    ? `${imgPrompt} (variant ${i + 1}/${imagesNeeded})`
                    : imgPrompt;
                const imgRes = await generateImage({
                    prompt: variantPrompt,
                    width: 1024,
                    height: category === 'BLOG' ? 768 : 1024, // 블로그는 16:12 (가로), SNS 는 정사각
                    userId: series.userId,
                });
                if (isR2Configured()) {
                    try {
                        const uploaded = await uploadToR2({
                            data: imgRes.bytes,
                            keyPrefix: `users/${series.userId}/series/${series.id}`,
                            contentType: imgRes.mimeType,
                        });
                        mediaUrls.push(uploaded.url);
                    } catch {
                        // R2 실패 — 이 이미지는 skip
                    }
                }
                // R2 미설정 시 mediaUrls 비어있음 (data URL 은 외부 publisher 에 첨부 불가)
            } catch (e) {
                console.warn(`[series] AI 이미지 ${i + 1}/${imagesNeeded} 실패:`, e);
            }
        }
    }

    // ── 2. 본문 결정 ──
    let content = '';
    const isSimilarStyle = mode === 'POOL' && captionStyle === 'SIMILAR' && !!seed;

    try {
        const userHint = isSimilarStyle
            ? `다음 본문의 의미·톤·스타일을 유지하되 표현만 자연스럽게 약간 바꿔서 다시 작성하세요 (너무 다르면 안 됨):\n\n"${seed}"`
            : (seed || `${brief?.industry || '신선한'} 콘텐츠`);

        const r = await generateCaption({
            platforms,
            userHint,
            language: 'ko',
            userId: series.userId,
            brief,
        });
        const first = Object.values(r)[0];

        if (category === 'BLOG' && first) {
            // 블로그 포맷: title + intro + sections + conclusion
            const blog = first as any;
            const parts: string[] = [];
            if (blog.title) parts.push(blog.title);
            if (blog.intro) parts.push('\n' + blog.intro);
            if (Array.isArray(blog.sections)) {
                for (const s of blog.sections) {
                    parts.push(`\n## ${s.heading || ''}\n${s.body || ''}`);
                }
            }
            if (blog.conclusion) parts.push('\n' + blog.conclusion);
            content = parts.filter(Boolean).join('\n');
            if (blog.hashtags?.length) content += '\n\n' + blog.hashtags.map((t: string) => `#${t}`).join(' ');
        } else {
            // SNS 포맷
            content = first?.text || seed || '새 콘텐츠';
            if (first?.hashtags?.length) {
                content += '\n\n' + first.hashtags.map((t: string) => `#${t}`).join(' ');
            }
        }
    } catch {
        content = seed || '새 콘텐츠';
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
    const filter = await getActiveWorkspaceFilter(user.id!);
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
        where: { id: { in: input.channelIds }, userId: filter.userId, workspaceId: filter.workspaceId },
    });

    // 각 변형마다 캠페인 1개 + 채널별 task 생성
    const campaignIds: string[] = [];
    for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const campaign = await prisma.$transaction(async (tx) => {
            const c = await tx.campaign.create({
                data: {
                    userId: user.id!,
                    workspaceId: filter.workspaceId,
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
 * Phase 21 — A/B 테스트 결과 분석 + winner 추천.
 * 같은 testName 의 캠페인들을 task 통계로 비교 → 가장 성공률 높은 변형 추천.
 */
export async function analyzeAbTest(testName: string): Promise<{
    variants: Array<{
        campaignId: string;
        variantLabel: string;
        published: number;
        failed: number;
        successRate: number;
        sample: string;
    }>;
    recommendedWinnerCampaignId: string | null;
}> {
    const user = await getSessionUser();
    const filter = await getActiveWorkspaceFilter(user.id!);

    // [A/B] {testName} — 변형 X 패턴으로 캠페인 조회
    const campaigns = await prisma.campaign.findMany({
        where: {
            userId: filter.userId,
            workspaceId: filter.workspaceId,
            name: { startsWith: `[A/B] ${testName} —` },
        },
        include: {
            tasks: {
                select: { status: true, content: true },
            },
        },
        orderBy: { createdAt: 'asc' },
    });

    const variants = campaigns.map(c => {
        const published = c.tasks.filter(t => t.status === 'SUCCESS').length;
        const failed = c.tasks.filter(t => t.status === 'FAILED').length;
        const total = published + failed;
        const successRate = total > 0 ? (published / total) * 100 : 0;
        const variantLabel = c.name.match(/변형\s+(.+)$/)?.[1] || '?';
        return {
            campaignId: c.id,
            variantLabel,
            published,
            failed,
            successRate: Math.round(successRate),
            sample: c.tasks[0]?.content?.slice(0, 100) || '',
        };
    });

    // Winner — 발행 5건 이상 + 가장 높은 successRate
    const eligible = variants.filter(v => v.published + v.failed >= 5);
    const winner = eligible.length > 0
        ? eligible.reduce((best, cur) => cur.successRate > best.successRate ? cur : best)
        : null;

    return { variants, recommendedWinnerCampaignId: winner?.campaignId || null };
}

/**
 * Winner 마킹 — 다른 변형의 PENDING task 들을 CANCELLED 처리.
 */
export async function markAbTestWinner(input: {
    testName: string;
    winnerCampaignId: string;
}): Promise<{ ok: boolean; cancelledTasks: number }> {
    const user = await getSessionUser();
    const filter = await getActiveWorkspaceFilter(user.id!);

    const campaigns = await prisma.campaign.findMany({
        where: {
            userId: filter.userId,
            workspaceId: filter.workspaceId,
            name: { startsWith: `[A/B] ${input.testName} —` },
        },
        select: { id: true },
    });

    const losers = campaigns.filter(c => c.id !== input.winnerCampaignId);
    if (losers.length === 0) return { ok: true, cancelledTasks: 0 };

    const r = await prisma.scheduledTask.updateMany({
        where: {
            campaignId: { in: losers.map(c => c.id) },
            status: 'PENDING',
        },
        data: { status: 'CANCELLED' as any },
    });

    revalidatePath('/dashboard/campaigns');
    return { ok: true, cancelledTasks: r.count };
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
