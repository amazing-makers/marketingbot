'use client';

import {
    ActionIcon, Indicator, Popover, ScrollArea, Stack, Group, Text, Box, Button, Anchor, Tooltip,
} from '@mantine/core';
import { IconBell, IconCheck, IconX, IconExternalLink } from '@tabler/icons-react';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ko';
import { listMyNotifications, markNotificationRead, markAllNotificationsRead } from '@/app/actions/notificationActions';

dayjs.extend(relativeTime);
dayjs.locale('ko');

interface NotificationItem {
    id: string;
    kind: string;
    title: string;
    body: string | null;
    link: string | null;
    readAt: string | null;
    createdAt: string;
}

const KIND_EMOJI: Record<string, string> = {
    REFERRAL_NEW: '🎉',
    COMMISSION_NEW: '💰',
    TIER_UPGRADE: '🏆',
    WORKSPACE_INVITE: '🤝',
    SERIES_COMPLETE: '✅',
    SYSTEM: '📣',
};

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [unread, setUnread] = useState(0);
    const [busy, setBusy] = useState(false);

    const refresh = useCallback(async () => {
        try {
            const r = await listMyNotifications();
            setItems(r.items);
            setUnread(r.unreadCount);
        } catch {
            // 비로그인 등 — 무시
        }
    }, []);

    useEffect(() => {
        refresh();
        // 60초마다 폴링 — 실시간성 정도면 충분
        const interval = setInterval(refresh, 60_000);
        return () => clearInterval(interval);
    }, [refresh]);

    const handleClickItem = async (item: NotificationItem) => {
        if (!item.readAt) {
            await markNotificationRead(item.id);
            setItems(prev => prev.map(p => p.id === item.id ? { ...p, readAt: new Date().toISOString() } : p));
            setUnread(u => Math.max(0, u - 1));
        }
        if (item.link) {
            setOpen(false);
            window.location.href = item.link;
        }
    };

    const handleMarkAll = async () => {
        setBusy(true);
        try {
            await markAllNotificationsRead();
            setItems(prev => prev.map(p => ({ ...p, readAt: p.readAt || new Date().toISOString() })));
            setUnread(0);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Popover
            opened={open}
            onChange={setOpen}
            position="bottom-end"
            shadow="md"
            width={360}
            withArrow
        >
            <Popover.Target>
                <Indicator disabled={unread === 0} size={16} color="red" label={unread > 99 ? '99+' : unread} offset={6}>
                    <Tooltip label="알림" withArrow>
                        <ActionIcon variant="subtle" size="lg" onClick={() => setOpen(o => !o)}>
                            <IconBell size={18} />
                        </ActionIcon>
                    </Tooltip>
                </Indicator>
            </Popover.Target>
            <Popover.Dropdown p={0}>
                <Group justify="space-between" p="sm" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                    <Group gap={6}>
                        <Text fw={700} size="sm">🔔 알림</Text>
                        {unread > 0 && <Text size="xs" c="dimmed">{unread}개 안 읽음</Text>}
                    </Group>
                    {unread > 0 && (
                        <Button size="compact-xs" variant="subtle" onClick={handleMarkAll} loading={busy}>
                            모두 읽음
                        </Button>
                    )}
                </Group>
                <ScrollArea.Autosize mah={420}>
                    {items.length === 0 ? (
                        <Box style={{ textAlign: 'center', padding: 32, color: 'var(--mantine-color-dimmed)' }}>
                            <IconBell size={32} style={{ opacity: 0.3 }} />
                            <Text size="sm" mt="xs">알림이 없습니다</Text>
                        </Box>
                    ) : (
                        <Stack gap={0}>
                            {items.map(item => {
                                const isRead = !!item.readAt;
                                return (
                                    <Box
                                        key={item.id}
                                        onClick={() => handleClickItem(item)}
                                        style={{
                                            padding: 10,
                                            borderBottom: '1px solid var(--mantine-color-default-border)',
                                            cursor: item.link ? 'pointer' : 'default',
                                            background: isRead ? 'transparent' : 'var(--mantine-color-violet-0)',
                                            opacity: isRead ? 0.75 : 1,
                                        }}
                                    >
                                        <Group gap={8} align="flex-start" wrap="nowrap">
                                            <Text size="lg" style={{ lineHeight: 1.2, flexShrink: 0 }}>
                                                {KIND_EMOJI[item.kind] || '📣'}
                                            </Text>
                                            <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                                                <Group gap={4} justify="space-between" wrap="nowrap">
                                                    <Text size="sm" fw={isRead ? 500 : 700} truncate>{item.title}</Text>
                                                    {!isRead && (
                                                        <Box style={{
                                                            width: 7, height: 7, borderRadius: '50%',
                                                            background: 'var(--mantine-color-violet-6)',
                                                            flexShrink: 0,
                                                        }} />
                                                    )}
                                                </Group>
                                                {item.body && (
                                                    <Text size="xs" c="dimmed" lineClamp={2}>{item.body}</Text>
                                                )}
                                                <Group gap={4}>
                                                    <Text size="10px" c="dimmed">{dayjs(item.createdAt).fromNow()}</Text>
                                                    {item.link && <IconExternalLink size={10} color="var(--mantine-color-dimmed)" />}
                                                </Group>
                                            </Stack>
                                        </Group>
                                    </Box>
                                );
                            })}
                        </Stack>
                    )}
                </ScrollArea.Autosize>
                {items.length > 0 && (
                    <Box p="xs" style={{ textAlign: 'center', borderTop: '1px solid var(--mantine-color-default-border)' }}>
                        <Anchor component={Link} href="/dashboard/notifications" size="xs">전체 알림 보기</Anchor>
                    </Box>
                )}
            </Popover.Dropdown>
        </Popover>
    );
}
