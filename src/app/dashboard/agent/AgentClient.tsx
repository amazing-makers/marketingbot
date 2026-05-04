'use client';

import {
    Title, Text, Stack, Paper, Group, Code, CopyButton, ActionIcon,
    Button, Table, Badge, rem, SimpleGrid
} from '@mantine/core';
import { IconCopy, IconCheck, IconDownload, IconDeviceDesktop } from '@tabler/icons-react';
import dayjs from 'dayjs';

interface AgentRow {
    id: string;
    name: string | null;
    machineId: string;
    version: string;
    lastSeenAt: string;
}

interface LicenseRow {
    key: string;
    plan: string;
    validUntil: string | null;
}

export default function AgentClient({ license, agents }: { license: LicenseRow | null; agents: AgentRow[] }) {
    const isOnline = (lastSeenAtIso: string) => dayjs().diff(dayjs(lastSeenAtIso), 'minute') < 5;

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
                    <Table verticalSpacing="md">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>기기명</Table.Th>
                                <Table.Th>상태</Table.Th>
                                <Table.Th>버전</Table.Th>
                                <Table.Th>마지막 통신</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {agents.map((agent) => (
                                <Table.Tr key={agent.id}>
                                    <Table.Td>
                                        <Group gap="sm">
                                            <IconDeviceDesktop size={16} />
                                            <Text size="sm" fw={500}>{agent.name || agent.machineId}</Text>
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>
                                        {isOnline(agent.lastSeenAt) ? (
                                            <Badge variant="dot" color="green">온라인</Badge>
                                        ) : (
                                            <Badge variant="dot" color="gray">오프라인</Badge>
                                        )}
                                    </Table.Td>
                                    <Table.Td>
                                        <Code>v{agent.version}</Code>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text size="xs" c="dimmed">{dayjs(agent.lastSeenAt).format('YYYY-MM-DD HH:mm:ss')}</Text>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                )}
            </Paper>
        </Stack>
    );
}
