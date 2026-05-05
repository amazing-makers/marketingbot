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
  }

  const channel = await prisma.marketingChannel.update({
    where: { id, userId: user.id },
    data: updateData,
  });

  revalidatePath("/dashboard/channels");
  return channel;
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
      // 에이전트 채널 (Instagram/Facebook/Threads/Naver/카카오 등)
      // 브라우저 자동화라 즉시 검증 불가 — 첫 발행 시 에이전트가 검증
      await prisma.marketingChannel.update({
        where: { id: channelId },
        data: { status: 'PENDING_AUTH' },
      });
      return {
        ok: true,
        detail: '에이전트가 첫 발행 시 로그인 검증합니다. 데스크톱 에이전트가 설치·실행 중인지 확인해주세요.',
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
