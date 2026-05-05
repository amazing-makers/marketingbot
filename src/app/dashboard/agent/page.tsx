import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import dayjs from "dayjs";
import AgentClient from "./AgentClient";

// Next 16 + Mantine 9: Mantine compound components (Table.Thead, CopyButton 등) 가
// server component 에서 undefined 처리됨 → client wrapper 분리. server 는 데이터만.
export const dynamic = 'force-dynamic';

export default async function AgentPage() {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
            licenses: { orderBy: { createdAt: "desc" }, take: 1 },
            agents: { orderBy: { lastSeenAt: "desc" } }
        }
    });
    if (!user) redirect("/login");

    const license = user.licenses[0];

    // Phase 29 — 에이전트별 오늘 처리 통계 + 현재 RUNNING task 수
    const startOfDay = dayjs().startOf('day').toDate();
    const agentIds = user.agents.map(a => a.id);
    const [taskGroups, runningGroups] = agentIds.length === 0 ? [[], []] : await Promise.all([
        prisma.scheduledTask.groupBy({
            by: ['agentId', 'status'],
            where: {
                agentId: { in: agentIds },
                executedAt: { gte: startOfDay },
            },
            _count: { _all: true },
        }),
        prisma.scheduledTask.groupBy({
            by: ['agentId'],
            where: {
                agentId: { in: agentIds },
                status: 'RUNNING',
            },
            _count: { _all: true },
        }),
    ]);

    const statsByAgent: Record<string, { success: number; failed: number; running: number }> = {};
    for (const id of agentIds) statsByAgent[id] = { success: 0, failed: 0, running: 0 };
    for (const g of taskGroups) {
        if (!g.agentId) continue;
        const s = statsByAgent[g.agentId];
        if (!s) continue;
        if (g.status === 'SUCCESS') s.success += g._count._all;
        else if (g.status === 'FAILED') s.failed += g._count._all;
    }
    for (const g of runningGroups) {
        if (!g.agentId) continue;
        const s = statsByAgent[g.agentId];
        if (s) s.running = g._count._all;
    }

    // Phase 30 — 최근 task 활동 로그 (모든 에이전트 통합 20개)
    const recentTasks = agentIds.length === 0 ? [] : await prisma.scheduledTask.findMany({
        where: {
            agentId: { in: agentIds },
            status: { in: ['SUCCESS', 'FAILED', 'RUNNING'] },
        },
        orderBy: [
            { executedAt: { sort: 'desc', nulls: 'last' } },
            { updatedAt: 'desc' },
        ],
        take: 20,
        include: {
            channel: { select: { type: true, accountName: true } },
            campaign: { select: { name: true } },
        },
    });

    return (
        <AgentClient
            license={license ? {
                key: license.key,
                plan: license.plan,
                validUntil: license.validUntil ? license.validUntil.toISOString() : null,
            } : null}
            agents={user.agents.map(a => ({
                id: a.id,
                name: a.name,
                machineId: a.machineId,
                version: a.version,
                lastSeenAt: a.lastSeenAt.toISOString(),
                todaySuccess: statsByAgent[a.id]?.success ?? 0,
                todayFailed: statsByAgent[a.id]?.failed ?? 0,
                running: statsByAgent[a.id]?.running ?? 0,
            }))}
            recentTasks={recentTasks.map(t => ({
                id: t.id,
                campaignName: t.campaign.name,
                channelType: t.channel.type,
                accountName: t.channel.accountName,
                status: t.status,
                executedAt: t.executedAt?.toISOString() || null,
                updatedAt: t.updatedAt.toISOString(),
                contentPreview: t.content.slice(0, 80),
                errorLog: t.errorLog?.slice(0, 200) || null,
                agentId: t.agentId || null,
            }))}
        />
    );
}
