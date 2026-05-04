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
    POOL_VARY: { label: '사진풀 + AI 캡션 변형', emoji: '🎨', color: 'pink' },
    AI_FRESH: { label: 'AI 매번 신규 (이미지+캡션)', emoji: '✨', color: 'violet' },
    POOL_SIMILAR: { label: '사진풀, 캡션 비슷', emoji: '🔄', color: 'blue' },
    PARAPHRASE: { label: '본문 약간씩 변형', emoji: '📝', color: 'teal' },
};

const SCHEDULE_LABELS: Record<string, string> = {
    INTERVAL: '시간 간격',
    DAILY: '매일 정해진 시간',
    WEEKLY: '주간 패턴',
    FIXED_COUNT: 'N개 균등 분배',
};

const STATUS_INFO: Record<string, { label: string; color: string }> = {
    DRAFT: { label: '임시저장', color: 'gray' },
    RUNNING: { label: '진행 중', color: 'green' },
    PAUSED: { label: '일시정지', color: 'orange' },
    COMPLETED: { label: '완료', color: 'blue' },
    FAILED: { label: '실패', color: 'red' },
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
                    <Title order={2}>🤖 자동화 시리즈</Title>
                    <Text size="sm" c="dimmed">한 번 설정 → 정해진 일정에 따라 자동 발행 (사진풀·AI 신규·paraphrase)</Text>
                </Stack>
                <Button component={Link} href="/dashboard/campaigns/series/new" leftSection={<IconPlus size={16} />}>
                    새 시리즈
                </Button>
            </Group>

            {items.length === 0 ? (
                <Card withBorder p="xl" radius="md" bg="var(--mantine-color-default-hover)">
                    <Stack gap="md" align="center" py="xl">
                        <div style={{ fontSize: 48 }}>⚙️</div>
                        <Stack gap={4} align="center">
                            <Text fw={800} size="lg">자동화 시리즈가 아직 없어요</Text>
                            <Text size="sm" c="dimmed" ta="center" maw={500}>
                                <strong>한 번 설정</strong>해두면 며칠~몇주 동안 매일·매주 정해진 시간에 자동으로 캠페인 생성·발행됩니다.<br />
                                예: "사진 30장 풀 + 매일 9시·19시 발행 = 한 달치 콘텐츠 자동 운영"
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
                            첫 시리즈 만들기
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
                                                    시작
                                                </Menu.Item>
                                            ) : null}
                                            {s.status === 'RUNNING' && (
                                                <>
                                                    <Menu.Item leftSection={<IconPlayerPause size={14} />} onClick={() => handlePause(s.id)} disabled={isBusy}>
                                                        일시정지
                                                    </Menu.Item>
                                                    <Menu.Item leftSection={<IconRefresh size={14} />} onClick={() => handleRunNow(s.id)} disabled={isBusy}>
                                                        지금 1회 실행
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
