"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { ChannelType } from "@prisma/client";
import { encryptJSON } from "@/lib/crypto/aes";

// 세션 확인 유틸리티
async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

export async function listChannels() {
  const user = await getSessionUser();
  const channels = await prisma.marketingChannel.findMany({
    where: { userId: user.id },
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
  credentials: any;
}) {
  const user = await getSessionUser();

  // AES-256-GCM 암호화 적용
  const encryptedCredentials = encryptJSON(data.credentials);

  const channel = await prisma.marketingChannel.create({
    data: {
      userId: user.id!,
      type: data.type,
      accountName: data.accountName,
      encryptedCredentials,
    },
  });

  revalidatePath("/dashboard/channels");
  return channel;
}

export async function updateChannel(id: string, data: {
  accountName?: string;
  credentials?: any;
  status?: any;
}) {
  const user = await getSessionUser();

  const updateData: any = {};
  if (data.accountName) updateData.accountName = data.accountName;
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
