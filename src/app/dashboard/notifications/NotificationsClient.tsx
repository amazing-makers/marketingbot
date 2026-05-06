'use client';

import {
    Container, Title, Text, Stack, Group, Card, Badge, Button, Box, Anchor,
    TextInput, Switch, Pagination, Paper, Menu, ActionIcon, Tooltip,
} from '@mantine/core';
import {
    IconBell, IconCheck, IconTrash, IconSearch, IconFilter, IconX,
    IconDotsVertical,
} from '@tabler/icons-react';
import { useState, useTransition } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ko';
import { useRouter } from 'next/navigation';
import {
    markNotificationRead, markAllNotificationsRead, deleteNotification, markKindNotificationsRead,
} from '@/app/actions/notificationActions';
import Link from 'next/link';

dayjs.extend(relativeTime);
dayjs.locale('ko');

interface Item {
    id: string;
    kind: string;
    title: string;
    body: string | null;
    link: string | null;
    readAt: string | null;
    createdAt: string;
}

interface PagedData {
    items: Item[];
    total: number;
    unread: number;
    page: number;
    pageSize: number;
    pageCount: number;
    kindCounts: Record<string, number>;
}

const KIND_LABEL: Record<string, { emoji: string; label: string; color: string }> = {
    REFERRAL_NEW: { emoji: '🎉', label: '신규 추천', color: 'violet' },
    COMMISSION_NEW: { emoji: '💰', label: 'Commission', color: 'teal' },
    TIER_UPGRADE: { emoji: '🏆', label: '등급 승급', color: 'yellow' },
    WORKSPACE_INVITE: { emoji: '🤝', label: '워크스페이스', color: 'blue' },
    SERIES_COMPLETE: { emoji: '✅', label: '시리즈 완료', color: 'green' },
    TRIAL_EXPIRING: { emoji: '⏰', label: '체험 만료', color: 'orange' },
    TRIAL_RECOVERY: { emoji: '🎁', label: '재가입 안내', color: 'pink' },
    LOGIN_NEW_DEVICE: { emoji: '🔐', label: '새 디바이스', color: 'red' },
    CHANNEL_ERROR: { emoji: '🚨', label: '채널 오류', color: 'red' },
    SYSTEM: { emoji: '📣', label: '공지', color: 'gray' },
};

interface Props {
    initial: PagedData;
    initialFilter: {
        kind: string | null;
        q: string;
        unreadOnly: boolean;
    };
}

export default function NotificationsClient({ initial, initialFilter }: Props) {
    const router = useRouter();
    const [items, setItems] = useState(initial.items);
    const [unread, setUnread] = useState(initial.unread);
    const [query, setQuery] = useState(initialFilter.q);
    const [unreadOnly, setUnreadOnly] = useState(initialFilter.unreadOnly);
    const [busy, setBusy] = useState(false);
    const [isPending, startTransition] = useTransition();

    const buildUrl = (overrides: Partial<{ kind: string | null; q: string; unread: boolean; page: number }> = {}) => {
        const params = new URLSearchParams();
        const k = overrides.kind !== undefined ? overrides.kind : initialFilter.kind;
        const q = overrides.q !== undefined ? overrides.q : query;
        const u = overrides.unread !== undefined ? overrides.unread : unreadOnly;
        const p = overrides.page !== undefined ? overrides.page : initial.page;
        if (k) params.set('kind', k);
        if (q) params.set('q', q);
        if (u) params.set('unread', '1');
        if (p > 1) params.set('page', String(p));
        const s = params.toString();
        return s ? `/dashboard/notifications?${s}` : '/dashboard/notifications';
    };

    const navigate = (overrides: Parameters<typeof buildUrl>[0]) => {
        startTransition(() => router.push(buildUrl(overrides)));
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        navigate({ q: query, page: 1 });
    };

    const handleMarkRead = async (id: string) => {
        await markNotificationRead(id);
        setItems(prev => prev.map(i => i.id === id ? { ...i, readAt: new Date().toISOString() } : i));
        setUnread(u => Math.max(0, u - 1));
    };

    const handleDelete = async (id: string) => {
        if (!confirm('이 알림을 삭제하시겠습니까?')) return;
        await deleteNotification(id);
        const item = items.find(i => i.id === id);
        setItems(prev => prev.filter(i => i.id !== id));
        if (item && !item.readAt) setUnread(u => Math.max(0, u - 1));
    };

    const handleMarkAll = async () => {
        setBusy(true);
        try {
            await markAllNotificationsRead();
            setItems(prev => prev.map(i => ({ ...i, readAt: i.readAt || new Date().toISOString() })));
            setUnread(0);
            router.refresh();
        } finally {
            setBusy(false);
        }
    };

    const handleMarkKindRead = async (kind: string) => {
        setBusy(true);
        try {
            await markKindNotificationsRead(kind);
            router.refresh();
        } finally {
            setBusy(false);
        }
    };

    const totalAll = Object.values(initial.kindCounts).reduce((s, c) => s + c, 0);
    const sortedKinds = Object.entries(initial.kindCounts).sort((a, b) => b[1] - a[1]);

    return (
        <Container size="md" py={{ base: "md", sm: "xl" }}>
            <Stack gap="md">
                <Group justify="space-between" wrap="wrap">
                    <Stack gap={2}>
                        <Group gap={6}>
                            <IconBell size={24} />
                            <Title order={2}>알림</Title>
                        </Group>
                        <Text size="sm" c="dimmed">
                            전체 {initial.total}개{initial.total !== totalAll && ` (필터 적용)`} · 안 읽음 {unread}개
                        </Text>
                    </Stack>
                    {unread > 0 && (
                        <Button variant="light" leftSection={<IconCheck size={14} />} onClick={handleMarkAll} loading={busy}>
                            모두 읽음 처리
                        </Button>
                    )}
                </Group>

                {/* Phase 37 — kind 필터 + 검색 + unread only */}
                <Paper withBorder p="md" radius="md">
                    <Stack gap="sm">
                        <Group gap={6} wrap="wrap">
                            <IconFilter size={14} color="var(--mantine-color-dimmed)" />
                            <Text size="xs" fw={600}>종류:</Text>
                            <Anchor
                                component={Link}
                                href={buildUrl({ kind: null, page: 1 })}
                                size="xs"
                                fw={!initialFilter.kind ? 700 : 400}
                                c={!initialFilter.kind ? 'violet' : 'dimmed'}
                            >
                                전체 {totalAll}
                            </Anchor>
                            {sortedKinds.map(([kind, count]) => {
                                const k = KIND_LABEL[kind] || { emoji: '📣', label: kind, color: 'gray' };
                                const active = initialFilter.kind === kind;
                                return (
                                    <Anchor
                                        key={kind}
                                        component={Link}
                                        href={buildUrl({ kind, page: 1 })}
                                        size="xs"
                                        fw={active ? 700 : 400}
                                        c={active ? k.color : 'dimmed'}
                                    >
                                        {k.emoji} {k.label} {count}
                                    </Anchor>
                                );
                            })}
                        </Group>
                        <Group gap="xs" wrap="wrap">
                            <form onSubmit={handleSearch} style={{ flex: 1, minWidth: 240 }}>
                                <TextInput
                                    placeholder="제목·본문 검색"
                                    leftSection={<IconSearch size={14} />}
                                    value={query}
                                    onChange={(e) => setQuery(e.currentTarget.value)}
                                    rightSection={query && (
                                        <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => { setQuery(''); navigate({ q: '', page: 1 }); }}>
                                            <IconX size={12} />
                                        </ActionIcon>
                                    )}
                                />
                            </form>
                            <Switch
                                label="안 읽음만"
                                checked={unreadOnly}
                                onChange={(e) => {
                                    setUnreadOnly(e.currentTarget.checked);
                                    navigate({ unread: e.currentTarget.checked, page: 1 });
                                }}
                            />
                            {initialFilter.kind && initial.unread > 0 && (
                                <Tooltip label={`${KIND_LABEL[initialFilter.kind]?.label || initialFilter.kind} 종류만 읽음`} withArrow>
                                    <Button
                                        size="compact-sm"
                                        variant="subtle"
                                        onClick={() => handleMarkKindRead(initialFilter.kind!)}
                                        loading={busy}
                                    >
                                        이 종류 모두 읽음
                                    </Button>
                                </Tooltip>
                            )}
                        </Group>
                    </Stack>
                </Paper>

                {items.length === 0 ? (
                    <Card withBorder p="xl" radius="md">
                        <Stack gap="sm" align="center">
                            <IconBell size={48} style={{ opacity: 0.3 }} />
                            <Text fw={700}>
                                {initialFilter.kind || initialFilter.q || initialFilter.unreadOnly
                                    ? '조건에 맞는 알림이 없습니다'
                                    : '알림이 없습니다'}
                            </Text>
                            <Text size="sm" c="dimmed" ta="center">
                                새 추천 사용자 가입·commission 누적·등급 승급·워크스페이스 초대 등이 여기 표시돼요
                            </Text>
                        </Stack>
                    </Card>
                ) : (
                    <Stack gap="xs">
                        {items.map(item => {
                            const kind = KIND_LABEL[item.kind] || { emoji: '📣', label: item.kind, color: 'gray' };
                            const isRead = !!item.readAt;
                            return (
                                <Card
                                    key={item.id}
                                    withBorder
                                    p="md"
                                    radius="md"
                                    style={{
                                        background: isRead ? undefined : 'var(--mantine-color-violet-0)',
                                        opacity: isRead ? 0.7 : 1,
                                    }}
                                >
                                    <Group gap="sm" align="flex-start" wrap="nowrap">
                                        <Text size="24px">{kind.emoji}</Text>
                                        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                                            <Group gap={6}>
                                                <Badge size="xs" color={kind.color} variant="light">{kind.label}</Badge>
                                                {!isRead && <Badge size="xs" color="violet" variant="filled">NEW</Badge>}
                                                <Text size="11px" c="dimmed">{dayjs(item.createdAt).fromNow()}</Text>
                                            </Group>
                                            <Text fw={isRead ? 500 : 700} size="sm">{item.title}</Text>
                                            {item.body && <Text size="xs" c="dimmed">{item.body}</Text>}
                                            {item.link && (
                                                <Anchor component={Link} href={item.link} size="xs" mt={4}>
                                                    상세 보기 →
                                                </Anchor>
                                            )}
                                        </Stack>
                                        <Menu position="bottom-end" shadow="md" withinPortal>
                                            <Menu.Target>
                                                <ActionIcon variant="subtle" color="gray" size="sm">
                                                    <IconDotsVertical size={14} />
                                                </ActionIcon>
                                            </Menu.Target>
                                            <Menu.Dropdown>
                                                {!isRead && (
                                                    <Menu.Item leftSection={<IconCheck size={14} />} onClick={() => handleMarkRead(item.id)}>
                                                        읽음 표시
                                                    </Menu.Item>
                                                )}
                                                <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={() => handleDelete(item.id)}>
                                                    삭제
                                                </Menu.Item>
                                            </Menu.Dropdown>
                                        </Menu>
                                    </Group>
                                </Card>
                            );
                        })}
                    </Stack>
                )}

                {initial.pageCount > 1 && (
                    <Group justify="center">
                        <Pagination
                            total={initial.pageCount}
                            value={initial.page}
                            siblings={1}
                            boundaries={1}
                            getItemProps={(p) => ({ component: Link as any, href: buildUrl({ page: p }) }) as any}
                            getControlProps={(control) => {
                                if (control === 'previous') return { component: Link as any, href: buildUrl({ page: Math.max(1, initial.page - 1) }) } as any;
                                if (control === 'next') return { component: Link as any, href: buildUrl({ page: Math.min(initial.pageCount, initial.page + 1) }) } as any;
                                return {};
                            }}
                        />
                    </Group>
                )}
            </Stack>
        </Container>
    );
}
