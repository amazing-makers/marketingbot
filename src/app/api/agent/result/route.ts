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
    const { taskId, status, executedAt, errorLog, kind } = body;

    // 1. 라이선스 및 유저 확인
    const license = await prisma.license.findUnique({
      where: { key: licenseKey },
    });

    if (!license) {
      return NextResponse.json({ error: "Invalid license" }, { status: 401 });
    }

    // Phase 50 — kind: 'VERIFY' / 'OPEN_BROWSER' 둘 다 ChannelVerifyTask 처리.
    // 'PUBLISH' (또는 미지정) 면 ScheduledTask 흐름으로.
    if (kind === 'VERIFY' || kind === 'OPEN_BROWSER') {
      const verifyTask = await prisma.channelVerifyTask.findFirst({
        where: { id: taskId, channel: { userId: license.userId } },
      });
      if (!verifyTask) {
        return NextResponse.json({ error: "Verify task not found" }, { status: 404 });
      }

      const finishedAt = executedAt ? new Date(executedAt) : new Date();
      await prisma.channelVerifyTask.update({
        where: { id: taskId },
        data: { status, errorLog, finishedAt },
      });

      // OPEN_BROWSER 는 단순 노출이라 채널 status 안 건드림 — 사용자 닫음/timeout 둘 다 정상.
      // VERIFY 만 채널 status / lastVerifiedAt / verifyError 갱신.
      if (verifyTask.kind === 'VERIFY') {
        const newChannelStatus = status === 'SUCCESS' ? 'ACTIVE' : 'ERROR';
        await prisma.marketingChannel.update({
          where: { id: verifyTask.channelId },
          data: {
            status: newChannelStatus,
            lastVerifiedAt: status === 'SUCCESS' ? finishedAt : undefined,
            verifyError: status === 'SUCCESS' ? null : (errorLog ?? '인증 실패'),
          },
        });
      }

      return NextResponse.json({ success: true });
    }

    // 2. 태스크 소유권 및 존재 확인
    const task = await prisma.scheduledTask.findFirst({
      where: {
        id: taskId,
        campaign: { userId: license.userId }
      },
      include: { channel: true, campaign: true },
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

    // Phase 50 — 발행 실패 시 사용자에게 즉시 알림 (in-app + push)
    if (status === 'FAILED') {
      try {
        const { createNotificationDedup } = await import('@/lib/notifications/create');
        const { toFriendlyError } = await import('@/lib/publish-error-messages');
        const friendly = toFriendlyError(errorLog);
        await createNotificationDedup({
          userId: license.userId,
          kind: 'CHANNEL_ERROR',
          title: `발행 실패 — ${task.channel.accountName} (${task.channel.type})`,
          body: friendly.title + (friendly.detail ? ` · ${friendly.detail}` : ''),
          link: `/dashboard/campaigns/${task.campaignId}`,
          metadata: {
            taskId: task.id,
            channelId: task.channelId,
            channelType: task.channel.type,
            campaignName: task.campaign?.name,
            errorRaw: (errorLog || '').slice(0, 500),
          },
        }, /* dedup window hours */ 1);
      } catch (e) {
        console.warn('[result] FAILED notification create error', e);
      }
    }

    // 4. 만약 캠페인의 모든 태스크가 완료되었다면 캠페인 상태 업데이트 (옵션)
    // 여기서는 간단히 개별 태스크 업데이트만 수행

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Agent result error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
