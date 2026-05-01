"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { TaskStatus } from "@prisma/client";

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
}) {
  const user = await getSessionUser();

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

    // 2. 채널별 작업(Task) 생성
    await tx.scheduledTask.createMany({
      data: data.channelIds.map((channelId) => ({
        campaignId: newCampaign.id,
        channelId: channelId,
        content: data.content,
        mediaUrls: data.mediaUrls ? (data.mediaUrls as any) : undefined,
        scheduledAt: data.scheduledAt,
        status: TaskStatus.PENDING,
      })),
    });

    return newCampaign;
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

export async function deleteCampaign(id: string) {
  const user = await getSessionUser();
  await prisma.campaign.delete({
    where: { id, userId: user.id },
  });

  revalidatePath("/dashboard/campaigns");
  return { success: true };
}
