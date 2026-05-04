'use client';

import { Table, Group, Text, Badge, Button, Stack, Title, Anchor, Card } from '@mantine/core';
import { IconPlus, IconCalendar, IconChevronRight, IconCalendarMonth } from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';

interface CampaignRow {
    id: string;
    name: string;
    status: string;
    scheduledAt?: string | null;
    createdAt: string;
    _count: { tasks: number };
}

export default function CampaignsListClient({ campaigns }: { campaigns: CampaignRow[] }) {
    const rows = campaigns.map((campaign) => (
        <Table.Tr key={campaign.id} style={{ cursor: 'pointer' }}>
            <Table.Td>
                <Anchor component={Link} href={`/dashboard/campaigns/${campaign.id}`} fw={500}>
                    {campaign.name}
                </Anchor>
            </Table.Td>
            <Table.Td>
                <Badge variant="light" color={campaign.status === 'SCHEDULED' ? 'blue' : 'green'}>
                    {campaign.status}
                </Badge>
            </Table.Td>
            <Table.Td>{campaign._count.tasks}곳</Table.Td>
            <Table.Td>
                <Group gap="xs">
                    <IconCalendar size={14} color="gray" />
                    <Text size="sm">{campaign.scheduledAt ? dayjs(campaign.scheduledAt).format('YYYY-MM-DD HH:mm') : '-'}</Text>
                </Group>
            </Table.Td>
            <Table.Td>
                <Text size="sm" c="dimmed">{dayjs(campaign.createdAt).format('YYYY-MM-DD')}</Text>
            </Table.Td>
            <Table.Td>
                <Anchor component={Link} href={`/dashboard/campaigns/${campaign.id}`}>
                    <IconChevronRight size={16} />
                </Anchor>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Stack>
            <Group justify="space-between">
                <Stack gap={0}>
                    <Title order={2}>📋 게시물 관리</Title>
                    <Text size="xs" c="dimmed">한 번 작성한 게시물 = 1개의 캠페인 (여러 채널 동시 발행 가능)</Text>
                </Stack>
                <Group gap="xs">
                    <Button component={Link} href="/dashboard/campaigns/calendar" variant="light" leftSection={<IconCalendarMonth size={16} />}>
                        캘린더로 보기
                    </Button>
                    <Button component={Link} href="/dashboard/campaigns/new" leftSection={<IconPlus size={16} />}>
                        새 게시물 작성
                    </Button>
                </Group>
            </Group>

            {campaigns.length === 0 ? (
                <Card withBorder p="xl" radius="md" bg="var(--mantine-color-default-hover)">
                    <Stack gap="md" align="center" py="xl">
                        <div style={{ fontSize: 48 }}>📝</div>
                        <div style={{ textAlign: 'center' }}>
                            <Text fw={800} size="lg">아직 만든 게시물이 없어요</Text>
                            <Text size="sm" c="dimmed" mt={4}>
                                AI 가 글을 자동으로 써주고, 14개 언어 자동 번역, 5개 SNS에 동시 발행 — 5분이면 시작!
                            </Text>
                        </div>
                        <Group gap="xs">
                            <Button component={Link} href="/dashboard/campaigns/new" leftSection={<IconPlus size={16} />}>
                                첫 게시물 만들기
                            </Button>
                            <Button component={Link} href="/dashboard/campaigns/templates" variant="light">
                                예시 템플릿 보기
                            </Button>
                        </Group>
                    </Stack>
                </Card>
            ) : (
                <Card withBorder radius="md" p={0}>
                    <Table verticalSpacing="md" highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>게시물 이름</Table.Th>
                                <Table.Th>상태</Table.Th>
                                <Table.Th>올리는 채널</Table.Th>
                                <Table.Th>올릴 시간</Table.Th>
                                <Table.Th>만든 날짜</Table.Th>
                                <Table.Th />
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>{rows}</Table.Tbody>
                    </Table>
                </Card>
            )}
        </Stack>
    );
}
