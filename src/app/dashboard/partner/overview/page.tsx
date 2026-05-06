import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getPartnerOverview } from '@/app/actions/partnerOverviewActions';
import { requireActivePartner } from '@/app/actions/resellerActions';
import {
    Container, Title, Text, Stack, Group, Paper, Badge, SimpleGrid, ThemeIcon, Card, Anchor, Box, Button,
} from '@mantine/core';
import { IconChartBar, IconBuildingStore, IconSpeakerphone, IconWorld, IconBolt, IconTrendingUp, IconTrendingDown, IconArrowRight } from '@tabler/icons-react';

export const dynamic = 'force-dynamic';

export default async function PartnerOverviewPage() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    // Phase 39 — 활성 파트너만 접근 가능
    try {
        await requireActivePartner();
    } catch (e: any) {
        const reason = e?.message === 'PARTNER_SUSPENDED' ? 'suspended' : 'not-partner';
        redirect(`/dashboard/partner?error=${reason}`);
    }

    const overview = await getPartnerOverview();
    if (!overview) redirect('/dashboard/partner');

    const successRate = overview.totals.thisMonthPublished + overview.totals.thisMonthFailed > 0
        ? Math.round((overview.totals.thisMonthPublished / (overview.totals.thisMonthPublished + overview.totals.thisMonthFailed)) * 100)
        : 0;

    const trendPercent = overview.totals.lastMonthPublished === 0
        ? (overview.totals.thisMonthPublished > 0 ? 100 : 0)
        : Math.round(((overview.totals.thisMonthPublished - overview.totals.lastMonthPublished) / overview.totals.lastMonthPublished) * 100);

    return (
        <Container size="xl" py={{ base: "md", sm: "xl" }}>
            <Stack gap="md">
                {/* 헤더 */}
                <Group justify="space-between">
                    <Stack gap={2}>
                        <Anchor href="/dashboard/partner" size="sm">← 파트너 대시보드</Anchor>
                        <Group gap={6}>
                            <IconChartBar size={24} />
                            <Title order={2}>모든 고객사 한눈에</Title>
                        </Group>
                        <Text size="sm" c="dimmed">{overview.period} · {overview.totals.clientCount}개 고객사 운영 중</Text>
                    </Stack>
                </Group>

                {/* 합산 KPI */}
                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                    <KpiCard
                        icon={IconBuildingStore}
                        color="violet"
                        label="활성 고객사"
                        value={overview.totals.clientCount.toLocaleString()}
                        hint="ACTIVE 상태"
                    />
                    <KpiCard
                        icon={IconSpeakerphone}
                        color="blue"
                        label="이번 달 캠페인"
                        value={overview.totals.thisMonthCampaigns.toLocaleString()}
                        hint={`발행 ${overview.totals.thisMonthPublished} · 실패 ${overview.totals.thisMonthFailed}`}
                    />
                    <KpiCard
                        icon={IconWorld}
                        color="teal"
                        label="활성 채널"
                        value={overview.totals.totalChannels.toLocaleString()}
                        hint={`자동 발행 ${overview.totals.totalRunningSeries}개 진행`}
                    />
                    <KpiCard
                        icon={trendPercent >= 0 ? IconTrendingUp : IconTrendingDown}
                        color={trendPercent >= 0 ? 'green' : 'red'}
                        label="발행 성공률"
                        value={`${successRate}%`}
                        hint={`전월 대비 ${trendPercent >= 0 ? '+' : ''}${trendPercent}%`}
                    />
                </SimpleGrid>

                {/* 고객사 카드 그리드 */}
                <Stack gap={6} mt="md">
                    <Group justify="space-between">
                        <Title order={4}>🏪 고객사별 상세</Title>
                        <Button
                            component="a"
                            href="/dashboard/partner/clients/new"
                            size="compact-sm"
                            variant="light"
                            color="violet"
                        >
                            + 고객사 추가
                        </Button>
                    </Group>
                    {overview.clients.length === 0 ? (
                        <Paper withBorder p="xl" radius="md">
                            <Stack gap="sm" align="center">
                                <Text size="sm" c="dimmed">아직 등록된 고객사가 없습니다</Text>
                                <Button component="a" href="/dashboard/partner/clients/new" color="violet">
                                    첫 고객사 등록하기
                                </Button>
                            </Stack>
                        </Paper>
                    ) : (
                        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                            {overview.clients.map(c => (
                                <Card key={c.id} withBorder p="md" radius="md">
                                    <Group justify="space-between" mb="sm">
                                        <Box
                                            style={{
                                                width: 36, height: 36, borderRadius: 8,
                                                background: c.workspace.brandColor || '#7C3AED',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'white', fontWeight: 700, fontSize: 14,
                                            }}
                                        >
                                            {c.clientName.slice(0, 2).toUpperCase()}
                                        </Box>
                                        {c.trendPercent !== 0 && (
                                            <Badge
                                                size="xs"
                                                color={c.trendPercent >= 0 ? 'green' : 'red'}
                                                variant="light"
                                                leftSection={c.trendPercent >= 0 ? <IconTrendingUp size={11} /> : <IconTrendingDown size={11} />}
                                            >
                                                {c.trendPercent >= 0 ? '+' : ''}{c.trendPercent}%
                                            </Badge>
                                        )}
                                    </Group>
                                    <Text fw={700} size="sm">{c.clientName}</Text>
                                    {c.industry && <Text size="xs" c="dimmed" mb="sm">{c.industry}</Text>}

                                    <SimpleGrid cols={2} spacing={4} mt="sm">
                                        <Box>
                                            <Text size="10px" c="dimmed">이번 달 캠페인</Text>
                                            <Text fw={700} size="md">{c.thisMonth.campaigns}</Text>
                                        </Box>
                                        <Box>
                                            <Text size="10px" c="dimmed">발행 성공</Text>
                                            <Text fw={700} size="md" c="teal">{c.thisMonth.published}</Text>
                                        </Box>
                                        <Box>
                                            <Text size="10px" c="dimmed">활성 채널</Text>
                                            <Text fw={700} size="md">{c.activeChannels}</Text>
                                        </Box>
                                        <Box>
                                            <Text size="10px" c="dimmed">자동 발행 진행</Text>
                                            <Group gap={4}>
                                                <Text fw={700} size="md" c="orange">{c.runningSeries}</Text>
                                                {c.runningSeries > 0 && <IconBolt size={12} color="var(--mantine-color-orange-6)" />}
                                            </Group>
                                        </Box>
                                    </SimpleGrid>

                                    <Group gap="xs" mt="md">
                                        <Anchor href={`/dashboard/partner/clients/${c.id}`} size="xs" style={{ flex: 1 }}>
                                            상세 보기 <IconArrowRight size={11} style={{ display: 'inline' }} />
                                        </Anchor>
                                    </Group>
                                </Card>
                            ))}
                        </SimpleGrid>
                    )}
                </Stack>
            </Stack>
        </Container>
    );
}

function KpiCard({ icon: Icon, color, label, value, hint }: {
    icon: any; color: string; label: string; value: string; hint?: string;
}) {
    return (
        <Paper withBorder p="md" radius="md">
            <Group gap={6} mb={4}>
                <ThemeIcon size={28} radius="md" variant="light" color={color}><Icon size={16} /></ThemeIcon>
                <Text size="xs" c="dimmed" fw={600}>{label}</Text>
            </Group>
            <Text fw={800} size="22px">{value}</Text>
            {hint && <Text size="11px" c="dimmed" mt={2}>{hint}</Text>}
        </Paper>
    );
}
