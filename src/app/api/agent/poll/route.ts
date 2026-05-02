import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import dayjs from "dayjs";
import { decryptJSON } from "@/lib/crypto/aes";
import { sanitize } from "@/lib/log/sanitize";

const ZOMBIE_TIMEOUT_MS = 10 * 60 * 1000; // 10분
const CHANNEL_COOLDOWN_MS = 30 * 1000; // 30초
const MAX_TASKS_PER_POLL = 5;

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
        name: `${os} Agent (${machineId.substring(0, 4)})`,
      },
    });

    const now = new Date();
    const zombieThreshold = new Date(now.getTime() - ZOMBIE_TIMEOUT_MS);
    const cooldownThreshold = new Date(now.getTime() - CHANNEL_COOLDOWN_MS);

    // 3-7. 트랜잭션 안에서 좀비 복구 + busy/cooldown 체크 + reservation
    const reservedTasks = await prisma.$transaction(async (tx) => {
      // 3. 좀비 task 복구 (10분 이상 RUNNING)
      await tx.scheduledTask.updateMany({
        where: {
          campaign: { userId: license.userId },
          status: "RUNNING",
          updatedAt: { lt: zombieThreshold },
        },
        data: {
          status: "FAILED",
          errorLog: "Timeout (10분 RUNNING — 에이전트 응답 없음)",
        },
      });

      // 4. 현재 RUNNING 인 채널
      const busy = await tx.scheduledTask.findMany({
        where: {
          campaign: { userId: license.userId },
          status: "RUNNING",
        },
        select: { channelId: true },
      });
      const busyChannelIds = Array.from(new Set(busy.map((t) => t.channelId)));

      // 5. 직전 30초 내 게시 한 채널 (cooldown)
      const recent = await tx.scheduledTask.findMany({
        where: {
          campaign: { userId: license.userId },
          executedAt: { gte: cooldownThreshold },
        },
        select: { channelId: true },
      });
      const cooldownChannelIds = Array.from(new Set(recent.map((t) => t.channelId)));

      const excludeChannelIds = Array.from(
        new Set([...busyChannelIds, ...cooldownChannelIds])
      );

      // 6. 가져올 PENDING 후보
      const candidates = await tx.scheduledTask.findMany({
        where: {
          campaign: { userId: license.userId },
          status: "PENDING",
          scheduledAt: { lte: now },
          ...(excludeChannelIds.length > 0
            ? { channelId: { notIn: excludeChannelIds } }
            : {}),
        },
        orderBy: { scheduledAt: "asc" },
        take: 50,
        include: { channel: true },
      });

      // 같은 채널은 이번 폴링에서 1개만 dispatch
      const seenChannels = new Set<string>();
      const picked = candidates
        .filter((t) => {
          if (seenChannels.has(t.channelId)) return false;
          seenChannels.add(t.channelId);
          return true;
        })
        .slice(0, MAX_TASKS_PER_POLL);

      if (picked.length === 0) return [];

      // 7. RUNNING 으로 마크 (reservation)
      await tx.scheduledTask.updateMany({
        where: { id: { in: picked.map((t) => t.id) } },
        data: { status: "RUNNING", agentId: agent.id },
      });

      return picked;
    });

    if (reservedTasks.length === 0) {
      return NextResponse.json({ agentId: agent.id, tasks: [] });
    }

    const taskData = reservedTasks.map((t) => ({
      taskId: t.id,
      channelId: t.channelId,
      channelType: t.channel.type,
      accountName: t.channel.accountName,
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
