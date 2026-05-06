import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getCampaignFunnel, getSeriesCohort, getChannelRetention } from '@/app/actions/statsActions';
import {
    Title, Text, Stack, Group, Paper, SimpleGrid, Badge, Box, Table,
} from '@mantine/core';
import { IconChartBar, IconTrendingUp, IconUsersGroup, IconActivity } from '@tabler/icons-react';

export const dynamic = 'force-dynamic';

const STAGE_COLORS = ['violet', 'blue', 'teal', 'green'];

export default async function AnalyticsPage() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const [funnel, cohort, retention] = await Promise.all([
        getCampaignFunnel({ days: 30 }),
        getSeriesCohort(),
        getChannelRetention(),
    ]);

    return (
        <Stack gap="md">
            <Stack gap={2}>
                <Group gap={6}><IconChartBar size={24} /><Title order={2}>📊 심층 분석</Title></Group>
                <Text size="sm" c="dimmed">최근 30일 펀넬 · 시리즈 코호트 · 채널 활용도</Text>
            </Stack>

                {/* 펀넬 */}
                <Paper withBorder p="lg" radius="md">
                    <Group gap={6} mb="md"><IconTrendingUp size={18} /><Title order={4}>📈 캠페인 발행 펀넬</Title></Group>
                    <Text size="xs" c="dimmed" mb="md">최근 30일 — 작성한 캠페인이 실제 발행으로 이어지는 비율</Text>
                    <Stack gap={6}>
                        {funnel.map((f, i) => (
                            <Box key={f.stage}>
                                <Group justify="space-between" mb={4}>
                                    <Group gap={6}>
                                        <Badge size="sm" color={STAGE_COLORS[i]} variant="light">{i + 1}</Badge>
                                        <Text fw={600} size="sm">{f.stage}</Text>
                                    </Group>
                                    <Group gap={6}>
                                        <Text fw={700} size="sm">{f.count}건</Text>
                                        <Text size="xs" c="dimmed">{f.percent}%</Text>
                                    </Group>
                                </Group>
                                <Box style={{
                                    width: `${f.percent}%`,
                                    minWidth: 4,
                                    height: 8,
                                    background: `var(--mantine-color-${STAGE_COLORS[i]}-5)`,
                                    borderRadius: 4,
                                    transition: 'width 0.3s',
                                }} />
                            </Box>
                        ))}
                    </Stack>
                    {funnel[0].count === 0 && (
                        <Text size="sm" c="dimmed" ta="center" mt="md">최근 30일 캠페인이 없어요. 첫 캠페인을 만들어보세요.</Text>
                    )}
                </Paper>

                {/* 시리즈 코호트 */}
                <Paper withBorder p="lg" radius="md">
                    <Group gap={6} mb="md"><IconUsersGroup size={18} /><Title order={4}>🤖 시리즈 코호트 (주차별 완성률)</Title></Group>
                    <Text size="xs" c="dimmed" mb="md">시작 주차별 평균 완성률 — 자동 발행이 끝까지 잘 굴러가는지</Text>
                    {cohort.length === 0 ? (
                        <Text size="sm" c="dimmed" ta="center">최근 12주 시리즈가 없어요</Text>
                    ) : (
                        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                            {cohort.slice(0, 8).map(c => (
                                <Paper key={c.week} withBorder p="sm" radius="md">
                                    <Text size="xs" c="dimmed">{c.week} 시작</Text>
                                    <Text fw={700} size="md">{c.avgCompletion}%</Text>
                                    <Text size="11px" c="dimmed">{c.series}개 시리즈</Text>
                                </Paper>
                            ))}
                        </SimpleGrid>
                    )}
                </Paper>

                {/* 채널 활용도 */}
                <Paper withBorder p="lg" radius="md">
                    <Group gap={6} mb="md"><IconActivity size={18} /><Title order={4}>🌐 채널 활용도</Title></Group>
                    <Text size="xs" c="dimmed" mb="md">각 채널이 등록 후 얼마나 자주 사용되는지 — 활성 30일 내 사용 기준</Text>
                    {retention.length === 0 ? (
                        <Text size="sm" c="dimmed" ta="center">등록된 채널이 없어요</Text>
                    ) : (
                        <Table.ScrollContainer minWidth={680}>
                        <Table striped>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>채널</Table.Th>
                                    <Table.Th>상태</Table.Th>
                                    <Table.Th>등록 후</Table.Th>
                                    <Table.Th>마지막 사용</Table.Th>
                                    <Table.Th>총 발행</Table.Th>
                                    <Table.Th>일 평균</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {retention.map(r => (
                                    <Table.Tr key={r.id}>
                                        <Table.Td>
                                            <Group gap={4}>
                                                <Badge size="xs" variant="light">{r.type}</Badge>
                                                <Text size="sm">{r.accountName}</Text>
                                            </Group>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge size="xs" color={r.isActive ? 'teal' : 'gray'} variant="light">
                                                {r.isActive ? '활성' : '비활성'}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td><Text size="xs" c="dimmed">{r.registeredDaysAgo}일 전</Text></Table.Td>
                                        <Table.Td>
                                            <Text size="xs" c={r.lastUsedDaysAgo === null ? 'red' : r.lastUsedDaysAgo < 7 ? 'teal' : 'dimmed'}>
                                                {r.lastUsedDaysAgo === null ? '미사용' : `${r.lastUsedDaysAgo}일 전`}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td><Text size="sm">{r.taskCount}회</Text></Table.Td>
                                        <Table.Td><Text size="xs" c="dimmed">{r.avgTasksPerDay}/일</Text></Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                        </Table.ScrollContainer>
                    )}
                </Paper>

            <Paper withBorder p="md" radius="md" bg="blue.0">
                <Text size="xs" c="blue.9">
                    💡 펀넬 전환율이 낮으면 캠페인 작성 흐름 점검 / 코호트 완성률이 낮으면 시리즈 설정 (channelId·schedule) 점검 / 채널 활용도가 낮으면 자동 발행 시리즈 설정 권장.
                </Text>
            </Paper>
        </Stack>
    );
}
