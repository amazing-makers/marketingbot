"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
