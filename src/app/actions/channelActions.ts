"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { ChannelType } from "@prisma/client";
import { encryptJSON } from "@/lib/crypto/aes";
import { getActiveWorkspaceFilter } from "@/lib/workspace/scope";

// 세션 확인 유틸리티
async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

export async function listChannels() {
  const user = await getSessionUser();
  const filter = await getActiveWorkspaceFilter(user.id!);
  const channels = await prisma.marketingChannel.findMany({
    where: { userId: filter.userId, workspaceId: filter.workspaceId },
    orderBy: { createdAt: "desc" },
  });

  // UI 노출 방지를 위한 마스킹 처리
  return channels.map(c => ({
    ...c,
    encryptedCredentials: "", // 리스트에서는 자격증명 정보 제거
  }));
}

export async function createChannel(data: {
  type: ChannelType;
  accountName: string;
  region?: string;
  language?: string;
  credentials: any;
}) {
  const user = await getSessionUser();
  const filter = await getActiveWorkspaceFilter(user.id!);

  // Phase 33 — 채널 한도 체크
  const { checkChannelLimit, getPlanLimits } = await import('@/lib/billing/plan-limits');
  const limitCheck = await checkChannelLimit(user.id!);
  if (!limitCheck.allowed) {
    const planLabel = getPlanLimits(limitCheck.plan).label;
    throw new Error(
      `채널 등록 한도 초과 (${limitCheck.current}/${limitCheck.limit} · ${planLabel}). 플랜을 업그레이드해주세요.`,
    );
  }

  // AES-256-GCM 암호화 적용
  const encryptedCredentials = encryptJSON(data.credentials);

  const channel = await prisma.marketingChannel.create({
    data: {
      userId: user.id!,
      workspaceId: filter.workspaceId,
      type: data.type,
      accountName: data.accountName,
      region: data.region || 'korea',
      language: data.language || 'ko',
      encryptedCredentials,
    },
  });

  // PostHog
  import("@/lib/analytics/posthog-server").then(({ captureEvent }) => {
    import("@/lib/analytics/events").then(({ EVENTS }) => {
      captureEvent({
        distinctId: user.id!,
        event: EVENTS.CHANNEL_CREATED,
        properties: { channelType: data.type, channelId: channel.id },
      }).catch(() => {});
    });
  });

  // Phase 25 — 활동 로그
  import('@/lib/activity/log').then(({ logActivity }) => {
    logActivity({
      userId: user.id!,
      workspaceId: filter.workspaceId,
      kind: 'CHANNEL_ADDED',
      title: `${data.type} 채널 등록`,
      body: data.accountName,
      link: '/dashboard/channels',
      metadata: { channelId: channel.id, type: data.type },
    }).catch(() => {});
  });

  revalidatePath("/dashboard/channels");
  return channel;
}

export async function updateChannel(id: string, data: {
  accountName?: string;
  region?: string;
  language?: string;
  credentials?: any;
  status?: any;
}) {
  const user = await getSessionUser();

  const updateData: any = {};
  if (data.accountName) updateData.accountName = data.accountName;
  if (data.region) updateData.region = data.region;
  if (data.language) updateData.language = data.language;
  if (data.status) updateData.status = data.status;
  if (data.credentials) {
    // AES-256-GCM 재암호화 적용
    updateData.encryptedCredentials = encryptJSON(data.credentials);
    // Phase 50 — 자격증명이 바뀌면 status 를 PENDING_AUTH 로 되돌리고 verify 재트리거.
    updateData.status = 'PENDING_AUTH';
    updateData.verifyError = null;
  }

  const channel = await prisma.marketingChannel.update({
    where: { id, userId: user.id },
    data: updateData,
  });

  // 자격증명 변경 시 자동 재인증 — 클라우드 채널은 즉시 API verify, 에이전트 채널은 task enqueue.
  if (data.credentials) {
    await reverifyChannel(id).catch(() => { /* 호출자에게 throw 해서 UX 막지 않음 */ });
  }

  revalidatePath("/dashboard/channels");
  return channel;
}

/**
 * Phase 50 — 채널 verify task 를 큐잉 (에이전트 채널 전용).
 *
 * 이미 PENDING / RUNNING 인 verify task 가 있으면 새로 만들지 않음 (중복 방지).
 * polling 한 에이전트가 5분 안에 결과 보고 안 하면 좀비 복구 로직이 FAILED 로 정리.
 */
export async function enqueueChannelVerify(channelId: string): Promise<{ taskId: string; reused: boolean }> {
  // 진행 중인 task 우선 재사용
  const existing = await prisma.channelVerifyTask.findFirst({
    where: { channelId, status: { in: ['PENDING', 'RUNNING'] } },
    orderBy: { createdAt: 'desc' },
  });
  if (existing) return { taskId: existing.id, reused: true };

  const created = await prisma.channelVerifyTask.create({
    data: { channelId, status: 'PENDING' },
  });
  return { taskId: created.id, reused: false };
}

/**
 * Phase 50 — 사용자 "재인증" 버튼 핸들러.
 *
 * 클라우드 채널 (Telegram/Discord/LinkedIn/X/YouTube/WordPress) 은 verifyChannelConnection 으로
 * 즉시 API 검증.
 * 에이전트 채널 (Instagram/Facebook/Threads/Naver 등) 은 verify task 를 enqueue 하고 status 를
 * PENDING_AUTH 로 되돌림 — 에이전트가 받아 처리 후 result endpoint 로 결과 보고.
 *
 * 반환 형식은 verifyChannelConnection 과 호환 (UI 가 그대로 처리할 수 있음).
 */
export async function reverifyChannel(channelId: string) {
  return verifyChannelConnection(channelId);
}

export async function deleteChannel(id: string) {
  const user = await getSessionUser();
  await prisma.marketingChannel.delete({
    where: { id, userId: user.id },
  });

  revalidatePath("/dashboard/channels");
  return { success: true };
}

/**
 * Telegram bot token 유효성 빠른 검증 — getMe 호출.
 */
export async function verifyTelegramToken(botToken: string): Promise<{
  ok: boolean;
  username?: string;
  error?: string;
}> {
  await getSessionUser();
  const { verifyTelegramCredentials } = await import("@/lib/publishers/telegram");
  return verifyTelegramCredentials(botToken);
}

/**
 * 통합 채널 자격증명 검증 — 채널 추가 직후 자동 호출.
 *
 * 클라우드 publisher 6종 (Telegram/Discord/LinkedIn/X/YouTube/WordPress) 은
 * 실제 API 호출로 검증.
 *
 * 에이전트 채널 (Instagram/Facebook/Threads/Naver 등) 은 브라우저 자동화라
 * 즉시 검증 불가 → 'pending_agent' 반환 (에이전트가 첫 발행 시 검증).
 *
 * 검증 결과 따라 channel.status 자동 갱신:
 *   - 성공 → ACTIVE
 *   - 실패 → ERROR (errorLog 에 사유)
 *   - 에이전트 대기 → PENDING_AUTH
 */
export async function verifyChannelConnection(channelId: string): Promise<{
  ok: boolean;
  detail?: string;
  channelType?: string;
  newStatus?: 'ACTIVE' | 'ERROR' | 'PENDING_AUTH';
  error?: string;
}> {
  const user = await getSessionUser();
  const channel = await prisma.marketingChannel.findFirst({
    where: { id: channelId, userId: user.id! },
  });
  if (!channel) return { ok: false, error: '채널을 찾을 수 없습니다' };

  const { decryptJSON } = await import("@/lib/crypto/aes");
  let creds: any;
  try {
    creds = decryptJSON(channel.encryptedCredentials);
  } catch (e: any) {
    await prisma.marketingChannel.update({
      where: { id: channelId },
      data: { status: 'ERROR' },
    });
    return { ok: false, error: '자격증명 복호화 실패', newStatus: 'ERROR', channelType: channel.type };
  }

  let result: { ok: boolean; detail?: string; error?: string };

  switch (channel.type) {
    case 'TELEGRAM': {
      const { verifyTelegramCredentials } = await import("@/lib/publishers/telegram");
      const r = await verifyTelegramCredentials(creds.botToken);
      result = r.ok
        ? { ok: true, detail: `봇 @${r.username} 연결 성공` }
        : { ok: false, error: r.error };
      break;
    }
    case 'DISCORD': {
      const { verifyDiscordCredentials } = await import("@/lib/publishers/discord");
      const r = await verifyDiscordCredentials(creds.webhookUrl);
      result = r.ok
        ? { ok: true, detail: `웹후크 "${r.name}" 연결 성공 (channel: ${r.channelId})` }
        : { ok: false, error: r.error };
      break;
    }
    case 'LINKEDIN': {
      const { verifyLinkedInCredentials } = await import("@/lib/publishers/linkedin");
      const r = await verifyLinkedInCredentials(creds.accessToken);
      result = r.ok
        ? { ok: true, detail: `${r.name || '계정'} 인증 성공` }
        : { ok: false, error: r.error };
      break;
    }
    case 'X': {
      const { verifyXCredentials } = await import("@/lib/publishers/x");
      const r = await verifyXCredentials(creds.accessToken);
      result = r.ok
        ? { ok: true, detail: `@${r.username} 인증 성공` }
        : { ok: false, error: r.error };
      break;
    }
    case 'YOUTUBE': {
      const { verifyYouTubeCredentials } = await import("@/lib/publishers/youtube");
      const r = await verifyYouTubeCredentials(creds.accessToken);
      result = r.ok
        ? { ok: true, detail: `채널 "${r.channelTitle}" (구독자 ${r.subscribers?.toLocaleString() || 0}명) 인증 성공` }
        : { ok: false, error: r.error };
      break;
    }
    case 'WORDPRESS': {
      const { verifyWordPressCredentials } = await import("@/lib/publishers/wordpress");
      const r = await verifyWordPressCredentials({
        siteUrl: creds.siteUrl,
        username: creds.username,
        appPassword: creds.appPassword,
      });
      result = r.ok
        ? { ok: true, detail: `${creds.siteUrl} (${r.username || creds.username}) 인증 성공` }
        : { ok: false, error: r.error };
      break;
    }
    default: {
      // 에이전트 채널 (Instagram/Facebook/Threads/Naver/카카오 등) — Phase 50.
      // 즉시 verify task 를 큐잉. 에이전트가 polling 시 받아서 브라우저 띄워 사용자 직접 로그인.
      // 이미 PENDING/RUNNING 인 verify task 가 있으면 중복 큐잉 안 함 (idempotent).
      await enqueueChannelVerify(channelId);
      await prisma.marketingChannel.update({
        where: { id: channelId },
        data: { status: 'PENDING_AUTH', verifyError: null },
      });
      return {
        ok: true,
        detail: '데스크톱 에이전트에 인증 요청을 보냈습니다. 에이전트 창에서 로그인을 완료해주세요.',
        newStatus: 'PENDING_AUTH',
        channelType: channel.type,
      };
    }
  }

  // 결과 반영
  const newStatus: 'ACTIVE' | 'ERROR' = result.ok ? 'ACTIVE' : 'ERROR';
  await prisma.marketingChannel.update({
    where: { id: channelId },
    data: { status: newStatus },
  });
  revalidatePath('/dashboard/channels');

  return {
    ok: result.ok,
    detail: result.detail,
    error: result.error,
    newStatus,
    channelType: channel.type,
  };
}

/**
 * Phase 37 — 사용자 채널 일괄 verify.
 * 검증 가능한 모든 채널 (TELEGRAM/DISCORD/YOUTUBE/WORDPRESS) 을 한 번에 health check.
 * 결과 요약 반환 — 사용자 UI 에 통보.
 */
export async function verifyAllMyChannels(): Promise<{
  total: number;
  verified: number;
  active: number;
  errored: number;
  skipped: number;
  results: Array<{ id: string; accountName: string; type: string; status: string; error?: string }>;
}> {
  const user = await getSessionUser();
  const verifiableTypes: any[] = ['TELEGRAM', 'DISCORD', 'YOUTUBE', 'WORDPRESS'];

  const channels = await prisma.marketingChannel.findMany({
    where: { userId: user.id!, type: { in: verifiableTypes } },
    select: { id: true, type: true, accountName: true, status: true },
  });

  const results: Array<{ id: string; accountName: string; type: string; status: string; error?: string }> = [];
  let active = 0;
  let errored = 0;

  // 순차 실행 — 외부 API rate limit 회피
  for (const ch of channels) {
    const r = await verifyChannelInternal(ch.id);
    const status = r.newStatus || ch.status;
    if (status === 'ACTIVE') active++;
    else if (status === 'ERROR') errored++;
    results.push({
      id: ch.id,
      accountName: ch.accountName,
      type: ch.type as any,
      status: status as string,
      error: r.error,
    });
  }

  // 에이전트 채널은 verify 안 됨 — skipped 카운트
  const totalAll = await prisma.marketingChannel.count({ where: { userId: user.id! } });
  const skipped = totalAll - channels.length;

  revalidatePath('/dashboard/channels');

  return {
    total: totalAll,
    verified: channels.length,
    active,
    errored,
    skipped,
    results,
  };
}

/**
 * Phase 36 — 채널별 황금 시간대 분석 (실제 발행 이력 기반).
 *
 * 최근 60일 SUCCESS task 들의 executedAt 시간(0-23) 분포를 분석.
 * 가장 SUCCESS가 많이 나온 시간 top 3 반환.
 * task가 너무 적으면 (10건 미만) 신뢰도 낮음 → null 반환.
 */
export async function getChannelBestHours(): Promise<Record<string, {
  topHours: number[];
  totalSuccess: number;
  hourCounts: number[]; // 24개 배열
}>> {
  const user = await getSessionUser();
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const tasks = await prisma.scheduledTask.findMany({
    where: {
      campaign: { userId: user.id! },
      status: 'SUCCESS',
      executedAt: { gte: sixtyDaysAgo },
    },
    select: { channelId: true, executedAt: true },
  });

  const byChannel: Record<string, number[]> = {};
  for (const t of tasks) {
    if (!t.executedAt) continue;
    if (!byChannel[t.channelId]) byChannel[t.channelId] = Array(24).fill(0);
    const h = t.executedAt.getHours();
    byChannel[t.channelId][h]++;
  }

  const result: Record<string, { topHours: number[]; totalSuccess: number; hourCounts: number[] }> = {};
  for (const [channelId, hourCounts] of Object.entries(byChannel)) {
    const totalSuccess = hourCounts.reduce((s, c) => s + c, 0);
    if (totalSuccess < 10) continue; // 데이터 부족 — 신뢰도 X
    // top 3 hour
    const indexed = hourCounts.map((c, h) => ({ h, c }));
    indexed.sort((a, b) => b.c - a.c);
    const topHours = indexed.slice(0, 3).filter(x => x.c > 0).map(x => x.h);
    result[channelId] = { topHours, totalSuccess, hourCounts };
  }

  return result;
}

/**
 * Phase 35 — 세션 우회 health check (cron 전용).
 * verifyChannelConnection 의 검증 로직을 재사용하되 getSessionUser 없이 채널 ID로 직접 처리.
 */
export async function verifyChannelInternal(channelId: string): Promise<{
  ok: boolean;
  detail?: string;
  error?: string;
  channelType?: string;
  previousStatus?: string;
  newStatus?: 'ACTIVE' | 'ERROR' | 'PENDING_AUTH';
  channelUserId?: string;
  accountName?: string;
}> {
  const channel = await prisma.marketingChannel.findUnique({ where: { id: channelId } });
  if (!channel) return { ok: false, error: 'not found' };

  const previousStatus = channel.status;
  const { decryptJSON } = await import("@/lib/crypto/aes");
  let creds: any;
  try {
    creds = decryptJSON(channel.encryptedCredentials);
  } catch {
    await prisma.marketingChannel.update({ where: { id: channelId }, data: { status: 'ERROR' } });
    return {
      ok: false,
      error: '자격증명 복호화 실패',
      newStatus: 'ERROR',
      previousStatus,
      channelType: channel.type,
      channelUserId: channel.userId,
      accountName: channel.accountName,
    };
  }

  let result: { ok: boolean; detail?: string; error?: string };
  switch (channel.type) {
    case 'TELEGRAM': {
      const { verifyTelegramCredentials } = await import("@/lib/publishers/telegram");
      const r = await verifyTelegramCredentials(creds.botToken);
      result = r.ok ? { ok: true, detail: `@${r.username}` } : { ok: false, error: r.error };
      break;
    }
    case 'DISCORD': {
      const { verifyDiscordCredentials } = await import("@/lib/publishers/discord");
      const r = await verifyDiscordCredentials(creds.webhookUrl);
      result = r.ok ? { ok: true, detail: r.name } : { ok: false, error: r.error };
      break;
    }
    case 'YOUTUBE': {
      const { verifyYouTubeCredentials } = await import("@/lib/publishers/youtube");
      const r = await verifyYouTubeCredentials(creds.accessToken);
      result = r.ok ? { ok: true, detail: r.channelTitle } : { ok: false, error: r.error };
      break;
    }
    case 'WORDPRESS': {
      const { verifyWordPressCredentials } = await import("@/lib/publishers/wordpress");
      const r = await verifyWordPressCredentials({
        siteUrl: creds.siteUrl,
        username: creds.username,
        appPassword: creds.appPassword,
      });
      result = r.ok ? { ok: true, detail: r.username } : { ok: false, error: r.error };
      break;
    }
    default:
      // 에이전트 채널은 cron 에서 검증 skip — 발행 시점에 처리됨
      return {
        ok: true,
        detail: 'agent-channel-skipped',
        previousStatus,
        newStatus: previousStatus as any,
        channelType: channel.type,
        channelUserId: channel.userId,
        accountName: channel.accountName,
      };
  }

  const newStatus: 'ACTIVE' | 'ERROR' = result.ok ? 'ACTIVE' : 'ERROR';
  await prisma.marketingChannel.update({ where: { id: channelId }, data: { status: newStatus } });

  return {
    ok: result.ok,
    detail: result.detail,
    error: result.error,
    newStatus,
    previousStatus,
    channelType: channel.type,
    channelUserId: channel.userId,
    accountName: channel.accountName,
  };
}
