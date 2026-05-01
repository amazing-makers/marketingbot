import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { sanitize } from "@/lib/log/sanitize";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[HEARTBEAT] Request:", sanitize(body));
    const { machineId } = body;

    if (!machineId) {
      return NextResponse.json({ error: "Missing machineId" }, { status: 400 });
    }

    await prisma.agentInstance.update({
      where: { machineId },
      data: { lastSeenAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Agent not found or update failed" }, { status: 404 });
  }
}
