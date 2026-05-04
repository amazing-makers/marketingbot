'use client';

import {
    Container, Title, Text, Stack, Group, Card, Badge, Progress, Box,
    Button, SimpleGrid, Paper, Divider, ScrollArea, Tooltip, ActionIcon,
    Anchor, Image, RingProgress, Center, ThemeIcon
} from '@mantine/core';
import {
    IconPlayerPlay, IconPlayerPause, IconRefresh, IconClock,
    IconCheck, IconX, IconAlertCircle, IconArrowLeft,
    IconCalendarEvent, IconRocket, IconPhoto
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import {
    updateSeriesStatus, deleteSeries, processSeriesOnce, getSeriesDetail
} from '@/app/actions/seriesActions';

const MODE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
    POOL_VARY: { label: '내 사진 + 매번 다른 글', emoji: '🖼️', color: 'pink' },
    AI_FRESH: { label: '전부 AI가 새로 만들기', emoji: '✨', color: 'violet' },
    POOL_SIMILAR: { label: '내 사진 + 일관된 글', emoji: '🔁', color: 'blue' },
    PARAPHRASE: { label: '글만 매번 살짝씩 다르게', emoji: '📝', color: 'teal' },
};
const STATUS_INFO: Record<string, { label: string; color: string }> = {
    DRAFT: { label: '저장만 됨', color: 'gray' },
    RUNNING: { label: '발행 중', color: 'green' },
    PAUSED: { label: '잠시 멈춤', color: 'orange' },
    COMPLETED: { label: '모두 완료', color: 'blue' },
    FAILED: { label: '오류 발생', color: 'red' },
};
const TASK_STATUS: Record<string, { label: string; color: string; icon: any }> = {
    PENDING: { label: '예정', color: 'gray', icon: IconClock },
    RUNNING: { label: '발행 중', color: 'blue', icon: IconRefresh },
    SUCCESS: { label: '성공', color: 'teal', icon: IconCheck },
    FAILED: { label: '실패', color: 'red', icon: IconAlertCircle },
    CANCELLED: { label: '취소됨', color: 'gray', icon: IconX },
};
const SCHEDULE_LABELS: Record<string, string> = {
    INTERVAL: '몇 시간마다 1번',
    DAILY: '매일 정해진 시간',
    WEEKLY: '특정 요일에만',
    FIXED_COUNT: '기간 안에 균등하게',
};

interface Props {
    series: any;
    stats: { total: number; pending: number; running: number; success: number; failed: number; cancelled: number };
    recentTasks: any[];
    campaignCount: number;
}

export default function SeriesDetailClient(initial: Props) {
    const router = useRouter();
    const [data, setData] = useState(initial);
    const [busy, setBusy] = useState<'pause' | 'start' | 'run' | 'delete' | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    // RUNNING 상태일 때 30초마다 자동 새로고침
    useEffect(() => {
        if (!autoRefresh || data.series.status !== 'RUNNING') return;
        const t = setInterval(async () => {
            try {
                const fresh = await getSeriesDetail(data.series.id);
                setData(fresh);
            } catch {/* ignore */}
        }, 30000);
        return () => clearInterval(t);
    }, [autoRefresh, data.series.status, data.series.id]);

    const refresh = async () => {
        try {
            const fresh = await getSeriesDetail(data.series.id);
            setData(fresh);
            notifications.show({ message: '새로고침됨', color: 'gray' });
        } catch (e: any) {
            notifications.show({ title: '오류', message: e?.message, color: 'red' });
        }
    };

    const action = async (key: typeof busy, fn: () => Promise<any>, msg?: string) => {
        setBusy(key);
        try {
            await fn();
            if (msg) notifications.show({ message: msg, color: 'teal' });
            await refresh();
        } catch (e: any) {
            notifications.show({ title: '오류', message: e?.message, color: 'red' });
        } finally {
            setBusy(null);
        }
    };

    const s = data.series;
    const mode = MODE_LABELS[s.mode] || { label: s.mode, emoji: '📦', color: 'gray' };
    const status = STATUS_INFO[s.status] || { label: s.status, color: 'gray' };
    const progress = (s.completedPosts / s.totalPosts) * 100;
    const successRate = data.stats.total > 0 ? (data.stats.success / data.stats.total) * 100 : 0;

    return (
        <Container size="xl">
            <Stack gap="md" mb="lg">
                <Group gap={4}>
                    <Anchor component={Link} href="/dashboard/campaigns/series" size="sm">
                        <Group gap={4}>
                            <IconArrowLeft size={14} />
                            시리즈 목록
                        </Group>
                    </Anchor>
                </Group>
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                    <Stack gap={4}>
                        <Group gap="xs">
                            <Title order={2}>{s.name}</Title>
                            <Badge size="lg" color={status.color} variant={s.status === 'RUNNING' ? 'filled' : 'dot'}>
                                {status.label}
                            </Badge>
                        </Group>
                        <Group gap="xs">
                            <Badge color={mode.color} variant="light">{mode.emoji} {mode.label}</Badge>
                            <Badge variant="dot" color="gray">{SCHEDULE_LABELS[s.scheduleType]}</Badge>
                            <Badge variant="dot" color="gray">채널 {s.channelIds.length}개</Badge>
                            {s.mediaPool.length > 0 && (
                                <Badge variant="dot" color="pink" leftSection={<IconPhoto size={10} />}>
                                    사진풀 {s.mediaPool.length}장
                                </Badge>
                            )}
                        </Group>
                    </Stack>
                    <Group gap="xs">
                        <Tooltip label={autoRefresh ? '자동 새로고침 OFF' : '자동 새로고침 ON (30초)'}>
                            <ActionIcon
                                variant={autoRefresh ? 'filled' : 'light'}
                                color={autoRefresh ? 'green' : 'gray'}
                                onClick={() => setAutoRefresh(!autoRefresh)}
                            >
                                <IconRefresh size={16} />
                            </ActionIcon>
                        </Tooltip>
                        {s.status === 'RUNNING' && (
                            <>
                                <Button leftSection={<IconRefresh size={14} />} size="xs" variant="light" onClick={() => action('run', () => processSeriesOnce(s.id), '한 번 발행 완료')} loading={busy === 'run'}>
                                    지금 한 번 발행
                                </Button>
                                <Button leftSection={<IconPlayerPause size={14} />} size="xs" color="orange" variant="light" onClick={() => action('pause', () => updateSeriesStatus(s.id, 'PAUSED'), '잠시 멈췄어요')} loading={busy === 'pause'}>
                                    잠시 멈추기
                                </Button>
                            </>
                        )}
                        {(s.status === 'DRAFT' || s.status === 'PAUSED') && (
                            <Button leftSection={<IconPlayerPlay size={14} />} size="xs" color="green" onClick={() => action('start', () => updateSeriesStatus(s.id, 'RUNNING'), '발행 시작!')} loading={busy === 'start'}>
                                발행 시작하기
                            </Button>
                        )}
                    </Group>
                </Group>
            </Stack>

            {/* 핵심 통계 — 4 RingProgress */}
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="md">
                <Card withBorder p="md" radius="md">
                    <Group justify="space-between" wrap="nowrap">
                        <Stack gap={2}>
                            <Text size="xs" c="dimmed" fw={700}>몇 번 올렸나요?</Text>
                            <Text fw={900} size="xl">{s.completedPosts}<Text span size="sm" c="dimmed">/{s.totalPosts}</Text></Text>
                        </Stack>
                        <RingProgress
                            size={56}
                            thickness={6}
                            sections={[{ value: progress, color: mode.color }]}
                            label={<Center><Text size="9px" fw={700}>{Math.round(progress)}%</Text></Center>}
                        />
                    </Group>
                </Card>
                <Card withBorder p="md" radius="md">
                    <Group justify="space-between" wrap="nowrap">
                        <Stack gap={2}>
                            <Text size="xs" c="dimmed" fw={700}>잘 올라간 비율</Text>
                            <Text fw={900} size="xl">{Math.round(successRate)}%</Text>
                            <Text size="9px" c="dimmed">{data.stats.success}/{data.stats.total} 건</Text>
                        </Stack>
                        <RingProgress
                            size={56}
                            thickness={6}
                            sections={[{ value: successRate, color: 'teal' }]}
                            label={<Center><IconCheck size={16} color="var(--mantine-color-teal-6)" /></Center>}
                        />
                    </Group>
                </Card>
                <Card withBorder p="md" radius="md">
                    <Group justify="space-between" wrap="nowrap">
                        <Stack gap={2}>
                            <Text size="xs" c="dimmed" fw={700}>아직 안 올라간 것</Text>
                            <Text fw={900} size="xl" c="orange.7">{data.stats.pending}</Text>
                            <Text size="9px" c="dimmed">예정 게시물</Text>
                        </Stack>
                        <ThemeIcon variant="light" color="orange" size={56} radius="xl">
                            <IconClock size={24} />
                        </ThemeIcon>
                    </Group>
                </Card>
                <Card withBorder p="md" radius="md">
                    <Group justify="space-between" wrap="nowrap">
                        <Stack gap={2}>
                            <Text size="xs" c="dimmed" fw={700}>못 올린 것</Text>
                            <Text fw={900} size="xl" c="red.7">{data.stats.failed}</Text>
                            <Text size="9px" c="dimmed">{s.failedPosts}회 자동 발행 오류</Text>
                        </Stack>
                        <ThemeIcon variant="light" color="red" size={56} radius="xl">
                            <IconAlertCircle size={24} />
                        </ThemeIcon>
                    </Group>
                </Card>
            </SimpleGrid>

            {/* 다음 발행 + 최근 실행 + 에러 */}
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md" mb="md">
                <Paper withBorder p="md" radius="md">
                    <Group gap="sm" mb="xs">
                        <ThemeIcon variant="light" color="green" size="md" radius="xl">
                            <IconRocket size={16} />
                        </ThemeIcon>
                        <Text fw={700}>다음 발행</Text>
                    </Group>
                    {s.nextRunAt ? (
                        <Stack gap={4}>
                            <Text size="lg" fw={800} c="green.7">{dayjs(s.nextRunAt).format('YYYY.M.D HH:mm')}</Text>
                            <Text size="xs" c="dimmed">({Math.max(0, dayjs(s.nextRunAt).diff(dayjs(), 'minute'))}분 후)</Text>
                        </Stack>
                    ) : (
                        <Text c="dimmed">예정 없음 (PAUSED 또는 COMPLETED)</Text>
                    )}
                </Paper>
                <Paper withBorder p="md" radius="md">
                    <Group gap="sm" mb="xs">
                        <ThemeIcon variant="light" color="blue" size="md" radius="xl">
                            <IconCalendarEvent size={16} />
                        </ThemeIcon>
                        <Text fw={700}>최근 실행</Text>
                    </Group>
                    {s.lastRunAt ? (
                        <Stack gap={4}>
                            <Text size="md" fw={700}>{dayjs(s.lastRunAt).format('YYYY.M.D HH:mm:ss')}</Text>
                            {s.lastError && (
                                <Text size="xs" c="red.7">⚠️ {s.lastError}</Text>
                            )}
                        </Stack>
                    ) : (
                        <Text c="dimmed">아직 실행 기록 없음</Text>
                    )}
                </Paper>
            </SimpleGrid>

            {/* 사진풀 미리보기 (있으면) */}
            {s.mediaPool.length > 0 && (
                <Paper withBorder p="md" radius="md" mb="md">
                    <Group justify="space-between" mb="sm">
                        <Group gap="xs">
                            <IconPhoto size={18} />
                            <Text fw={700}>사진풀 ({s.mediaPool.length}장)</Text>
                        </Group>
                        <Text size="xs" c="dimmed">완료된 {s.completedPosts}회 발행에서 라운드로빈 사용</Text>
                    </Group>
                    <ScrollArea h={120}>
                        <Group gap="xs" wrap="nowrap">
                            {s.mediaPool.slice(0, 20).map((url: string, idx: number) => (
                                <Paper key={idx} withBorder radius="sm" p={0} style={{ width: 100, height: 100, flexShrink: 0, overflow: 'hidden' }}>
                                    <Image src={url} alt={`pool-${idx}`} h="100%" fit="cover" />
                                </Paper>
                            ))}
                            {s.mediaPool.length > 20 && (
                                <Center style={{ width: 100, height: 100, background: 'var(--mantine-color-default-hover)', borderRadius: 4 }}>
                                    <Text size="xs" c="dimmed" fw={700}>+{s.mediaPool.length - 20}</Text>
                                </Center>
                            )}
                        </Group>
                    </ScrollArea>
                </Paper>
            )}

            {/* 최근 발행 이력 */}
            <Paper withBorder p="md" radius="md">
                <Group justify="space-between" mb="sm">
                    <Text fw={700}>📜 최근 발행 이력</Text>
                    <Text size="xs" c="dimmed">총 {data.campaignCount}개 캠페인 · 최근 {data.recentTasks.length}건 task 표시</Text>
                </Group>
                {data.recentTasks.length === 0 ? (
                    <Center py="xl">
                        <Text size="sm" c="dimmed">아직 발행 이력이 없습니다. cron 이 5분마다 처리합니다.</Text>
                    </Center>
                ) : (
                    <Stack gap="xs">
                        {data.recentTasks.map((t: any) => {
                            const ts = TASK_STATUS[t.status] || { label: t.status, color: 'gray', icon: IconClock };
                            const TsIcon = ts.icon;
                            return (
                                <Paper key={t.id} withBorder radius="md" p="sm" style={{ borderLeft: `3px solid var(--mantine-color-${ts.color}-6)` }}>
                                    <Group justify="space-between" wrap="nowrap" mb={4}>
                                        <Group gap={6}>
                                            <Badge size="xs" color={ts.color} variant="filled" leftSection={<TsIcon size={10} />}>
                                                {ts.label}
                                            </Badge>
                                            <Badge size="xs" variant="dot" color="gray">{t.channelType}</Badge>
                                            <Text size="xs" c="dimmed">{t.accountName}</Text>
                                        </Group>
                                        <Text size="11px" c="dimmed">
                                            {t.executedAt ? dayjs(t.executedAt).format('M.D HH:mm') : `예정 ${dayjs(t.scheduledAt).format('M.D HH:mm')}`}
                                        </Text>
                                    </Group>
                                    <Text size="xs" c="dark.7" lineClamp={2} style={{ whiteSpace: 'pre-wrap' }}>
                                        {t.content}
                                    </Text>
                                    {t.errorLog && t.status === 'FAILED' && (
                                        <Text size="11px" c="red.7" mt={4} lineClamp={1}>⚠️ {t.errorLog}</Text>
                                    )}
                                </Paper>
                            );
                        })}
                    </Stack>
                )}
            </Paper>

            {/* 위험 영역 */}
            <Divider my="xl" />
            <Paper withBorder p="md" radius="md" style={{ borderColor: 'var(--mantine-color-red-3)' }}>
                <Group justify="space-between">
                    <Stack gap={2}>
                        <Text fw={700} c="red.8">위험 영역</Text>
                        <Text size="xs" c="dimmed">시리즈 삭제 시 향후 발행은 중단되지만 이미 생성된 캠페인은 유지됩니다.</Text>
                    </Stack>
                    <Button
                        color="red"
                        variant="light"
                        loading={busy === 'delete'}
                        onClick={() => {
                            if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
                            action('delete', () => deleteSeries(s.id).then(() => router.push('/dashboard/campaigns/series')));
                        }}
                    >
                        시리즈 삭제
                    </Button>
                </Group>
            </Paper>
        </Container>
    );
}
