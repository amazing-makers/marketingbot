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
    TRIAL_EXPIRING: '⏰',
    TRIAL_RECOVERY: '🎁',
    SYSTEM: '📣',
};

const KIND_LABEL: Record<string, string> = {
    REFERRAL_NEW: '추천 가입',
    COMMISSION_NEW: 'Commission',
    TIER_UPGRADE: '등급 승급',
    WORKSPACE_INVITE: '워크스페이스 초대',
    SERIES_COMPLETE: '시리즈 완료',
    TRIAL_EXPIRING: '체험 만료',
    TRIAL_RECOVERY: '재가입 안내',
    SYSTEM: '공지·기타',
};

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [unread, setUnread] = useState(0);
    const [busy, setBusy] = useState(false);
    const [kindFilter, setKindFilter] = useState<string | null>(null);

    // Phase 34 — kind 별 카운트
    const kindCounts: Record<string, { total: number; unread: number }> = {};
    for (const it of items) {
        const k = it.kind;
        if (!kindCounts[k]) kindCounts[k] = { total: 0, unread: 0 };
        kindCounts[k].total++;
        if (!it.readAt) kindCounts[k].unread++;
    }
    const filteredItems = kindFilter ? items.filter(i => i.kind === kindFilter) : items;

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

                {/* Phase 34 — kind 별 그룹 필터 (2개 이상 종류일 때만 표시) */}
                {Object.keys(kindCounts).length >= 2 && (
                    <Group gap={4} px="sm" py={6} style={{ borderBottom: '1px solid var(--mantine-color-default-border)', flexWrap: 'wrap' }}>
                        <Box
                            onClick={() => setKindFilter(null)}
                            style={{
                                fontSize: 11,
                                padding: '2px 8px',
                                borderRadius: 12,
                                cursor: 'pointer',
                                background: kindFilter === null ? 'var(--mantine-color-violet-6)' : 'var(--mantine-color-default-hover)',
                                color: kindFilter === null ? 'white' : 'var(--mantine-color-text)',
                                fontWeight: 600,
                            }}
                        >
                            전체 {items.length}
                        </Box>
                        {Object.entries(kindCounts).sort((a, b) => b[1].total - a[1].total).map(([kind, c]) => (
                            <Box
                                key={kind}
                                onClick={() => setKindFilter(kind)}
                                style={{
                                    fontSize: 11,
                                    padding: '2px 8px',
                                    borderRadius: 12,
                                    cursor: 'pointer',
                                    background: kindFilter === kind ? 'var(--mantine-color-violet-6)' : 'var(--mantine-color-default-hover)',
                                    color: kindFilter === kind ? 'white' : 'var(--mantine-color-text)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 3,
                                }}
                            >
                                <span>{KIND_EMOJI[kind] || '📣'}</span>
                                <span>{KIND_LABEL[kind] || kind} {c.total}</span>
                                {c.unread > 0 && (
                                    <Box style={{
                                        background: 'var(--mantine-color-red-6)',
                                        color: 'white',
                                        fontSize: 9,
                                        padding: '0 4px',
                                        borderRadius: 8,
                                        fontWeight: 700,
                                    }}>{c.unread}</Box>
                                )}
                            </Box>
                        ))}
                    </Group>
                )}
                <ScrollArea.Autosize mah={420}>
                    {filteredItems.length === 0 ? (
                        <Box style={{ textAlign: 'center', padding: 32, color: 'var(--mantine-color-dimmed)' }}>
                            <IconBell size={32} style={{ opacity: 0.3 }} />
                            <Text size="sm" mt="xs">{kindFilter ? '이 종류의 알림이 없습니다' : '알림이 없습니다'}</Text>
                        </Box>
                    ) : (
                        <Stack gap={0}>
                            {filteredItems.map(item => {
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
