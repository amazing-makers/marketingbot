import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AgentClient from "./AgentClient";

// Next 16 + Mantine 9: Mantine compound components (Table.Thead, CopyButton 등) 가
// server component 에서 undefined 처리됨 → client wrapper 분리. server 는 데이터만.
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
            }))}
        />
    );
}
