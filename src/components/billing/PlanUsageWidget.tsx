import { Paper, Stack, Group, Text, Progress, Badge, Anchor } from '@mantine/core';
import { IconBolt, IconWorld, IconRobot, IconRocket } from '@tabler/icons-react';
import Link from 'next/link';
import { getUsageSummary } from '@/lib/billing/plan-limits';

/**
 * Phase 33 — 대시보드 플랜 사용량 위젯 (서버 컴포넌트).
 * 한도 70%+ 도달 시 경고 색상 강조.
 */
export default async function PlanUsageWidget({ userId }: { userId: string }) {
    const usage = await getUsageSummary(userId);
    // 모든 카테고리에서 한도가 50% 미만이면 위젯 숨김 (불필요한 노이즈 방지)
    const maxPct = Math.max(usage.pctUsed.channels, usage.pctUsed.activeSeries, usage.pctUsed.todayTasks);
    if (maxPct < 50 && usage.plan !== 'FREE') return null;

    const isFree = usage.plan === 'FREE';
    const showUpgrade = isFree || maxPct >= 80;

    const colorFor = (pct: number) => pct >= 90 ? 'red' : pct >= 70 ? 'orange' : 'teal';

    return (
        <Paper withBorder p="md" radius="md" mb="md">
            <Group justify="space-between" mb="md" wrap="wrap">
                <Group gap={6}>
                    <Text fw={700} size="sm">📊 오늘의 사용량</Text>
                    <Badge size="sm" color={isFree ? 'gray' : 'violet'} variant="light">
                        {usage.limits.label}
                    </Badge>
                </Group>
                {showUpgrade && (
                    <Anchor component={Link} href="/dashboard/settings/billing" size="xs" fw={600} c="violet">
                        <Group gap={4}>
                            <IconRocket size={12} />
                            <span>플랜 업그레이드 →</span>
                        </Group>
                    </Anchor>
                )}
            </Group>

            <Stack gap="sm">
                <UsageRow
                    icon={<IconWorld size={14} />}
                    label="채널"
                    current={usage.usage.channels}
                    limit={usage.limits.maxChannels}
                    pct={usage.pctUsed.channels}
                    color={colorFor(usage.pctUsed.channels)}
                />
                <UsageRow
                    icon={<IconRobot size={14} />}
                    label="활성 시리즈"
                    current={usage.usage.activeSeries}
                    limit={usage.limits.maxActiveSeries}
                    pct={usage.pctUsed.activeSeries}
                    color={colorFor(usage.pctUsed.activeSeries)}
                />
                <UsageRow
                    icon={<IconBolt size={14} />}
                    label="오늘 발행 task"
                    current={usage.usage.todayTasks}
                    limit={usage.limits.dailyTaskLimit}
                    pct={usage.pctUsed.todayTasks}
                    color={colorFor(usage.pctUsed.todayTasks)}
                />
            </Stack>
        </Paper>
    );
}

function UsageRow({ icon, label, current, limit, pct, color }: {
    icon: React.ReactNode;
    label: string;
    current: number;
    limit: number;
    pct: number;
    color: string;
}) {
    return (
        <div>
            <Group justify="space-between" mb={2}>
                <Group gap={4}>
                    {icon}
                    <Text size="xs">{label}</Text>
                </Group>
                <Text size="xs" fw={600} c={pct >= 90 ? 'red' : 'dimmed'}>
                    {current} / {limit}
                </Text>
            </Group>
            <Progress value={pct} size="xs" color={color} />
        </div>
    );
}
