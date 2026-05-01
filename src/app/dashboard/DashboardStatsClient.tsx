'use client';

import { 
    Container, SimpleGrid, Stack, Group, SegmentedControl, Title, Text, Box, Card, Badge, Anchor, List 
} from '@mantine/core';
import { 
    IconCalendarEvent, IconLoader2, IconCheck, IconAlertCircle, IconWorld, IconDevices, IconChevronRight 
} from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dayjs from 'dayjs';
import { DailyTrendChart } from '@/components/dashboard/charts/DailyTrendChart';
import { ChannelDistributionChart } from '@/components/dashboard/charts/ChannelDistributionChart';
import { SuccessRateCard } from '@/components/dashboard/charts/SuccessRateCard';
import { HourlyDistributionChart } from '@/components/dashboard/charts/HourlyDistributionChart';

export function DashboardStatsClient({ 
    summary, quickStart, recentCampaigns, daily, channels, success, hourly, initialDays 
}: any) {
    const router = useRouter();

    const stats = [
        { title: '이번 주 예약', value: summary.pendingCount, icon: IconCalendarEvent, color: 'blue' },
        { title: '진행 중 작업', value: summary.runningCount, icon: IconLoader2, color: 'cyan' },
        { title: '오늘 성공', value: summary.todaySuccess, icon: IconCheck, color: 'green' },
        { title: '오늘 실패', value: summary.todayFailed, icon: IconAlertCircle, color: 'red' },
        { title: '연동된 채널', value: summary.channelCount, icon: IconWorld, color: 'violet' },
        { title: '활성 에이전트', value: summary.agentCount, icon: IconDevices, color: 'teal' },
    ];

    const quickStartSteps = [
        { label: '라이선스 확인', done: true, link: '/dashboard/agent' },
        { label: '에이전트 설치', done: quickStart.agentCount > 0, link: '/dashboard/agent' },
        { label: '첫 채널 연결', done: quickStart.channelCount > 0, link: '/dashboard/channels' },
        { label: '첫 캠페인 발행', done: quickStart.campaignCount > 0, link: '/dashboard/campaigns/new' },
    ];

    const showQuickStart = !quickStart.onboardingCompletedAt || 
                         dayjs().diff(dayjs(quickStart.onboardingCompletedAt), 'day') < 7;
    const allStepsDone = quickStartSteps.every(s => s.done);

    return (
        <Container size="xl" py="md">
            <Stack gap="xl">
                {/* 헤더 및 기간 필터 */}
                <Group justify="space-between" align="flex-end">
                    <Box>
                        <Title order={2}>대시보드</Title>
                        <Text size="sm" c="dimmed">현재 마케팅 활동 현황 및 분석 데이터입니다.</Text>
                    </Box>
                    <Stack gap={5} align="flex-end">
                        <Text size="xs" fw={700} c="dimmed">데이터 분석 기간</Text>
                        <SegmentedControl
                            value={initialDays.toString()}
                            onChange={(v) => router.push(`/dashboard?days=${v}`, { scroll: false })}
                            data={[
                                { label: '7일', value: '7' },
                                { label: '30일', value: '30' },
                                { label: '90일', value: '90' },
                            ]}
                            radius="md"
                            color="blue"
                        />
                    </Stack>
                </Group>

                {/* 퀵 스타트 가이드 */}
                {showQuickStart && !allStepsDone && (
                    <Card withBorder radius="md" p="xl" bg="blue.0">
                        <Group justify="space-between" mb="md">
                            <Stack gap={0}>
                                <Text fw={700} size="lg">🚀 퀵 스타트 가이드</Text>
                                <Text size="sm" c="dimmed">효과적인 마케팅을 위해 아래 단계를 완료해주세요.</Text>
                            </Stack>
                            <Badge size="lg" variant="filled">
                                {quickStartSteps.filter(s => s.done).length} / {quickStartSteps.length} 완료
                            </Badge>
                        </Group>
                        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                            {quickStartSteps.map((step, idx) => (
                                <Card key={idx} withBorder radius="sm" p="sm" bg={step.done ? 'white' : 'blue.1'}>
                                    <Group gap="xs">
                                        {step.done ? (
                                            <IconCheck size={16} color="var(--mantine-color-green-6)" />
                                        ) : (
                                            <IconChevronRight size={16} color="var(--mantine-color-blue-6)" />
                                        )}
                                        <Anchor component={Link} href={step.link} size="sm" fw={step.done ? 400 : 700} c={step.done ? 'dimmed' : 'blue'}>
                                            {step.label}
                                        </Anchor>
                                    </Group>
                                </Card>
                            ))}
                        </SimpleGrid>
                    </Card>
                )}

                {/* 요약 지표 카드 */}
                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                    {stats.map((stat) => (
                        <Card key={stat.title} withBorder radius="md" padding="lg">
                            <Group justify="space-between">
                                <Stack gap={0}>
                                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">{stat.title}</Text>
                                    <Text fw={700} size="xl">{stat.value}</Text>
                                </Stack>
                                <stat.icon size={32} stroke={1.5} color={`var(--mantine-color-${stat.color}-filled)`} />
                            </Group>
                        </Card>
                    ))}
                </SimpleGrid>

                {/* 분석 차트 그리드 */}
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                    <DailyTrendChart data={daily} days={initialDays} />
                    <SuccessRateCard {...success} />
                    <ChannelDistributionChart data={channels} />
                    <HourlyDistributionChart data={hourly} />
                </SimpleGrid>

                {/* 상세 목록 및 안내 */}
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
                    <Card withBorder radius="md" padding="xl">
                        <Group justify="space-between" mb="md">
                            <Title order={4}>최근 캠페인</Title>
                            <Anchor component={Link} href="/dashboard/campaigns" size="sm">전체 보기</Anchor>
                        </Group>
                        <Stack>
                            {recentCampaigns.map((c: any) => (
                                <Group key={c.id} justify="space-between">
                                    <Stack gap={0}>
                                        <Text size="sm" fw={500}>{c.name}</Text>
                                        <Text size="xs" c="dimmed">{dayjs(c.createdAt).format('YYYY-MM-DD')}</Text>
                                    </Stack>
                                    <Badge variant="light" size="sm">{c._count.tasks} Tasks</Badge>
                                </Group>
                            ))}
                            {recentCampaigns.length === 0 && <Text size="sm" c="dimmed">진행 중인 캠페인이 없습니다.</Text>}
                        </Stack>
                    </Card>

                    <Card withBorder radius="md" padding="xl">
                        <Title order={4} mb="md">공지사항 및 팁</Title>
                        <List spacing="xs" size="sm" center icon={
                            <IconCheck size={12} color="var(--mantine-color-blue-6)" />
                        }>
                            <List.Item>에이전트를 실행하여 자동 발행을 시작하세요.</List.Item>
                            <List.Item>채널의 인증이 만료되지 않았는지 정기적으로 확인하세요.</List.Item>
                            <List.Item>콘텐츠 가이드라인을 준수하여 계정 정지를 예방하세요.</List.Item>
                        </List>
                    </Card>
                </SimpleGrid>
            </Stack>
        </Container>
    );
}
