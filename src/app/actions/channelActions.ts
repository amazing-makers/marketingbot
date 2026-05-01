"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { ChannelType } from "@prisma/client";

// 세션 확인 유틸리티
async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

export async function listChannels() {
  const user = await getSessionUser();
  return await prisma.marketingChannel.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
}

export async function createChannel(data: {
  type: ChannelType;
  accountName: string;
  credentials: any;
}) {
  const user = await getSessionUser();

  // TODO: encrypt in Phase 4
  const encryptedCredentials = JSON.stringify(data.credentials);

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
    // TODO: encrypt in Phase 4
    updateData.encryptedCredentials = JSON.stringify(data.credentials);
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
