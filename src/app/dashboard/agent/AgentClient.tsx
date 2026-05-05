'use client';

import {
    Title, Text, Stack, Paper, Group, Code, CopyButton, ActionIcon,
    Button, Table, Badge, rem, SimpleGrid
} from '@mantine/core';
import { IconCopy, IconCheck, IconDownload, IconDeviceDesktop, IconActivity, IconClock, IconAlertCircle } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AgentRow {
    id: string;
    name: string | null;
    machineId: string;
    version: string;
    lastSeenAt: string;
    todaySuccess: number;
    todayFailed: number;
    running: number;
}

interface LicenseRow {
    key: string;
    plan: string;
    validUntil: string | null;
}

interface RecentTask {
    id: string;
    campaignName: string;
    channelType: string;
    accountName: string;
    status: string;
    executedAt: string | null;
    updatedAt: string;
    contentPreview: string;
    errorLog: string | null;
    agentId: string | null;
}

export default function AgentClient({
    license,
    agents,
    recentTasks = [],
}: {
    license: LicenseRow | null;
    agents: AgentRow[];
    recentTasks?: RecentTask[];
}) {
    const router = useRouter();
    // Phase 29 — 30초마다 자동 갱신 (탭이 보일 때만)
    useEffect(() => {
        const tick = () => { if (!document.hidden) router.refresh(); };
        const id = setInterval(tick, 30_000);
        return () => clearInterval(id);
    }, [router]);

    const isOnline = (lastSeenAtIso: string) => dayjs().diff(dayjs(lastSeenAtIso), 'minute') < 5;
    const fromNow = (iso: string) => {
        const diff = dayjs().diff(dayjs(iso), 'second');
        if (diff < 60) return `${diff}초 전`;
        if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
        return `${Math.floor(diff / 86400)}일 전`;
    };

    return (
        <Stack gap="xl">
            <div>
                <Title order={2}>에이전트 관리</Title>
                <Text size="sm" c="dimmed">자동 포스팅을 수행하는 데스크톱 에이전트를 관리하고 다운로드합니다.</Text>
            </div>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
                {/* 라이선스 섹션 */}
                <Paper withBorder p="xl" radius="md">
                    <Stack gap="md">
                        <Title order={4}>내 라이선스 정보</Title>
                        <Paper bg="gray.0" p="md" radius="sm">
                            <Group justify="space-between">
                                <div>
                                    <Text size="xs" fw={700} c="dimmed" mb={4}>라이선스 키</Text>
                                    <Code style={{ fontSize: rem(16) }}>{license?.key}</Code>
                                </div>
                                <CopyButton value={license?.key || ''}>
                                    {({ copied, copy }) => (
                                        <ActionIcon variant="light" color={copied ? 'teal' : 'blue'} onClick={copy}>
                                            {copied ? <IconCheck size="1.2rem" /> : <IconCopy size="1.2rem" />}
                                        </ActionIcon>
                                    )}
                                </CopyButton>
                            </Group>
                        </Paper>
                        <Group justify="space-between">
                            <Badge variant="light" color="blue">{license?.plan}</Badge>
                            <Text size="xs" c="dimmed">
                                유효기간: {license?.validUntil ? dayjs(license.validUntil).format('YYYY-MM-DD') : '무제한'}
                            </Text>
                        </Group>
                    </Stack>
                </Paper>

                {/* 다운로드 섹션 */}
                <Paper withBorder p="xl" radius="md" bg="blue.0">
                    <Stack gap="md" h="100%" justify="center">
                        <Title order={4} ta="center">에이전트 다운로드</Title>
                        <Text size="sm" ta="center">Windows 에이전트를 설치하고 위 키를 입력하세요.</Text>
                        <Button
                            size="lg"
                            leftSection={<IconDownload size="1.2rem" />}
                            component="a"
                            href="https://github.com/amazing-makers/marketingbot-agent/releases/latest/download/Marketingbot-Agent-Setup.exe"
                        >
                            Windows용 다운로드
                        </Button>
                        <Text size="xs" c="dimmed" ta="center">현재 Windows 10/11만 지원합니다.</Text>
                    </Stack>
                </Paper>
            </SimpleGrid>

            <Paper withBorder p="md" radius="md">
                <Title order={4} mb="md">연결된 에이전트 목록</Title>
                {agents.length === 0 ? (
                    <Stack align="center" py="xl">
                        <IconDeviceDesktop size={48} color="var(--mantine-color-gray-4)" />
                        <Text c="dimmed">등록된 에이전트가 없습니다. 설치 후 라이선스를 활성화해주세요.</Text>
                    </Stack>
                ) : (
                    <Table.ScrollContainer minWidth={780}>
                    <Table verticalSpacing="md">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>기기명</Table.Th>
                                <Table.Th>상태</Table.Th>
                                <Table.Th>오늘 처리</Table.Th>
                                <Table.Th>실행 중</Table.Th>
                                <Table.Th>버전</Table.Th>
                                <Table.Th>마지막 통신</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {agents.map((agent) => {
                                const online = isOnline(agent.lastSeenAt);
                                return (
                                <Table.Tr key={agent.id}>
                                    <Table.Td>
                                        <Group gap="sm">
                                            <IconDeviceDesktop size={16} />
                                            <Text size="sm" fw={500}>{agent.name || agent.machineId}</Text>
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>
                                        {online ? (
                                            <Badge variant="dot" color="green">온라인</Badge>
                                        ) : (
                                            <Badge variant="dot" color="gray">오프라인</Badge>
                                        )}
                                    </Table.Td>
                                    <Table.Td>
                                        <Group gap={6}>
                                            <Badge size="sm" variant="light" color="green">✓ {agent.todaySuccess}</Badge>
                                            {agent.todayFailed > 0 && (
                                                <Badge size="sm" variant="light" color="red">✗ {agent.todayFailed}</Badge>
                                            )}
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>
                                        {agent.running > 0 ? (
                                            <Badge size="sm" color="blue" variant="filled">⚡ {agent.running}</Badge>
                                        ) : (
                                            <Text size="xs" c="dimmed">—</Text>
                                        )}
                                    </Table.Td>
                                    <Table.Td>
                                        <Code>v{agent.version}</Code>
                                    </Table.Td>
                                    <Table.Td>
                                        <Stack gap={0}>
                                            <Text size="xs" fw={online ? 600 : 400} c={online ? 'green.7' : 'dimmed'}>{fromNow(agent.lastSeenAt)}</Text>
                                            <Text size="10px" c="dimmed">{dayjs(agent.lastSeenAt).format('MM-DD HH:mm:ss')}</Text>
                                        </Stack>
                                    </Table.Td>
                                </Table.Tr>
                                );
                            })}
                        </Table.Tbody>
                    </Table>
                    </Table.ScrollContainer>
                )}
            </Paper>

            {/* Phase 30 — 최근 task 활동 로그 */}
            {recentTasks.length > 0 && (
                <Paper withBorder p="md" radius="md">
                    <Group justify="space-between" mb="md">
                        <Group gap="xs">
                            <IconActivity size={18} />
                            <Title order={4}>최근 발행 활동</Title>
                        </Group>
                        <Text size="xs" c="dimmed">최근 20건 · 30초마다 자동 갱신</Text>
                    </Group>
                    <Stack gap="xs">
                        {recentTasks.map(t => {
                            const ts = t.executedAt || t.updatedAt;
                            const statusColor = t.status === 'SUCCESS' ? 'green' : t.status === 'FAILED' ? 'red' : 'blue';
                            const statusIcon = t.status === 'SUCCESS' ? '✓' : t.status === 'FAILED' ? '✗' : '⚡';
                            return (
                                <Paper
                                    key={t.id}
                                    p="sm"
                                    radius="sm"
                                    withBorder
                                    style={{
                                        borderLeft: `3px solid var(--mantine-color-${statusColor}-6)`,
                                    }}
                                >
                                    <Group justify="space-between" wrap="nowrap" gap="md">
                                        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                                            <Group gap={6} wrap="nowrap">
                                                <Badge size="xs" color={statusColor} variant="light">
                                                    {statusIcon} {t.status}
                                                </Badge>
                                                <Text size="xs" fw={600} truncate>{t.campaignName}</Text>
                                                <Badge size="xs" variant="outline" color="gray">{t.channelType}</Badge>
                                                <Text size="11px" c="dimmed" truncate>{t.accountName}</Text>
                                            </Group>
                                            <Text size="11px" c="dimmed" lineClamp={1}>
                                                {t.contentPreview}
                                            </Text>
                                            {t.errorLog && (
                                                <Group gap={4}>
                                                    <IconAlertCircle size={11} color="var(--mantine-color-red-6)" />
                                                    <Text size="10px" c="red.7" lineClamp={1}>{t.errorLog}</Text>
                                                </Group>
                                            )}
                                        </Stack>
                                        <Stack gap={0} style={{ minWidth: 80, textAlign: 'right' }}>
                                            <Group gap={3} justify="flex-end">
                                                <IconClock size={10} color="var(--mantine-color-dimmed)" />
                                                <Text size="11px" c="dimmed">{fromNow(ts)}</Text>
                                            </Group>
                                            <Text size="10px" c="dimmed">{dayjs(ts).format('HH:mm:ss')}</Text>
                                        </Stack>
                                    </Group>
                                </Paper>
                            );
                        })}
                    </Stack>
                </Paper>
            )}
        </Stack>
    );
}
