import { prisma } from '@/lib/prisma';
import { Paper, Group, Text, SimpleGrid, Box, Anchor, ThemeIcon, Stack } from '@mantine/core';
import { IconTrophy, IconBolt, IconCheck, IconAlertCircle, IconArrowRight } from '@tabler/icons-react';
import dayjs from 'dayjs';
import Link from 'next/link';

/**
 * Phase 47 — 대시보드용 본인 활동 메트릭 위젯.
 *
 * 이번 주(7일) 메트릭:
 *   - 발행 성공 / 실패 카운트 + 성공률
 *   - top 캠페인 (가장 많은 SUCCESS task)
 *   - 채널별 활용 (가장 많이 발행된 채널 type)
 *
 * 첫 SUCCESS 가 있을 때만 표시 (신규 사용자에겐 노이즈).
 */
export default async function MyMetricsWidget({ userId }: { userId: string }) {
    const sevenDaysAgo = dayjs().subtract(7, 'day').toDate();

    const [successCount, failedCount, topCampaign, topChannel] = await Promise.all([
        prisma.scheduledTask.count({
            where: { campaign: { userId }, status: 'SUCCESS', executedAt: { gte: sevenDaysAgo } },
        }),
        prisma.scheduledTask.count({
            where: { campaign: { userId }, status: 'FAILED', executedAt: { gte: sevenDaysAgo } },
        }),
        prisma.scheduledTask.groupBy({
            by: ['campaignId'],
            where: { campaign: { userId }, status: 'SUCCESS', executedAt: { gte: sevenDaysAgo } },
            _count: { _all: true },
            orderBy: { _count: { campaignId: 'desc' } },
            take: 1,
        }).then(async (groups) => {
            if (groups.length === 0) return null;
            const top = groups[0];
            const c = await prisma.campaign.findUnique({
                where: { id: top.campaignId },
                select: { id: true, name: true },
            });
            return c ? { campaignId: c.id, name: c.name, count: top._count._all } : null;
        }),
        prisma.scheduledTask.groupBy({
            by: ['channelId'],
            where: { campaign: { userId }, status: 'SUCCESS', executedAt: { gte: sevenDaysAgo } },
            _count: { _all: true },
            orderBy: { _count: { channelId: 'desc' } },
            take: 1,
        }).then(async (groups) => {
            if (groups.length === 0) return null;
            const top = groups[0];
            const ch = await prisma.marketingChannel.findUnique({
                where: { id: top.channelId },
                select: { type: true, accountName: true },
            });
            return ch ? { type: ch.type, accountName: ch.accountName, count: top._count._all } : null;
        }),
    ]);

    const total = successCount + failedCount;
    const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;

    // 첫 SUCCESS 가 없으면 위젯 숨김 (신규 사용자에겐 노이즈)
    if (successCount === 0) return null;

    return (
        <Paper withBorder p="md" radius="md" mb="md">
            <Group justify="space-between" mb="md">
                <Group gap={6}>
                    <IconTrophy size={18} color="var(--mantine-color-violet-6)" />
                    <Text fw={700} size="sm">📊 이번 주 내 활동</Text>
                </Group>
                <Anchor component={Link} href="/dashboard/analytics" size="xs" c="violet">
                    전체 분석 →
                </Anchor>
            </Group>

            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                {/* 성공 */}
                <Stack gap={2}>
                    <Group gap={4}>
                        <IconCheck size={12} color="var(--mantine-color-teal-6)" />
                        <Text size="11px" c="dimmed">발행 성공</Text>
                    </Group>
                    <Text fw={800} size="20px">{successCount}건</Text>
                </Stack>

                {/* 실패 */}
                <Stack gap={2}>
                    <Group gap={4}>
                        <IconAlertCircle size={12} color="var(--mantine-color-red-6)" />
                        <Text size="11px" c="dimmed">발행 실패</Text>
                    </Group>
                    <Text fw={800} size="20px" c={failedCount > 0 ? 'red.7' : undefined}>
                        {failedCount}건
                    </Text>
                </Stack>

                {/* 성공률 */}
                <Stack gap={2}>
                    <Group gap={4}>
                        <IconBolt size={12} color="var(--mantine-color-violet-6)" />
                        <Text size="11px" c="dimmed">성공률</Text>
                    </Group>
                    <Text
                        fw={800}
                        size="20px"
                        c={successRate >= 90 ? 'teal.7' : successRate >= 70 ? 'orange.7' : 'red.7'}
                    >
                        {successRate}%
                    </Text>
                </Stack>

                {/* 베스트 채널 */}
                <Stack gap={2}>
                    <Text size="11px" c="dimmed">베스트 채널</Text>
                    {topChannel ? (
                        <Stack gap={0}>
                            <Text fw={700} size="13px" truncate>{topChannel.type}</Text>
                            <Text size="10px" c="dimmed" truncate>{topChannel.count}건 · {topChannel.accountName}</Text>
                        </Stack>
                    ) : (
                        <Text size="13px" c="dimmed">-</Text>
                    )}
                </Stack>
            </SimpleGrid>

            {topCampaign && (
                <Box mt="sm" pt="sm" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                    <Group gap={6}>
                        <ThemeIcon size={20} radius="md" color="violet" variant="light">
                            <IconTrophy size={11} />
                        </ThemeIcon>
                        <Text size="xs" c="dimmed">🏆 베스트 캠페인:</Text>
                        <Anchor
                            component={Link}
                            href={`/dashboard/campaigns/${topCampaign.campaignId}`}
                            size="xs"
                            fw={600}
                            style={{ flex: 1 }}
                        >
                            {topCampaign.name}
                        </Anchor>
                        <Text size="11px" c="dimmed">{topCampaign.count}건 발행</Text>
                    </Group>
                </Box>
            )}
        </Paper>
    );
}
