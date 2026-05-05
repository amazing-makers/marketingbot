'use client';

import {
    Stack, Group, Text, Paper, Badge, Box, Title, Button, ActionIcon,
    Tooltip, Loader, Center, ScrollArea, SimpleGrid
} from '@mantine/core';
import {
    IconChevronLeft, IconChevronRight, IconPlus, IconCalendarMonth,
    IconList
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { notifications } from '@mantine/notifications';
import { listCalendarEntries, rescheduleTask } from '@/app/actions/campaignActions';

dayjs.locale('ko');

// 채널 type → 색상
const CHANNEL_COLORS: Record<string, string> = {
    INSTAGRAM: 'pink',
    FACEBOOK: 'blue',
    THREADS: 'dark',
    X: 'gray',
    YOUTUBE: 'red',
    TIKTOK: 'dark',
    NAVER_BLOG: 'green',
    NAVER_CAFE: 'green',
    KAKAO: 'yellow',
    DISCORD: 'indigo',
    TELEGRAM: 'cyan',
    LINKEDIN: 'blue',
    WORDPRESS: 'gray',
    PINTEREST: 'red',
    LINE: 'green',
    WHATSAPP: 'green',
    EMAIL: 'gray',
    SMS: 'gray',
};

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'orange',
    RUNNING: 'blue',
    SUCCESS: 'teal',
    FAILED: 'red',
    CANCELLED: 'gray',
};

interface Entry {
    taskId: string;
    campaignId: string;
    campaignName: string;
    campaignStatus: string;
    channelType: string;
    accountName: string;
    region: string | null;
    status: string;
    scheduledAt: string;
    seriesId?: string | null;
    seriesName?: string | null;
    seriesMode?: string | null;
}

export default function CalendarClient() {
    const [cursor, setCursor] = useState(() => dayjs().startOf('month'));
    const [byDay, setByDay] = useState<Record<string, Entry[]>>({});
    const [loading, setLoading] = useState(true);
    const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
    const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);

    /**
     * 드래그앤드롭으로 task 재예약 — 시간(HH:mm)은 유지, 날짜만 이동.
     * PENDING 상태가 아닌 task / 시리즈 task / 과거 날짜 드롭은 차단.
     */
    const handleDrop = async (taskId: string, fromKey: string, toKey: string) => {
        setDraggingTaskId(null);
        setDropTargetKey(null);
        if (fromKey === toKey) return;

        // 낙관적 UI: 즉시 화면에서 옮김
        const prevByDay = byDay;
        const fromEntries = byDay[fromKey] || [];
        const moving = fromEntries.find(e => e.taskId === taskId);
        if (!moving) return;

        const newScheduledAt = dayjs(moving.scheduledAt)
            .year(dayjs(toKey).year())
            .month(dayjs(toKey).month())
            .date(dayjs(toKey).date())
            .toISOString();

        const optimistic = { ...byDay };
        optimistic[fromKey] = fromEntries.filter(e => e.taskId !== taskId);
        optimistic[toKey] = [...(byDay[toKey] || []), { ...moving, scheduledAt: newScheduledAt }]
            .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
        setByDay(optimistic);

        const r = await rescheduleTask({ taskId, newDate: toKey });
        if (!r.ok) {
            // 롤백
            setByDay(prevByDay);
            notifications.show({ color: 'orange', title: '재예약 실패', message: r.error || '실패' });
        } else {
            notifications.show({
                color: 'teal',
                title: '✅ 재예약됨',
                message: `${dayjs(moving.scheduledAt).format('M월 D일')} → ${dayjs(toKey).format('M월 D일')}`,
                autoClose: 3000,
            });
        }
    };

    // 월의 캘린더 그리드 — 6주 × 7일 = 42칸 (이전 월 끝 ~ 다음 월 시작 일부 포함)
    const gridStart = useMemo(() => cursor.startOf('month').startOf('week'), [cursor]);
    const gridEnd = useMemo(() => gridStart.add(41, 'day').endOf('day'), [gridStart]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        listCalendarEntries({ from: gridStart.toDate(), to: gridEnd.toDate() })
            .then((data) => { if (!cancelled) setByDay(data); })
            .catch(() => { if (!cancelled) setByDay({}); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [gridStart, gridEnd]);

    const days = useMemo(() => {
        const arr = [] as dayjs.Dayjs[];
        for (let i = 0; i < 42; i++) arr.push(gridStart.add(i, 'day'));
        return arr;
    }, [gridStart]);

    const today = dayjs();
    const totalEntries = Object.values(byDay).reduce((s, e) => s + e.length, 0);

    return (
        <Stack gap="md">
            {/* 헤더 */}
            <Group justify="space-between" wrap="nowrap">
                <Group gap="xs">
                    <Title order={2}>📅 콘텐츠 캘린더</Title>
                    <Badge size="sm" color="brand" variant="light">{totalEntries}건 예약</Badge>
                </Group>
                <Group gap="xs">
                    <Button
                        component={Link}
                        href="/dashboard/campaigns"
                        variant="subtle"
                        leftSection={<IconList size={14} />}
                        size="xs"
                    >
                        리스트 뷰
                    </Button>
                    <Button
                        component={Link}
                        href="/dashboard/campaigns/new"
                        leftSection={<IconPlus size={14} />}
                        size="xs"
                    >
                        새 캠페인
                    </Button>
                </Group>
            </Group>

            {/* 월 네비 */}
            <Paper withBorder p="md" radius="md">
                <Group justify="space-between">
                    <Group gap="sm">
                        <ActionIcon variant="light" onClick={() => setCursor(cursor.subtract(1, 'month'))}>
                            <IconChevronLeft size={16} />
                        </ActionIcon>
                        <Text fw={800} size="lg" style={{ minWidth: 140, textAlign: 'center' }}>
                            {cursor.format('YYYY년 M월')}
                        </Text>
                        <ActionIcon variant="light" onClick={() => setCursor(cursor.add(1, 'month'))}>
                            <IconChevronRight size={16} />
                        </ActionIcon>
                    </Group>
                    <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconCalendarMonth size={14} />}
                        onClick={() => setCursor(dayjs().startOf('month'))}
                        disabled={cursor.isSame(dayjs().startOf('month'), 'month')}
                    >
                        오늘로
                    </Button>
                </Group>
            </Paper>

            {/* 캘린더 그리드 */}
            <Paper withBorder p={0} radius="md" style={{ overflow: 'hidden', position: 'relative' }}>
                {loading && (
                    <Center style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', zIndex: 10 }}>
                        <Loader size="sm" />
                    </Center>
                )}
                {/* 요일 헤더 */}
                <SimpleGrid cols={7} spacing={0} style={{ borderBottom: '1px solid #eee' }}>
                    {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                        <Box key={d} p="xs" ta="center" style={{
                            fontSize: 12, fontWeight: 700,
                            color: i === 0 ? 'var(--mantine-color-red-7)' : i === 6 ? 'var(--mantine-color-blue-7)' : '#666',
                            background: '#fafafa',
                        }}>{d}</Box>
                    ))}
                </SimpleGrid>
                {/* 날짜 셀 */}
                <SimpleGrid cols={7} spacing={0}>
                    {days.map((d) => {
                        const key = d.format('YYYY-MM-DD');
                        const entries = byDay[key] || [];
                        const isCurrentMonth = d.month() === cursor.month();
                        const isToday = d.isSame(today, 'day');
                        const isWeekend = d.day() === 0 || d.day() === 6;

                        const isDropTarget = dropTargetKey === key && !!draggingTaskId;

                        return (
                            <Box
                                key={key}
                                onDragOver={(e) => {
                                    if (!draggingTaskId) return;
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    if (dropTargetKey !== key) setDropTargetKey(key);
                                }}
                                onDragLeave={() => {
                                    if (dropTargetKey === key) setDropTargetKey(null);
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const taskId = e.dataTransfer.getData('text/plain');
                                    const fromKey = e.dataTransfer.getData('text/from-key');
                                    if (taskId && fromKey) {
                                        handleDrop(taskId, fromKey, key);
                                    }
                                }}
                                style={{
                                    minHeight: 110,
                                    padding: 6,
                                    borderRight: '1px solid #f1f3f5',
                                    borderBottom: '1px solid #f1f3f5',
                                    background: isDropTarget
                                        ? 'var(--mantine-color-violet-1)'
                                        : isToday
                                            ? 'var(--mantine-color-brand-light, #fff7e6)'
                                            : (isCurrentMonth ? 'white' : '#fafafa'),
                                    opacity: isCurrentMonth ? 1 : 0.5,
                                    position: 'relative',
                                    transition: 'background 0.15s',
                                    outline: isDropTarget ? '2px dashed var(--mantine-color-violet-5)' : undefined,
                                    outlineOffset: -2,
                                }}
                            >
                                {/* 날짜 + (있으면) "+N" 새 캠페인 단축 */}
                                <Group justify="space-between" mb={4}>
                                    <Text
                                        size="xs"
                                        fw={isToday ? 800 : 600}
                                        c={d.day() === 0 ? 'red.7' : d.day() === 6 ? 'blue.7' : 'dark'}
                                        style={isToday ? { background: 'var(--mantine-color-brand-filled, #1D1D1B)', color: 'white', borderRadius: 6, padding: '0 6px', minWidth: 22, textAlign: 'center' } : undefined}
                                    >
                                        {d.date()}
                                    </Text>
                                    {isCurrentMonth && (
                                        <Tooltip label={`${d.format('M월 D일')} 캠페인 작성`} withArrow>
                                            <ActionIcon
                                                size="xs"
                                                variant="subtle"
                                                color="gray"
                                                component={Link}
                                                href={`/dashboard/campaigns/new?date=${key}`}
                                                style={{ opacity: 0.5 }}
                                            >
                                                <IconPlus size={10} />
                                            </ActionIcon>
                                        </Tooltip>
                                    )}
                                </Group>
                                {/* 발행 entries — 최대 3개 표시, 더 있으면 +N */}
                                <Stack gap={3}>
                                    {entries.slice(0, 3).map((e) => {
                                        const color = CHANNEL_COLORS[e.channelType] || 'gray';
                                        const time = dayjs(e.scheduledAt).format('HH:mm');
                                        const isSeries = !!e.seriesId;
                                        const isDraggable = !isSeries && e.status === 'PENDING';
                                        const isDragging = draggingTaskId === e.taskId;
                                        const tooltipLabel = isSeries
                                            ? `${time} · ${e.channelType} · 🤖 시리즈 "${e.seriesName}"`
                                            : isDraggable
                                                ? `${time} · ${e.channelType} (${e.accountName}) · ${e.campaignName}\n💡 드래그해서 다른 날짜로 옮기기 가능`
                                                : `${time} · ${e.channelType} (${e.accountName}) · ${e.campaignName}`;
                                        return (
                                            <Tooltip
                                                key={e.taskId}
                                                label={tooltipLabel}
                                                withArrow
                                                position="top"
                                                multiline
                                            >
                                                <Paper
                                                    component={Link}
                                                    href={isSeries
                                                        ? `/dashboard/campaigns/series/${e.seriesId}`
                                                        : `/dashboard/campaigns/${e.campaignId}`
                                                    }
                                                    draggable={isDraggable}
                                                    onDragStart={(ev: any) => {
                                                        if (!isDraggable) return;
                                                        ev.dataTransfer.setData('text/plain', e.taskId);
                                                        ev.dataTransfer.setData('text/from-key', key);
                                                        ev.dataTransfer.effectAllowed = 'move';
                                                        setDraggingTaskId(e.taskId);
                                                    }}
                                                    onDragEnd={() => {
                                                        setDraggingTaskId(null);
                                                        setDropTargetKey(null);
                                                    }}
                                                    radius={4}
                                                    p={3}
                                                    style={{
                                                        borderLeft: `3px solid var(--mantine-color-${color}-6)`,
                                                        background: isSeries
                                                            ? 'var(--mantine-color-violet-0)'
                                                            : `var(--mantine-color-${color}-0)`,
                                                        textDecoration: 'none',
                                                        cursor: isDraggable ? 'grab' : 'pointer',
                                                        opacity: isDragging ? 0.4 : (e.status === 'SUCCESS' ? 0.6 : 1),
                                                        transition: 'opacity 0.15s',
                                                    }}
                                                >
                                                    <Group gap={4} wrap="nowrap">
                                                        <Text size="9px" fw={700} c={`${color}.7`} style={{ minWidth: 28 }}>
                                                            {time}
                                                        </Text>
                                                        {isSeries && (
                                                            <Text size="9px" style={{ lineHeight: 1 }}>🤖</Text>
                                                        )}
                                                        <Text size="10px" c="dark" lineClamp={1} style={{ flex: 1 }}>
                                                            {isSeries ? e.seriesName : e.campaignName}
                                                        </Text>
                                                        {e.status !== 'PENDING' && (
                                                            <Box style={{
                                                                width: 6, height: 6, borderRadius: 3,
                                                                background: `var(--mantine-color-${STATUS_COLORS[e.status] || 'gray'}-6)`,
                                                            }} />
                                                        )}
                                                    </Group>
                                                </Paper>
                                            </Tooltip>
                                        );
                                    })}
                                    {entries.length > 3 && (
                                        <Text size="9px" c="dimmed" fw={600} ta="center">
                                            +{entries.length - 3}건 더
                                        </Text>
                                    )}
                                </Stack>
                            </Box>
                        );
                    })}
                </SimpleGrid>
            </Paper>

            {/* 범례 */}
            <Paper withBorder p="sm" radius="md" bg="gray.0">
                <Group gap="md">
                    <Text size="xs" fw={700} c="dimmed">범례:</Text>
                    {[
                        { label: '예약', color: 'orange' },
                        { label: '진행중', color: 'blue' },
                        { label: '성공', color: 'teal' },
                        { label: '실패', color: 'red' },
                    ].map(s => (
                        <Group key={s.label} gap={4}>
                            <Box style={{ width: 8, height: 8, borderRadius: 4, background: `var(--mantine-color-${s.color}-6)` }} />
                            <Text size="xs" c="dimmed">{s.label}</Text>
                        </Group>
                    ))}
                    <Group gap={4}>
                        <Text size="xs">🤖</Text>
                        <Text size="xs" c="dimmed">시리즈</Text>
                    </Group>
                    <Box style={{ flex: 1 }} />
                    <Text size="xs" c="dimmed">💡 예약(주황) 캠페인은 다른 날짜로 드래그해서 옮길 수 있어요 · "+" → 새 캠페인</Text>
                </Group>
            </Paper>
        </Stack>
    );
}
