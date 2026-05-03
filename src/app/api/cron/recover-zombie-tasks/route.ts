import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ZOMBIE_TIMEOUT_MS = 10 * 60 * 1000; // 10분

/**
 * 좀비 task 복구 cron
 * 실행: 매 5분 (vercel.json schedule: '*\/5 * * * *')
 *
 * 10분 이상 RUNNING 으로 남아있는 task = 에이전트가 응답 안 한 좀비.
 * → FAILED 로 복구하여 사용자가 다시 시도 가능하게.
 */
export async function GET(req: NextRequest) {
  // 보안: Vercel Cron Secret
  const authHeader = req.headers.get("authorization");
  if (
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    process.env.NODE_ENV === "production"
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const threshold = new Date(Date.now() - ZOMBIE_TIMEOUT_MS);

  try {
    const result = await prisma.scheduledTask.updateMany({
      where: {
        status: "RUNNING",
        updatedAt: { lt: threshold },
      },
      data: {
        status: "FAILED",
        errorLog: "Timeout (10분 RUNNING — 에이전트 응답 없음, 자동 복구)",
      },
    });

    return NextResponse.json({
      ok: true,
      recovered: result.count,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[recover-zombie-tasks] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
