'use client';

import {
    Stack, Group, Text, Paper, Badge, Box, Title, Button, ActionIcon,
    Tooltip, Loader, Center, ScrollArea, SimpleGrid, Modal, Anchor
} from '@mantine/core';
import {
    IconChevronLeft, IconChevronRight, IconPlus, IconCalendarMonth,
    IconList, IconFilter
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
    // Phase 37 — 상태 필터 + 날짜 상세 모달
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [dayDetailKey, setDayDetailKey] = useState<string | null>(null);

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
    // Phase 37 — 상태 필터 적용
    const filteredByDay = useMemo(() => {
        if (!statusFilter) return byDay;
        const out: Record<string, Entry[]> = {};
        for (const [k, list] of Object.entries(byDay)) {
            const filtered = list.filter(e => e.status === statusFilter);
            if (filtered.length > 0) out[k] = filtered;
        }
        return out;
    }, [byDay, statusFilter]);
    const totalEntries = Object.values(filteredByDay).reduce((s, e) => s + e.length, 0);

    const dayDetailEntries = dayDetailKey ? (byDay[dayDetailKey] || []) : [];

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

            {/* Phase 37 — 상태 필터 칩 */}
            <Paper withBorder p="sm" radius="md">
                <Group gap="xs" wrap="wrap">
                    <Group gap={4}>
                        <IconFilter size={14} color="var(--mantine-color-dimmed)" />
                        <Text size="xs" c="dimmed" fw={600}>상태:</Text>
                    </Group>
                    <Badge
                        size="md"
                        variant={!statusFilter ? 'filled' : 'light'}
                        color="gray"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setStatusFilter(null)}
                    >
                        전체
                    </Badge>
                    {[
                        { value: 'PENDING', label: '예약', color: 'orange' },
                        { value: 'RUNNING', label: '진행중', color: 'blue' },
                        { value: 'SUCCESS', label: '성공', color: 'teal' },
                        { value: 'FAILED', label: '실패', color: 'red' },
                        { value: 'CANCELLED', label: '취소됨', color: 'gray' },
                    ].map(s => (
                        <Badge
                            key={s.value}
                            size="md"
                            variant={statusFilter === s.value ? 'filled' : 'light'}
                            color={s.color}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setStatusFilter(statusFilter === s.value ? null : s.value)}
                        >
                            {s.label}
                        </Badge>
                    ))}
                    {statusFilter && (
                        <Text size="xs" c="dimmed">{totalEntries}건 표시</Text>
                    )}
                </Group>
            </Paper>

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

            {/* Phase 40 — 모바일: 다음 14일 리스트 뷰 (그리드 7×6 은 모바일에서 좁아서 못 씀) */}
            <Box hiddenFrom="sm">
                <Paper withBorder p={0} radius="md" style={{ position: 'relative', overflow: 'hidden' }}>
                    {loading && (
                        <Center style={{ position: 'absolute', inset: 0, background: 'var(--mantine-color-body)', opacity: 0.7, zIndex: 10 }}>
                            <Loader size="sm" />
                        </Center>
                    )}
                    <Stack gap={0}>
                        {Array.from({ length: 14 }).map((_, i) => {
                            const d = dayjs().add(i, 'day');
                            const key = d.format('YYYY-MM-DD');
                            const entries = filteredByDay[key] || [];
                            const isToday = i === 0;
                            const isWeekend = d.day() === 0 || d.day() === 6;
                            return (
                                <Box
                                    key={key}
                                    style={{
                                        padding: '10px 12px',
                                        borderBottom: '1px solid var(--mantine-color-default-border)',
                                        background: isToday ? 'var(--mantine-color-violet-0)' : undefined,
                                    }}
                                >
                                    <Group justify="space-between" mb={entries.length > 0 ? 6 : 0}>
                                        <Group gap={6}>
                                            <Text fw={isToday ? 800 : 700} size="sm" c={d.day() === 0 ? 'red.7' : d.day() === 6 ? 'blue.7' : undefined}>
                                                {d.format('M월 D일')} ({['일', '월', '화', '수', '목', '금', '토'][d.day()]})
                                            </Text>
                                            {isToday && <Badge size="xs" color="violet" variant="filled">오늘</Badge>}
                                        </Group>
                                        <Group gap={4}>
                                            {entries.length > 0 && <Badge size="xs" variant="light">{entries.length}건</Badge>}
                                            <ActionIcon
                                                size="xs"
                                                variant="subtle"
                                                color="gray"
                                                component={Link}
                                                href={`/dashboard/campaigns/new?date=${key}`}
                                                aria-label="이 날 작성"
                                            >
                                                <IconPlus size={11} />
                                            </ActionIcon>
                                        </Group>
                                    </Group>
                                    {entries.length === 0 ? (
                                        <Text size="11px" c="dimmed">예약 없음</Text>
                                    ) : (
                                        <Stack gap={3}>
                                            {entries.slice(0, 5).map(e => {
                                                const color = CHANNEL_COLORS[e.channelType] || 'gray';
                                                const time = dayjs(e.scheduledAt).format('HH:mm');
                                                const isSeries = !!e.seriesId;
                                                return (
                                                    <Paper
                                                        key={e.taskId}
                                                        component={Link}
                                                        href={isSeries ? `/dashboard/campaigns/series/${e.seriesId}` : `/dashboard/campaigns/${e.campaignId}`}
                                                        radius={4}
                                                        p={4}
                                                        style={{
                                                            borderLeft: `3px solid var(--mantine-color-${color}-6)`,
                                                            background: 'var(--mantine-color-default-hover)',
                                                            textDecoration: 'none',
                                                        }}
                                                    >
                                                        <Group gap={6} wrap="nowrap">
                                                            <Text size="11px" fw={700} c={`${color}.7`}>{time}</Text>
                                                            {isSeries && <Text size="11px">🤖</Text>}
                                                            <Text size="11px" c="dark" style={{ flex: 1 }} truncate>
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
                                                );
                                            })}
                                            {entries.length > 5 && (
                                                <Anchor
                                                    component="button"
                                                    type="button"
                                                    onClick={(ev) => { ev.preventDefault(); setDayDetailKey(key); }}
                                                    size="11px"
                                                    fw={600}
                                                    c="violet"
                                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                                                >
                                                    +{entries.length - 5}건 더 →
                                                </Anchor>
                                            )}
                                        </Stack>
                                    )}
                                </Box>
                            );
                        })}
                    </Stack>
                    <Box p="sm" style={{ background: 'var(--mantine-color-default-hover)' }}>
                        <Text size="xs" c="dimmed" ta="center">
                            모바일: 오늘부터 14일 리스트 뷰 · 데스크톱은 월간 그리드 뷰
                        </Text>
                    </Box>
                </Paper>
            </Box>

            {/* 데스크톱: 캘린더 그리드 */}
            <Box visibleFrom="sm">
            <Paper withBorder p={0} radius="md" style={{ overflow: 'hidden', position: 'relative' }}>
                {loading && (
                    <Center style={{ position: 'absolute', inset: 0, background: 'var(--mantine-color-body)', opacity: 0.7, zIndex: 10 }}>
                        <Loader size="sm" />
                    </Center>
                )}
                {/* 요일 헤더 */}
                <SimpleGrid cols={7} spacing={0} style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                    {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                        <Box key={d} p="xs" ta="center" style={{
                            fontSize: 12, fontWeight: 700,
                            color: i === 0 ? 'var(--mantine-color-red-7)' : i === 6 ? 'var(--mantine-color-blue-7)' : '#666',
                            background: 'var(--mantine-color-default-hover)',
                        }}>{d}</Box>
                    ))}
                </SimpleGrid>
                {/* 날짜 셀 */}
                <SimpleGrid cols={7} spacing={0}>
                    {days.map((d) => {
                        const key = d.format('YYYY-MM-DD');
                        const entries = filteredByDay[key] || [];
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
                                    borderRight: '1px solid var(--mantine-color-default-border)',
                                    borderBottom: '1px solid var(--mantine-color-default-border)',
                                    background: isDropTarget
                                        ? 'var(--mantine-color-violet-1)'
                                        : isToday
                                            ? 'var(--mantine-color-violet-0)'
                                            : (isCurrentMonth ? 'var(--mantine-color-body)' : 'var(--mantine-color-default-hover)'),
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
                                        <Anchor
                                            component="button"
                                            type="button"
                                            onClick={(ev) => {
                                                ev.preventDefault();
                                                ev.stopPropagation();
                                                setDayDetailKey(key);
                                            }}
                                            size="9px"
                                            c="violet"
                                            ta="center"
                                            style={{ display: 'block', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer' }}
                                        >
                                            +{entries.length - 3}건 더 →
                                        </Anchor>
                                    )}
                                </Stack>
                            </Box>
                        );
                    })}
                </SimpleGrid>
            </Paper>
            </Box>

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

            {/* Phase 37 — 날짜 상세 모달 */}
            <Modal
                opened={!!dayDetailKey}
                onClose={() => setDayDetailKey(null)}
                title={dayDetailKey ? `📅 ${dayjs(dayDetailKey).format('YYYY년 M월 D일 (ddd)')}` : ''}
                size="lg"
            >
                <Stack gap="xs">
                    <Group justify="space-between">
                        <Text size="sm" c="dimmed">{dayDetailEntries.length}건 예약·발행</Text>
                        {dayDetailKey && (
                            <Button
                                size="compact-xs"
                                variant="light"
                                component={Link}
                                href={`/dashboard/campaigns/new?date=${dayDetailKey}`}
                                leftSection={<IconPlus size={12} />}
                            >
                                이 날 캠페인 작성
                            </Button>
                        )}
                    </Group>
                    {dayDetailEntries.length === 0 ? (
                        <Text size="sm" c="dimmed" ta="center" py="md">예약 없음</Text>
                    ) : (
                        <Stack gap="xs">
                            {dayDetailEntries.map(e => {
                                const color = CHANNEL_COLORS[e.channelType] || 'gray';
                                const time = dayjs(e.scheduledAt).format('HH:mm');
                                const isSeries = !!e.seriesId;
                                return (
                                    <Paper
                                        key={e.taskId}
                                        component={Link}
                                        href={isSeries
                                            ? `/dashboard/campaigns/series/${e.seriesId}`
                                            : `/dashboard/campaigns/${e.campaignId}`}
                                        withBorder
                                        p="sm"
                                        radius="md"
                                        style={{
                                            borderLeft: `3px solid var(--mantine-color-${color}-6)`,
                                            textDecoration: 'none',
                                        }}
                                    >
                                        <Group justify="space-between" wrap="nowrap">
                                            <Stack gap={0}>
                                                <Group gap={6}>
                                                    <Text size="sm" fw={700}>{time}</Text>
                                                    <Badge size="xs" color={color} variant="light">
                                                        {e.channelType}
                                                    </Badge>
                                                    {isSeries && <Text size="xs">🤖</Text>}
                                                    <Badge size="xs" color={STATUS_COLORS[e.status] || 'gray'} variant="light">
                                                        {e.status}
                                                    </Badge>
                                                </Group>
                                                <Text size="sm">{isSeries ? e.seriesName : e.campaignName}</Text>
                                                <Text size="11px" c="dimmed">{e.accountName}</Text>
                                            </Stack>
                                        </Group>
                                    </Paper>
                                );
                            })}
                        </Stack>
                    )}
                </Stack>
            </Modal>
        </Stack>
    );
}
