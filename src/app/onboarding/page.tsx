import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      licenses: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  // 온보딩이 이미 완료된 경우 (skip 쿼리가 없는 한) 대시보드로 이동
  if (user.onboardingCompletedAt) {
    redirect("/dashboard");
  }

  const license = user.licenses[0] || null;

  return (
    <OnboardingClient 
      userName={user.name || "사용자"} 
      license={license} 
    />
  );
}
