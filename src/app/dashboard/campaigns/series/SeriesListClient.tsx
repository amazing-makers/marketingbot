'use client';

import {
    Stack, Group, Text, Title, Button, Card, Badge, Progress, Box,
    Menu, ActionIcon, Tooltip, SimpleGrid
} from '@mantine/core';
import {
    IconPlus, IconDotsVertical, IconPlayerPlay, IconPlayerPause,
    IconTrash, IconRefresh, IconClock, IconRocket, IconCalendarEvent
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import Link from 'next/link';
import { updateSeriesStatus, deleteSeries, processSeriesOnce } from '@/app/actions/seriesActions';
import dayjs from 'dayjs';

const MODE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
    POOL_VARY: { label: '내 사진 + 매번 다른 글', emoji: '🖼️', color: 'pink' },
    AI_FRESH: { label: '전부 AI가 새로 만들기', emoji: '✨', color: 'violet' },
    POOL_SIMILAR: { label: '내 사진 + 일관된 글', emoji: '🔁', color: 'blue' },
    PARAPHRASE: { label: '글만 매번 살짝씩 다르게', emoji: '📝', color: 'teal' },
};

const SCHEDULE_LABELS: Record<string, string> = {
    INTERVAL: '몇 시간마다 1번',
    DAILY: '매일 정해진 시간',
    WEEKLY: '특정 요일에만',
    FIXED_COUNT: '기간 안에 균등하게',
};

const STATUS_INFO: Record<string, { label: string; color: string }> = {
    DRAFT: { label: '저장만 됨', color: 'gray' },
    RUNNING: { label: '발행 중', color: 'green' },
    PAUSED: { label: '잠시 멈춤', color: 'orange' },
    COMPLETED: { label: '모두 완료', color: 'blue' },
    FAILED: { label: '오류 발생', color: 'red' },
};

interface Item {
    id: string; name: string; mode: string; scheduleType: string; status: string;
    totalPosts: number; completedPosts: number; failedPosts: number;
    startAt: string; endAt: string | null;
    nextRunAt: string | null; lastRunAt: string | null;
    lastError: string | null; channelCount: number; mediaPoolCount: number;
}

export default function SeriesListClient({ items: initial }: { items: Item[] }) {
    const [items, setItems] = useState(initial);
    const [busy, setBusy] = useState<string | null>(null);

    const action = async (id: string, fn: () => Promise<any>, refresh: (item: any) => void) => {
        setBusy(id);
        try {
            await fn();
            // 간단한 refresh — 페이지 새로고침 또는 부분 업데이트
            window.location.reload();
        } catch (e: any) {
            notifications.show({ title: '오류', message: e?.message || '실패', color: 'red' });
            setBusy(null);
        }
    };

    const handleStart = (id: string) => action(id, () => updateSeriesStatus(id, 'RUNNING'), () => {});
    const handlePause = (id: string) => action(id, () => updateSeriesStatus(id, 'PAUSED'), () => {});
    const handleRunNow = (id: string) => action(id, () => processSeriesOnce(id), () => {});
    const handleDelete = (id: string) => {
        if (!confirm('정말 삭제하시겠습니까? 이미 생성된 캠페인은 유지됩니다.')) return;
        action(id, () => deleteSeries(id), () => {});
    };

    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <Stack gap={0}>
                    <Title order={2}>🔁 예약 자동 발행</Title>
                    <Text size="sm" c="dimmed">한 번만 설정해두면, 정해진 시간마다 알아서 게시물을 만들어 올려줘요</Text>
                </Stack>
                <Button component={Link} href="/dashboard/campaigns/series/new" leftSection={<IconPlus size={16} />}>
                    새로 만들기
                </Button>
            </Group>

            {items.length === 0 ? (
                <Card withBorder p="xl" radius="md" bg="var(--mantine-color-default-hover)">
                    <Stack gap="md" align="center" py="xl">
                        <div style={{ fontSize: 48 }}>⏰</div>
                        <Stack gap={4} align="center">
                            <Text fw={800} size="lg">아직 만든 자동 발행이 없어요</Text>
                            <Text size="sm" c="dimmed" ta="center" maw={520}>
                                <strong>한 번만 설정</strong>해두면 며칠·몇 주 동안 정해진 시간마다 자동으로 게시물을 만들어 올려줘요.<br />
                                <strong>예시:</strong> "사진 30장 + 매일 오전 9시·저녁 7시 = 한 달치 게시물 자동 운영"
                            </Text>
                        </Stack>
                        <Button
                            component={Link}
                            href="/dashboard/campaigns/series/new"
                            leftSection={<IconRocket size={16} />}
                            color="violet"
                            variant="gradient"
                            gradient={{ from: 'violet', to: 'blue' }}
                        >
                            첫 자동 발행 만들기
                        </Button>
                    </Stack>
                </Card>
            ) : (
                <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
                    {items.map(s => {
                        const mode = MODE_LABELS[s.mode] || { label: s.mode, emoji: '📦', color: 'gray' };
                        const status = STATUS_INFO[s.status] || { label: s.status, color: 'gray' };
                        const progress = (s.completedPosts / s.totalPosts) * 100;
                        const isBusy = busy === s.id;
                        return (
                            <Card
                                key={s.id}
                                withBorder
                                radius="md"
                                p="md"
                                style={{
                                    borderLeft: `4px solid var(--mantine-color-${mode.color}-6)`,
                                    cursor: 'pointer',
                                }}
                                onClick={(e) => {
                                    // 메뉴 클릭은 router 막음
                                    if ((e.target as HTMLElement).closest('button, [role="menuitem"]')) return;
                                    window.location.href = `/dashboard/campaigns/series/${s.id}`;
                                }}
                            >
                                <Group justify="space-between" wrap="nowrap" mb="xs">
                                    <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                                        <Text fw={700} truncate>{s.name}</Text>
                                        <Group gap={6}>
                                            <Badge size="xs" color={mode.color} variant="light">
                                                {mode.emoji} {mode.label}
                                            </Badge>
                                            <Badge size="xs" color={status.color} variant={s.status === 'RUNNING' ? 'filled' : 'dot'}>
                                                {status.label}
                                            </Badge>
                                        </Group>
                                    </Stack>
                                    <Menu position="bottom-end" shadow="md" withinPortal>
                                        <Menu.Target>
                                            <ActionIcon variant="subtle" color="gray">
                                                <IconDotsVertical size={16} />
                                            </ActionIcon>
                                        </Menu.Target>
                                        <Menu.Dropdown>
                                            {s.status === 'DRAFT' || s.status === 'PAUSED' ? (
                                                <Menu.Item leftSection={<IconPlayerPlay size={14} />} onClick={() => handleStart(s.id)} disabled={isBusy}>
                                                    발행 시작하기
                                                </Menu.Item>
                                            ) : null}
                                            {s.status === 'RUNNING' && (
                                                <>
                                                    <Menu.Item leftSection={<IconPlayerPause size={14} />} onClick={() => handlePause(s.id)} disabled={isBusy}>
                                                        잠시 멈추기
                                                    </Menu.Item>
                                                    <Menu.Item leftSection={<IconRefresh size={14} />} onClick={() => handleRunNow(s.id)} disabled={isBusy}>
                                                        지금 한 번 발행
                                                    </Menu.Item>
                                                </>
                                            )}
                                            <Menu.Divider />
                                            <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={() => handleDelete(s.id)} disabled={isBusy}>
                                                삭제
                                            </Menu.Item>
                                        </Menu.Dropdown>
                                    </Menu>
                                </Group>

                                {/* progress */}
                                <Group justify="space-between" mb={4}>
                                    <Text size="xs" c="dimmed" fw={600}>
                                        {s.completedPosts} / {s.totalPosts} 완료
                                        {s.failedPosts > 0 && <Text span c="red.7" ml={6}>· {s.failedPosts}건 실패</Text>}
                                    </Text>
                                    <Text size="xs" fw={700} c={progress >= 100 ? 'blue.7' : 'gray.7'}>
                                        {Math.round(progress)}%
                                    </Text>
                                </Group>
                                <Progress value={progress} size="sm" radius="xl" color={mode.color} />

                                {/* 메타 */}
                                <Stack gap={4} mt="md">
                                    <Group gap={6}>
                                        <IconCalendarEvent size={12} color="var(--mantine-color-dimmed)" />
                                        <Text size="11px" c="dimmed">
                                            {SCHEDULE_LABELS[s.scheduleType] || s.scheduleType} · 채널 {s.channelCount}개
                                            {s.mediaPoolCount > 0 && ` · 사진풀 ${s.mediaPoolCount}장`}
                                        </Text>
                                    </Group>
                                    {s.nextRunAt && s.status === 'RUNNING' && (
                                        <Group gap={6}>
                                            <IconClock size={12} color="var(--mantine-color-green-6)" />
                                            <Text size="11px" c="green.7" fw={600}>
                                                다음 발행: {dayjs(s.nextRunAt).format('M.D HH:mm')}
                                            </Text>
                                        </Group>
                                    )}
                                    {s.lastError && (
                                        <Text size="11px" c="red.7" lineClamp={1}>⚠️ {s.lastError}</Text>
                                    )}
                                </Stack>
                            </Card>
                        );
                    })}
                </SimpleGrid>
            )}
        </Stack>
    );
}
