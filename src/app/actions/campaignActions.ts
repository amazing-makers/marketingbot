"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { TaskStatus } from "@prisma/client";
import { translateText } from "@/lib/ai/translator";

async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

export async function listCampaigns() {
  const user = await getSessionUser();
  return await prisma.campaign.findMany({
    where: { userId: user.id },
    include: {
      _count: {
        select: { tasks: true }
      }
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCampaign(id: string) {
  const user = await getSessionUser();
  return await prisma.campaign.findUnique({
    where: { id, userId: user.id },
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
}) {
  const user = await getSessionUser();

  const sourceLanguage = data.sourceLanguage || 'ko';
  const autoTranslate = data.autoTranslate !== false;

  // 채널 정보 (region/language) 미리 로드 — 자동 번역에 사용
  const channels = await prisma.marketingChannel.findMany({
    where: { id: { in: data.channelIds }, userId: user.id },
  });
  if (channels.length !== data.channelIds.length) {
    throw new Error('일부 채널을 찾을 수 없습니다.');
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
        name: data.name,
        description: data.description,
        status: "SCHEDULED",
        scheduledAt: data.scheduledAt,
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
