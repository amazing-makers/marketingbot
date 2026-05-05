"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function setOnboardingCompleted() {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        onboardingCompletedAt: new Date(),
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/onboarding");
    return { success: true };
  } catch (error) {
    console.error("Failed to update onboarding status:", error);
    return { success: false, error: "Internal Server Error" };
  }
}

export async function getLicenseKey() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const license = await prisma.license.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return license;
}
export async function updateEmailPreferences(preferences: { failures: boolean; weekly: boolean; welcome: boolean }) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        emailPreferences: preferences,
      },
    });

    revalidatePath("/dashboard/settings/notifications");
    return { success: true };
  } catch (error) {
    console.error("Failed to update email preferences:", error);
    return { success: false, error: "Internal Server Error" };
  }
}

export async function getEmailPreferences() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailPreferences: true },
  });

  return user?.emailPreferences as { failures: boolean; weekly: boolean; welcome: boolean } | null;
}

// ════════════════════════════════════════════════════════════
//  Phase 33 — 프로필
// ════════════════════════════════════════════════════════════

export async function getMyProfile() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, createdAt: true, role: true },
  });
  if (!user) throw new Error('사용자 미존재');
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    role: user.role,
  };
}

export async function updateMyName(name: string): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  const trimmed = name?.trim();
  if (!trimmed) throw new Error('이름을 입력하세요');
  if (trimmed.length > 60) throw new Error('이름은 60자 이내로 입력하세요');

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: trimmed },
  });
  revalidatePath('/dashboard/settings/profile');
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function changeMyPassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');
  if (!input.currentPassword) throw new Error('현재 비밀번호를 입력하세요');
  if (!input.newPassword || input.newPassword.length < 6) {
    throw new Error('새 비밀번호는 최소 6자 이상이어야 합니다');
  }
  if (input.currentPassword === input.newPassword) {
    throw new Error('새 비밀번호는 기존과 달라야 합니다');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { password: true },
  });
  if (!user) throw new Error('사용자 미존재');

  const ok = await bcrypt.compare(input.currentPassword, user.password);
  if (!ok) throw new Error('현재 비밀번호가 일치하지 않습니다');

  const hashed = await bcrypt.hash(input.newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  });
  return { ok: true };
}
