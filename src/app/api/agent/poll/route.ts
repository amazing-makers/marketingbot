import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import dayjs from "dayjs";
import { decryptJSON } from "@/lib/crypto/aes";
import { sanitize } from "@/lib/log/sanitize";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing license key" }, { status: 401 });
    }

    const licenseKey = authHeader.replace("Bearer ", "");
    const body = await req.json();
    console.log("[POLL] Request body:", sanitize(body));
    const { machineId, version, os } = body;

    // 1. 라이선스 확인
    const license = await prisma.license.findUnique({
      where: { key: licenseKey },
      include: { user: true },
    });

    if (!license || (license.validUntil && dayjs(license.validUntil).isBefore(dayjs()))) {
      return NextResponse.json({ error: "Invalid or expired license" }, { status: 401 });
    }

    // 2. 에이전트 인스턴스 정보 업데이트 (Upsert)
    const agent = await prisma.agentInstance.upsert({
      where: { machineId },
      update: { lastSeenAt: new Date(), version, os },
      create: { 
        userId: license.userId, 
        machineId, 
        version, 
        os,
        name: `${os} Agent (${machineId.substring(0, 4)})`
      },
    });

    // 3. 수행 대기 중인 작업(PENDING) 조회 (최대 5개)
    const now = new Date();
    const tasks = await prisma.scheduledTask.findMany({
      where: {
        campaign: { userId: license.userId },
        status: "PENDING",
        scheduledAt: { lte: now },
      },
      take: 5,
      include: { channel: true },
    });

    if (tasks.length === 0) {
      return NextResponse.json({ agentId: agent.id, tasks: [] });
    }

    // 4. 작업 상태를 RUNNING으로 변경 (Reservation)
    const taskIds = tasks.map(t => t.id);
    await prisma.scheduledTask.updateMany({
      where: { id: { in: taskIds } },
      data: { status: "RUNNING", agentId: agent.id },
    });

    // 5. 응답 반환 (자격증명 포함 - Phase 4에서 암호화 처리 예정)
    const taskData = tasks.map(t => ({
      taskId: t.id,
      channelType: t.channel.type,
      accountName: t.channel.accountName,
      // AES-256-GCM 복호화 적용 (HTTPS 보안 통신 전제)
      // TODO: 추후 mTLS 또는 추가 암호화 레이어 검토
      credentials: decryptJSON(t.channel.encryptedCredentials),
      content: t.content,
      mediaUrls: t.mediaUrls,
    }));

    return NextResponse.json({ agentId: agent.id, tasks: taskData });
  } catch (error) {
    console.error("Agent poll error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
