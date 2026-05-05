'use client';

import { Table, Group, Text, Badge, Button, Stack, Title, Anchor, Card, TextInput, Select, Box } from '@mantine/core';
import { IconPlus, IconCalendar, IconChevronRight, IconCalendarMonth, IconSearch } from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';

interface CampaignRow {
    id: string;
    name: string;
    status: string;
    scheduledAt?: string | null;
    createdAt: string;
    tags?: string[];
    _count: { tasks: number };
}

export default function CampaignsListClient({ campaigns }: { campaigns: CampaignRow[] }) {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [tagFilter, setTagFilter] = useState<string | null>(null);

    const allTags = useMemo(() => {
        const set = new Set<string>();
        for (const c of campaigns) (c.tags || []).forEach(t => set.add(t));
        return Array.from(set).sort();
    }, [campaigns]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return campaigns.filter(c => {
            if (statusFilter && c.status !== statusFilter) return false;
            if (tagFilter && !(c.tags || []).includes(tagFilter)) return false;
            if (q && !c.name.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [campaigns, query, statusFilter, tagFilter]);

    const rows = filtered.map((campaign) => (
        <Table.Tr key={campaign.id} style={{ cursor: 'pointer' }}>
            <Table.Td>
                <Anchor component={Link} href={`/dashboard/campaigns/${campaign.id}`} fw={500}>
                    {campaign.name}
                </Anchor>
                {(campaign.tags && campaign.tags.length > 0) && (
                    <Group gap={3} mt={2}>
                        {campaign.tags.slice(0, 3).map(t => (
                            <Badge key={t} size="xs" variant="light" color="grape">{t}</Badge>
                        ))}
                        {campaign.tags.length > 3 && <Text size="10px" c="dimmed">+{campaign.tags.length - 3}</Text>}
                    </Group>
                )}
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

            {/* Phase 25-27 — 검색 + 상태 + 태그 필터 */}
            {campaigns.length > 0 && (
                <Group gap="xs">
                    <TextInput
                        placeholder="이름 검색..."
                        leftSection={<IconSearch size={14} />}
                        value={query}
                        onChange={(e) => setQuery(e.currentTarget.value)}
                        style={{ flex: 1 }}
                    />
                    <Select
                        placeholder="모든 상태"
                        data={Array.from(new Set(campaigns.map(c => c.status))).sort().map(s => ({ value: s, label: s }))}
                        value={statusFilter}
                        onChange={setStatusFilter}
                        clearable
                        w={140}
                    />
                    {allTags.length > 0 && (
                        <Select
                            placeholder="🏷️ 태그"
                            data={allTags.map(t => ({ value: t, label: t }))}
                            value={tagFilter}
                            onChange={setTagFilter}
                            clearable
                            searchable
                            w={160}
                        />
                    )}
                    {(query || statusFilter || tagFilter) && (
                        <Text size="xs" c="dimmed">{filtered.length}/{campaigns.length}</Text>
                    )}
                </Group>
            )}

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
                <>
                    {/* 데스크톱: 테이블 (sm 이상) */}
                    <Box visibleFrom="sm">
                        <Card withBorder radius="md" p={0}>
                            <Table.ScrollContainer minWidth={720}>
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
                            </Table.ScrollContainer>
                        </Card>
                    </Box>
                    {/* 모바일: 카드 뷰 (xs/sm 미만) */}
                    <Box hiddenFrom="sm">
                        <Stack gap="sm">
                            {filtered.map(campaign => (
                                <Card
                                    key={campaign.id}
                                    component={Link}
                                    href={`/dashboard/campaigns/${campaign.id}`}
                                    withBorder
                                    radius="md"
                                    p="md"
                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                >
                                    <Group justify="space-between" wrap="nowrap" mb="xs">
                                        <Text fw={600} truncate style={{ flex: 1 }}>{campaign.name}</Text>
                                        <Badge variant="light" color={campaign.status === 'SCHEDULED' ? 'blue' : 'green'} size="sm">
                                            {campaign.status}
                                        </Badge>
                                    </Group>
                                    {campaign.tags && campaign.tags.length > 0 && (
                                        <Group gap={4} mb="xs">
                                            {campaign.tags.slice(0, 3).map(t => (
                                                <Badge key={t} size="xs" variant="light" color="grape">{t}</Badge>
                                            ))}
                                            {campaign.tags.length > 3 && <Text size="10px" c="dimmed">+{campaign.tags.length - 3}</Text>}
                                        </Group>
                                    )}
                                    <Group gap="md" wrap="wrap">
                                        <Group gap={4}>
                                            <IconCalendar size={12} color="var(--mantine-color-dimmed)" />
                                            <Text size="xs" c="dimmed">
                                                {campaign.scheduledAt ? dayjs(campaign.scheduledAt).format('M.D HH:mm') : '미정'}
                                            </Text>
                                        </Group>
                                        <Text size="xs" c="dimmed">채널 {campaign._count.tasks}개</Text>
                                        <Text size="xs" c="dimmed">{dayjs(campaign.createdAt).format('M.D')} 작성</Text>
                                    </Group>
                                </Card>
                            ))}
                        </Stack>
                    </Box>
                </>
            )}
        </Stack>
    );
}
