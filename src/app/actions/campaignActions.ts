"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { TaskStatus } from "@prisma/client";
import { translateText } from "@/lib/ai/translator";
import { suggestPrimeTime, suggestPrimeTimes, getPrimeHourLabels, type Region } from "@/lib/scheduling/prime-time";
import { getActiveWorkspaceFilter } from "@/lib/workspace/scope";

async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

/**
 * 다국가 번역 미리보기 (Phase 11) — 캠페인 작성 폼 미리보기 패널용.
 *
 * 채널 N개 중 sourceLanguage 와 다른 채널들의 본문을 자동 번역해서 반환.
 * 같은 언어면 번역 skip (원문 그대로).
 *
 * 결과: { channelId: { language, translated, sameAsSource } }
 */
export async function previewTranslation(input: {
    text: string;
    channelIds: string[];
    sourceLanguage?: string;
}): Promise<Record<string, { language: string; translated: string; sameAsSource: boolean }>> {
    const user = await getSessionUser();
    if (!input.text?.trim()) return {};
    const sourceLang = input.sourceLanguage || 'ko';

    const channels = await prisma.marketingChannel.findMany({
        where: { id: { in: input.channelIds }, userId: user.id! },
        select: { id: true, type: true, language: true, region: true },
    });

    const result: Record<string, { language: string; translated: string; sameAsSource: boolean }> = {};

    // 같은 언어 채널들 — 한 번에 처리 (번역 X)
    // 다른 언어 채널들 — 각각 번역 (translateText 가 캐시 사용해서 같은 lang 끼리는 1회만)
    const seenLangs = new Map<string, string>(); // lang → translated text (캐시)

    for (const ch of channels) {
        const lang = ch.language || 'ko';
        if (lang === sourceLang) {
            result[ch.id] = { language: lang, translated: input.text, sameAsSource: true };
            continue;
        }
        if (seenLangs.has(lang)) {
            result[ch.id] = { language: lang, translated: seenLangs.get(lang)!, sameAsSource: false };
            continue;
        }
        try {
            const translated = await translateText({
                text: input.text,
                targetLang: lang,
                sourceLang,
                platform: ch.type.toLowerCase(),
                region: ch.region || '',
                userId: user.id!,
            });
            seenLangs.set(lang, translated);
            result[ch.id] = { language: lang, translated, sameAsSource: false };
        } catch (e) {
            console.warn(`[previewTranslation] ${lang} 번역 실패:`, e);
            result[ch.id] = { language: lang, translated: `[번역 실패] ${input.text}`, sameAsSource: false };
        }
    }

    return result;
}

/**
 * 콘텐츠 캘린더 — 사용자의 모든 ScheduledTask 를 from~to 범위에서 조회.
 * 일자(YYYY-MM-DD)별로 그룹핑하여 캘린더 그리드에 바로 사용 가능한 형태로 반환.
 *
 * 한 task = 한 채널 발행. 같은 캠페인이라도 채널이 여러 개면 task 도 여러 개.
 * UI 에서는 캠페인 단위 또는 task 단위 모두 표시 가능하도록 둘 다 포함.
 */
export async function listCalendarEntries(input: { from: Date; to: Date }) {
  const user = await getSessionUser();
  const filter = await getActiveWorkspaceFilter(user.id!);
  const tasks = await prisma.scheduledTask.findMany({
    where: {
      campaign: { userId: filter.userId, workspaceId: filter.workspaceId },
      scheduledAt: { gte: input.from, lte: input.to },
    },
    include: {
      campaign: {
        select: {
          id: true, name: true, status: true,
          seriesId: true,
          series: { select: { id: true, name: true, mode: true } },
        },
      },
      channel: { select: { id: true, type: true, accountName: true, region: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  // 일자별 그룹핑 (YYYY-MM-DD 기준 — UTC 기준 직렬화 후 클라이언트에서 로컬 변환)
  type Entry = {
    taskId: string;
    campaignId: string;
    campaignName: string;
    campaignStatus: string;
    channelType: string;
    accountName: string;
    region: string | null;
    status: string;
    scheduledAt: string; // ISO
    seriesId: string | null;
    seriesName: string | null;
    seriesMode: string | null;
  };
  const byDay: Record<string, Entry[]> = {};
  for (const t of tasks) {
    const day = t.scheduledAt.toISOString().slice(0, 10);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push({
      taskId: t.id,
      campaignId: t.campaignId,
      campaignName: t.campaign.name,
      campaignStatus: t.campaign.status,
      channelType: t.channel.type,
      accountName: t.channel.accountName,
      region: t.channel.region,
      status: t.status,
      scheduledAt: t.scheduledAt.toISOString(),
      seriesId: t.campaign.seriesId,
      seriesName: t.campaign.series?.name || null,
      seriesMode: t.campaign.series?.mode || null,
    });
  }
  return byDay;
}

export async function listCampaigns() {
  const user = await getSessionUser();
  const filter = await getActiveWorkspaceFilter(user.id!);
  // Phase 35 — 카드 썸네일을 위해 첫 task 의 mediaUrls 1장 함께 조회
  const campaigns = await prisma.campaign.findMany({
    where: { userId: filter.userId, workspaceId: filter.workspaceId },
    include: {
      _count: { select: { tasks: true } },
      tasks: {
        select: { mediaUrls: true },
        take: 1,
        orderBy: { scheduledAt: 'asc' },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return campaigns.map(c => {
    const firstMedia = (c.tasks[0]?.mediaUrls as any[] | null) || [];
    const thumbnail = Array.isArray(firstMedia) && firstMedia.length > 0 ? String(firstMedia[0]) : null;
    return { ...c, thumbnail };
  });
}

export async function getCampaign(id: string) {
  const user = await getSessionUser();
  const filter = await getActiveWorkspaceFilter(user.id!);
  return await prisma.campaign.findFirst({
    where: { id, userId: filter.userId, workspaceId: filter.workspaceId },
    include: {
      tasks: {
        include: { channel: true }
      }
    },
  });
}

export async function createCampaign(data: {
  name: string;
  description?: string;
  channelIds: string[];
  content: string;
  mediaUrls?: string[];
  scheduledAt: Date;
  /** 입력 본문 언어. 기본 'ko'. 채널 language 와 다르면 자동 번역. */
  sourceLanguage?: string;
  /** false 면 자동 번역 skip — 사용자가 채널별 본문 직접 작성한 경우. 기본 true. */
  autoTranslate?: boolean;
  /** Phase 26 — 태그 (검색·필터용) */
  tags?: string[];
}) {
  const user = await getSessionUser();
  const filter = await getActiveWorkspaceFilter(user.id!);

  const sourceLanguage = data.sourceLanguage || 'ko';
  const autoTranslate = data.autoTranslate !== false;

  // 채널 정보 (region/language) 미리 로드 — 같은 워크스페이스 컨텍스트 안에서만
  const channels = await prisma.marketingChannel.findMany({
    where: { id: { in: data.channelIds }, userId: filter.userId, workspaceId: filter.workspaceId },
  });
  if (channels.length !== data.channelIds.length) {
    throw new Error('일부 채널을 찾을 수 없습니다.');
  }

  // Phase 33 — 일일 task 한도 체크
  const { checkDailyTaskLimit, getPlanLimits } = await import('@/lib/billing/plan-limits');
  const limitCheck = await checkDailyTaskLimit(user.id!, channels.length);
  if (!limitCheck.allowed) {
    const planLabel = getPlanLimits(limitCheck.plan).label;
    throw new Error(
      `오늘 발행 한도 초과 (${limitCheck.current}/${limitCheck.limit} · ${planLabel}). ` +
      `${channels.length}개 채널을 추가하려면 한도가 ${channels.length - limitCheck.remaining}개 부족해요. ` +
      `플랜을 업그레이드하거나 내일 다시 시도해주세요.`
    );
  }

  // 각 채널 언어별 번역된 콘텐츠 준비 (sns-auto-platform "계정 region 별 자동 언어 라우팅" 포팅)
  // 같은 언어면 source 그대로. 다른 언어면 translateText (DeepL→AI 폴백, 캐시 자동).
  const channelContents = await Promise.all(channels.map(async (ch) => {
    if (!autoTranslate || !ch.language || ch.language === sourceLanguage) {
      return { channelId: ch.id, content: data.content };
    }
    try {
      const translated = await translateText({
        text: data.content,
        targetLang: ch.language,
        sourceLang: sourceLanguage,
        platform: ch.type.toLowerCase(),
        region: ch.region || '',
        userId: user.id!,
      });
      return { channelId: ch.id, content: translated };
    } catch (e) {
      console.warn(`[createCampaign] ${ch.type} ${ch.language} 번역 실패, 원문 사용:`, e);
      return { channelId: ch.id, content: data.content };
    }
  }));

  const campaign = await prisma.$transaction(async (tx) => {
    // 1. 캠페인 생성
    const newCampaign = await tx.campaign.create({
      data: {
        userId: user.id!,
        workspaceId: filter.workspaceId,
        name: data.name,
        description: data.description,
        status: "SCHEDULED",
        scheduledAt: data.scheduledAt,
        tags: (data.tags || []).map(t => t.trim()).filter(Boolean),
      },
    });

    // 2. 채널별 작업(Task) 생성 — 각 채널 언어로 번역된 본문 사용
    await tx.scheduledTask.createMany({
      data: channelContents.map(({ channelId, content }) => ({
        campaignId: newCampaign.id,
        channelId,
        content,
        mediaUrls: data.mediaUrls ? (data.mediaUrls as any) : undefined,
        scheduledAt: data.scheduledAt,
        status: TaskStatus.PENDING,
      })),
    });

    return newCampaign;
  });

  // PostHog
  import("@/lib/analytics/posthog-server").then(({ captureEvent }) => {
    import("@/lib/analytics/events").then(({ EVENTS }) => {
      captureEvent({
        distinctId: user.id!,
        event: EVENTS.CAMPAIGN_CREATED,
        properties: {
          campaignId: campaign.id,
          channelCount: data.channelIds.length,
          hasMedia: !!(data.mediaUrls && data.mediaUrls.length > 0),
          contentLength: data.content.length,
        },
      }).catch(() => {});
    });
  });

  // Phase 25 — 활동 로그
  import('@/lib/activity/log').then(({ logActivity }) => {
    logActivity({
      userId: user.id!,
      workspaceId: filter.workspaceId,
      kind: 'CAMPAIGN_CREATED',
      title: data.name,
      body: `${data.channelIds.length}개 채널 · ${data.content.length}자`,
      link: `/dashboard/campaigns/${campaign.id}`,
      metadata: { campaignId: campaign.id, channelCount: data.channelIds.length },
    }).catch(() => {});
  });

  // Phase 50 — scheduledAt 이 지금 시각 이전 (즉시 발행) 이면 cron 5분 기다리지 말고 즉시 cloud publish.
  // Vercel Hobby 플랜은 cron schedule */5 * * * * 가 실제로는 1일 1회만 실행됨 — 이 fallback 으로 우회.
  // 클라우드 publishers (Telegram/WordPress/Discord/LinkedIn/X/YouTube) 만 즉시 처리, 에이전트 채널은 polling.
  if (data.scheduledAt && data.scheduledAt.getTime() <= Date.now() + 60_000) {
    import('@/lib/publishers').then(({ publishCloudReadyTasks }) =>
      publishCloudReadyTasks({ userId: user.id!, limit: 50 }).catch((e) =>
        console.warn('[createCampaign] immediate publishCloudReadyTasks failed', e)
      )
    );
  }

  revalidatePath("/dashboard/campaigns");
  return campaign;
}

export async function retryTask(taskId: string) {
  const user = await getSessionUser();

  // 소유권 확인
  const task = await prisma.scheduledTask.findFirst({
    where: {
      id: taskId,
      campaign: { userId: user.id }
    }
  });

  if (!task) throw new Error("Task not found");

  return await prisma.scheduledTask.update({
    where: { id: taskId },
    data: {
      status: TaskStatus.PENDING,
      executedAt: null,
      errorLog: null
    }
  });
}

/**
 * 단일 task 즉시 발행 — 클라우드 직접 처리 가능한 채널 (Telegram 등) 만 작동.
 * 에이전트 위임 채널은 PENDING 유지 + 안내 메시지 반환.
 */
export async function executeTaskNow(taskId: string): Promise<{
  success: boolean;
  handler: 'cloud' | 'agent';
  externalId?: string;
  error?: string;
}> {
  const user = await getSessionUser();
  const task = await prisma.scheduledTask.findFirst({
    where: { id: taskId, campaign: { userId: user.id } },
  });
  if (!task) return { success: false, handler: 'cloud', error: 'Task not found' };

  const { publishTask } = await import('@/lib/publishers');
  const result = await publishTask(taskId);
  revalidatePath(`/dashboard/campaigns/${task.campaignId}`);
  return result;
}

export async function deleteCampaign(id: string) {
  const user = await getSessionUser();
  await prisma.campaign.delete({
    where: { id, userId: user.id },
  });

  revalidatePath("/dashboard/campaigns");
  return { success: true };
}

/**
 * Phase 36 — 캠페인 복제. 콘텐츠·태그·미디어 그대로, 스케줄은 PENDING DRAFT 로.
 *
 * 복제된 캠페인은 status=DRAFT, scheduledAt=now, task 들도 status=PENDING 신규 생성.
 * 사용자는 복제 후 작성 페이지에서 시간만 변경하면 됨.
 */
export async function duplicateCampaign(originalId: string): Promise<{ id: string }> {
  const user = await getSessionUser();
  const filter = await getActiveWorkspaceFilter(user.id!);

  const original = await prisma.campaign.findFirst({
    where: { id: originalId, userId: filter.userId, workspaceId: filter.workspaceId },
    include: {
      tasks: {
        select: { content: true, mediaUrls: true, channelId: true },
      },
    },
  });
  if (!original) throw new Error('원본 캠페인을 찾을 수 없습니다');

  // 한도 체크
  const { checkDailyTaskLimit, getPlanLimits } = await import('@/lib/billing/plan-limits');
  const limitCheck = await checkDailyTaskLimit(user.id!, original.tasks.length);
  if (!limitCheck.allowed) {
    const planLabel = getPlanLimits(limitCheck.plan).label;
    throw new Error(
      `오늘 발행 한도 초과 (${limitCheck.current}/${limitCheck.limit} · ${planLabel}). ` +
      `${original.tasks.length}개 채널 복제하려면 한도가 부족해요.`,
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const copy = await tx.campaign.create({
      data: {
        userId: user.id!,
        workspaceId: filter.workspaceId,
        name: `${original.name} (복사본)`,
        description: original.description,
        status: 'DRAFT',
        scheduledAt: new Date(),
        tags: (original.tags as any) || [],
      },
    });

    if (original.tasks.length > 0) {
      await tx.scheduledTask.createMany({
        data: original.tasks.map(t => ({
          campaignId: copy.id,
          channelId: t.channelId,
          content: t.content,
          mediaUrls: t.mediaUrls as any,
          scheduledAt: new Date(),
          status: 'PENDING' as const,
        })),
      });
    }

    return copy;
  });

  revalidatePath('/dashboard/campaigns');
  return { id: result.id };
}

/**
 * Phase 32 — 캠페인 일괄 삭제. 본인 소유분만 처리.
 */
export async function bulkDeleteCampaigns(ids: string[]): Promise<{ deleted: number }> {
  const user = await getSessionUser();
  if (!ids?.length) return { deleted: 0 };
  const result = await prisma.campaign.deleteMany({
    where: { id: { in: ids }, userId: user.id },
  });
  revalidatePath("/dashboard/campaigns");
  return { deleted: result.count };
}

/**
 * Phase 32 — 캠페인 일괄 일시정지. PENDING task 들을 CANCELLED 처리 + 캠페인 status 업데이트.
 * (재개는 일괄 미지원 — 각 캠페인별로 새 task 일정 필요)
 */
export async function bulkPauseCampaigns(ids: string[]): Promise<{ paused: number; cancelledTasks: number }> {
  const user = await getSessionUser();
  if (!ids?.length) return { paused: 0, cancelledTasks: 0 };

  // 본인 소유 검증
  const owned = await prisma.campaign.findMany({
    where: { id: { in: ids }, userId: user.id },
    select: { id: true },
  });
  const ownedIds = owned.map(c => c.id);
  if (ownedIds.length === 0) return { paused: 0, cancelledTasks: 0 };

  const taskResult = await prisma.scheduledTask.updateMany({
    where: { campaignId: { in: ownedIds }, status: 'PENDING' },
    data: { status: 'CANCELLED' as any },
  });

  await prisma.campaign.updateMany({
    where: { id: { in: ownedIds } },
    data: { status: 'PAUSED' },
  });

  revalidatePath("/dashboard/campaigns");
  return { paused: ownedIds.length, cancelledTasks: taskResult.count };
}

// ════════════════════════════════════════════════════════════
//  Campaign drafts — 30초 idle auto-save (sns-auto-platform drafts.py 포팅)
// ════════════════════════════════════════════════════════════

/**
 * 현재 사용자의 'campaign' slot 드래프트 로드. 없으면 null.
 * 캠페인 작성 페이지 진입 시 호출 → 직전 작업 복원.
 */
export async function loadCampaignDraft(): Promise<{
  exists: boolean;
  payload?: any;
  updatedAt?: Date;
}> {
  const user = await getSessionUser();
  const draft = await prisma.campaignDraft.findUnique({
    where: { userId_slot: { userId: user.id!, slot: 'campaign' } },
  });
  if (!draft) return { exists: false };
  return { exists: true, payload: draft.payload, updatedAt: draft.updatedAt };
}

/**
 * 드래프트 저장/갱신 (upsert). idle 30초 클라이언트 타이머에서 호출.
 * payload 는 form 전체 상태 (직렬화 가능한 JSON).
 */
export async function saveCampaignDraft(payload: any): Promise<{ success: boolean; updatedAt?: Date }> {
  const user = await getSessionUser();
  if (!payload || typeof payload !== 'object') return { success: false };

  // 너무 큰 payload 방어 (~1MB 컷)
  try {
    const sz = JSON.stringify(payload).length;
    if (sz > 1_000_000) return { success: false };
  } catch { return { success: false }; }

  const row = await prisma.campaignDraft.upsert({
    where: { userId_slot: { userId: user.id!, slot: 'campaign' } },
    create: { userId: user.id!, slot: 'campaign', payload },
    update: { payload },
  });
  return { success: true, updatedAt: row.updatedAt };
}

/**
 * 드래프트 삭제 — 캠페인 생성 성공 시 또는 사용자가 명시적으로 "드래프트 버리기" 누를 때.
 */
export async function clearCampaignDraft(): Promise<{ success: boolean }> {
  const user = await getSessionUser();
  await prisma.campaignDraft.deleteMany({
    where: { userId: user.id!, slot: 'campaign' },
  });
  return { success: true };
}

/**
 * 선택한 채널들의 region 을 보고 다음 황금시간대를 추천.
 *
 * 동작:
 *   - 채널 1개: 그 채널 region 의 다음 prime-time 1개 반환
 *   - 채널 N개 (다른 region): 각 region 의 다음 prime-time 들 중 가장 빠른 시각 반환
 *     (모든 region 동시 발행이라 가장 임박한 시각이 공통 예약 시점)
 *   - 채널 N개 (같은 region): 그 region 의 다음 N개 prime-time 들의 첫 시각
 *
 * 캠페인 생성 폼의 "최적 시간 자동 추천" 버튼에서 호출.
 */
export async function suggestPrimeTimeForChannels(channelIds: string[]): Promise<{
  suggested: string;       // ISO datetime 문자열
  suggestedLocal: string;  // 사용자 표시용 (한국 시간 포맷)
  region: Region;          // 사용된 기준 region
  hourLabels: string[];    // 해당 region 의 prime hour 들 (UI 표시용)
}> {
  const user = await getSessionUser();
  if (!channelIds || channelIds.length === 0) {
    throw new Error('채널을 1개 이상 선택해주세요');
  }

  const channels = await prisma.marketingChannel.findMany({
    where: { id: { in: channelIds }, userId: user.id! },
    select: { region: true },
  });
  if (channels.length === 0) {
    throw new Error('선택한 채널을 찾을 수 없습니다');
  }

  // 각 region 의 다음 prime-time 계산 → 가장 빠른 것 선택
  const candidates = channels.map(c => ({
    region: (c.region || 'korea') as Region,
    next: suggestPrimeTime((c.region || 'korea') as Region),
  }));
  candidates.sort((a, b) => a.next.getTime() - b.next.getTime());
  const winner = candidates[0];

  // 한국 시간 포맷 (사용자 대시보드 기본 시간대)
  const localFmt = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  return {
    suggested: winner.next.toISOString(),
    suggestedLocal: localFmt.format(winner.next),
    region: winner.region,
    hourLabels: getPrimeHourLabels(winner.region),
  };
}

/**
 * 다중 분할 발행 — 한 캠페인을 region 의 다음 N개 prime-time 에 나눠 발행.
 *
 * 캠페인 생성 시 "분할 발행" 모드에서 사용 (예: 같은 콘텐츠를 다음 3개 황금시간대에 자동 예약).
 * 채널의 region 기준 다음 N개 prime-time UTC Date 배열 반환.
 */
export async function suggestPrimeTimeSeriesForChannel(channelId: string, count: number): Promise<{
  times: string[];       // ISO datetime 배열
  region: Region;
}> {
  const user = await getSessionUser();
  const channel = await prisma.marketingChannel.findFirst({
    where: { id: channelId, userId: user.id! },
    select: { region: true },
  });
  if (!channel) throw new Error('채널을 찾을 수 없습니다');
  const region = (channel.region || 'korea') as Region;
  const times = suggestPrimeTimes(region, Math.max(1, Math.min(count, 12)));
  return {
    times: times.map(t => t.toISOString()),
    region,
  };
}

/**
 * 캠페인 1개 + 다음 N개 황금시간대로 ScheduledTask N×채널수 생성.
 *
 * 동작:
 *   1. 첫 번째 채널의 region 기준 다음 N 개 prime-time 계산
 *   2. 캠페인 1개 (status=SCHEDULED, scheduledAt=첫 시각)
 *   3. 각 시각 × 각 채널 → ScheduledTask 생성 (총 N × 채널수)
 *   4. 채널 region 별 자동 번역도 그대로 적용
 *
 * 사용 시나리오: 같은 콘텐츠를 한국 9시·12시·19시 3회 자동 예약.
 */
export async function createSplitCampaign(data: {
  name: string;
  description?: string;
  channelIds: string[];
  content: string;
  mediaUrls?: string[];
  /** 분할 횟수 (2-12) */
  splitCount: number;
  sourceLanguage?: string;
  autoTranslate?: boolean;
}) {
  const user = await getSessionUser();
  const filter = await getActiveWorkspaceFilter(user.id!);

  if (data.channelIds.length === 0) throw new Error('채널을 1개 이상 선택하세요');
  const splitCount = Math.max(2, Math.min(data.splitCount, 12));

  const sourceLanguage = data.sourceLanguage || 'ko';
  const autoTranslate = data.autoTranslate !== false;

  // 채널 정보 (워크스페이스 컨텍스트 안에서만)
  const channels = await prisma.marketingChannel.findMany({
    where: { id: { in: data.channelIds }, userId: filter.userId, workspaceId: filter.workspaceId },
  });
  if (channels.length !== data.channelIds.length) {
    throw new Error('일부 채널을 찾을 수 없습니다.');
  }

  // 첫 번째 채널의 region 기준으로 N 개 prime-time 계산
  const baseRegion = (channels[0].region || 'korea') as Region;
  const primeTimes = suggestPrimeTimes(baseRegion, splitCount);

  // 채널별 번역 (1회만 — 모든 시각에 동일 콘텐츠 사용)
  const channelContents = await Promise.all(channels.map(async (ch) => {
    if (!autoTranslate || !ch.language || ch.language === sourceLanguage) {
      return { channelId: ch.id, content: data.content };
    }
    try {
      const translated = await translateText({
        text: data.content,
        targetLang: ch.language,
        sourceLang: sourceLanguage,
        platform: ch.type.toLowerCase(),
        region: ch.region || '',
        userId: user.id!,
      });
      return { channelId: ch.id, content: translated };
    } catch (e) {
      console.warn(`[createSplitCampaign] 번역 실패, 원문 사용:`, e);
      return { channelId: ch.id, content: data.content };
    }
  }));

  const campaign = await prisma.$transaction(async (tx) => {
    const newCampaign = await tx.campaign.create({
      data: {
        userId: user.id!,
        workspaceId: filter.workspaceId,
        name: data.name,
        description: (data.description ? data.description + ' · ' : '') + `분할 발행 ${splitCount}회 (${baseRegion} 황금시간대)`,
        status: 'SCHEDULED',
        scheduledAt: primeTimes[0],
      },
    });

    // N 시각 × 채널 수 = N × M tasks
    const tasks: any[] = [];
    for (const time of primeTimes) {
      for (const { channelId, content } of channelContents) {
        tasks.push({
          campaignId: newCampaign.id,
          channelId,
          content,
          mediaUrls: data.mediaUrls ? (data.mediaUrls as any) : undefined,
          scheduledAt: time,
          status: TaskStatus.PENDING,
        });
      }
    }
    await tx.scheduledTask.createMany({ data: tasks });
    return newCampaign;
  });

  // PostHog
  import("@/lib/analytics/posthog-server").then(({ captureEvent }) => {
    import("@/lib/analytics/events").then(({ EVENTS }) => {
      captureEvent({
        distinctId: user.id!,
        event: EVENTS.CAMPAIGN_CREATED,
        properties: {
          campaignId: campaign.id,
          channelCount: data.channelIds.length,
          splitCount,
          mode: 'split',
        },
      }).catch(() => {});
    });
  });

  revalidatePath('/dashboard/campaigns');
  return {
    campaignId: campaign.id,
    splitCount,
    times: primeTimes.map(t => t.toISOString()),
    region: baseRegion,
    totalTasks: primeTimes.length * channelContents.length,
  };
}

/**
 * Phase 13 — 캘린더 드래그앤드롭으로 task 재예약.
 * 시간(HH:mm)은 유지, 날짜만 변경. 본인 소유 PENDING task 만 가능.
 */
export async function rescheduleTask(input: {
  taskId: string;
  newDate: string; // YYYY-MM-DD
}): Promise<{ ok: boolean; newScheduledAt?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: 'Unauthorized' };

  const task = await prisma.scheduledTask.findUnique({
    where: { id: input.taskId },
    include: { campaign: { select: { userId: true } } },
  });
  if (!task) return { ok: false, error: 'Task not found' };
  if (task.campaign.userId !== session.user.id) return { ok: false, error: 'Forbidden' };
  if (task.status !== 'PENDING') return { ok: false, error: '이미 처리된 발행은 재예약할 수 없습니다' };

  // 기존 시간(HH:mm:ss) 유지 + 날짜만 변경
  const original = new Date(task.scheduledAt);
  const [y, m, d] = input.newDate.split('-').map(Number);
  const newScheduledAt = new Date(
    y, m - 1, d,
    original.getHours(), original.getMinutes(), original.getSeconds(), original.getMilliseconds(),
  );

  // 과거로의 이동 방지 (1분 마진)
  if (newScheduledAt.getTime() < Date.now() - 60 * 1000) {
    return { ok: false, error: '과거로는 옮길 수 없습니다' };
  }

  await prisma.scheduledTask.update({
    where: { id: input.taskId },
    data: { scheduledAt: newScheduledAt },
  });

  revalidatePath('/dashboard/campaigns/calendar');
  return { ok: true, newScheduledAt: newScheduledAt.toISOString() };
}
