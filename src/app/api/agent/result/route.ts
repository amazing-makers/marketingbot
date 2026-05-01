import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { sanitize } from "@/lib/log/sanitize";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const licenseKey = authHeader.replace("Bearer ", "");
    const body = await req.json();
    console.log("[RESULT] Request:", sanitize(body));
    const { taskId, status, executedAt, errorLog } = body;

    // 1. 라이선스 및 유저 확인
    const license = await prisma.license.findUnique({
      where: { key: licenseKey },
    });

    if (!license) {
      return NextResponse.json({ error: "Invalid license" }, { status: 401 });
    }

    // 2. 태스크 소유권 및 존재 확인
    const task = await prisma.scheduledTask.findFirst({
      where: { 
        id: taskId,
        campaign: { userId: license.userId }
      }
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // 3. 태스크 상태 업데이트
    await prisma.scheduledTask.update({
      where: { id: taskId },
      data: { 
        status, 
        executedAt: executedAt ? new Date(executedAt) : new Date(),
        errorLog 
      },
    });

    // 4. 만약 캠페인의 모든 태스크가 완료되었다면 캠페인 상태 업데이트 (옵션)
    // 여기서는 간단히 개별 태스크 업데이트만 수행

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Agent result error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
