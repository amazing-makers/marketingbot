'use client';

import { Container, Title, Text, Stack, Group, Card, Badge, Button, Box, Anchor } from '@mantine/core';
import { IconBell, IconCheck, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ko';
import { markNotificationRead, markAllNotificationsRead, deleteNotification } from '@/app/actions/notificationActions';
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

const KIND_LABEL: Record<string, { emoji: string; label: string; color: string }> = {
    REFERRAL_NEW: { emoji: '🎉', label: '신규 추천', color: 'violet' },
    COMMISSION_NEW: { emoji: '💰', label: 'Commission', color: 'teal' },
    TIER_UPGRADE: { emoji: '🏆', label: '등급 승급', color: 'yellow' },
    WORKSPACE_INVITE: { emoji: '🤝', label: '워크스페이스', color: 'blue' },
    SERIES_COMPLETE: { emoji: '✅', label: '시리즈 완료', color: 'green' },
    SYSTEM: { emoji: '📣', label: '공지', color: 'gray' },
};

export default function NotificationsClient({ initialItems, initialUnread }: { initialItems: Item[]; initialUnread: number }) {
    const [items, setItems] = useState(initialItems);
    const [unread, setUnread] = useState(initialUnread);
    const [busy, setBusy] = useState(false);

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
        } finally {
            setBusy(false);
        }
    };

    return (
        <Container size="md" py="xl">
            <Stack gap="md">
                <Group justify="space-between">
                    <Stack gap={2}>
                        <Group gap={6}><IconBell size={24} /><Title order={2}>알림</Title></Group>
                        <Text size="sm" c="dimmed">전체 {items.length}개 · 안 읽음 {unread}개</Text>
                    </Stack>
                    {unread > 0 && (
                        <Button variant="light" leftSection={<IconCheck size={14} />} onClick={handleMarkAll} loading={busy}>
                            모두 읽음 처리
                        </Button>
                    )}
                </Group>

                {items.length === 0 ? (
                    <Card withBorder p="xl" radius="md">
                        <Stack gap="sm" align="center">
                            <IconBell size={48} style={{ opacity: 0.3 }} />
                            <Text fw={700}>알림이 없습니다</Text>
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
                                        <Group gap={4}>
                                            {!isRead && (
                                                <Button size="compact-xs" variant="subtle" onClick={() => handleMarkRead(item.id)}>읽음</Button>
                                            )}
                                            <Button size="compact-xs" variant="subtle" color="red" onClick={() => handleDelete(item.id)}>
                                                <IconTrash size={12} />
                                            </Button>
                                        </Group>
                                    </Group>
                                </Card>
                            );
                        })}
                    </Stack>
                )}
            </Stack>
        </Container>
    );
}
