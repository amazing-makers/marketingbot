'use client';

import {
    Container, Title, Text, Stack, Group, Card, Badge, Avatar, Box, Anchor, Select,
} from '@mantine/core';
import { IconActivity } from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ko';
import { useMemo, useState } from 'react';

dayjs.extend(relativeTime);
dayjs.locale('ko');

interface ActivityItem {
    id: string;
    kind: string;
    title: string;
    body: string | null;
    link: string | null;
    createdAt: string;
    user: { id: string; email: string; name: string | null };
}

const KIND_LABEL: Record<string, { emoji: string; label: string; color: string }> = {
    CAMPAIGN_CREATED: { emoji: '📝', label: '캠페인 작성', color: 'violet' },
    CAMPAIGN_PUBLISHED: { emoji: '🚀', label: '캠페인 발행', color: 'teal' },
    CHANNEL_ADDED: { emoji: '🌐', label: '채널 등록', color: 'blue' },
    SERIES_STARTED: { emoji: '🤖', label: '자동 발행 시작', color: 'orange' },
    SERIES_COMPLETED: { emoji: '✅', label: '자동 발행 완료', color: 'green' },
    CLIENT_ADDED: { emoji: '🏪', label: '고객사 추가', color: 'cyan' },
    INVOICE_CREATED: { emoji: '📄', label: '인보이스 발행', color: 'blue' },
    INVOICE_PAID: { emoji: '💰', label: '인보이스 입금', color: 'teal' },
    TEMPLATE_CREATED: { emoji: '📚', label: '템플릿 추가', color: 'grape' },
};

export default function ActivityClient({ activities }: { activities: ActivityItem[] }) {
    const [kindFilter, setKindFilter] = useState<string | null>(null);
    const [userFilter, setUserFilter] = useState<string | null>(null);
    const [dateFilter, setDateFilter] = useState<string>('all');

    const userOptions = useMemo(() => {
        const map = new Map<string, { id: string; label: string }>();
        for (const a of activities) {
            if (!map.has(a.user.id)) {
                map.set(a.user.id, { id: a.user.id, label: a.user.name || a.user.email.split('@')[0] });
            }
        }
        return Array.from(map.values()).map(u => ({ value: u.id, label: u.label }));
    }, [activities]);

    const kindOptions = useMemo(() => {
        const set = new Set(activities.map(a => a.kind));
        return Array.from(set).sort().map(k => ({
            value: k,
            label: `${KIND_LABEL[k]?.emoji || ''} ${KIND_LABEL[k]?.label || k}`,
        }));
    }, [activities]);

    const filtered = useMemo(() => {
        const now = Date.now();
        const ranges: Record<string, number> = {
            today: 24 * 60 * 60 * 1000,
            week: 7 * 24 * 60 * 60 * 1000,
            month: 30 * 24 * 60 * 60 * 1000,
        };
        return activities.filter(a => {
            if (kindFilter && a.kind !== kindFilter) return false;
            if (userFilter && a.user.id !== userFilter) return false;
            if (dateFilter !== 'all') {
                const cutoff = now - ranges[dateFilter];
                if (new Date(a.createdAt).getTime() < cutoff) return false;
            }
            return true;
        });
    }, [activities, kindFilter, userFilter, dateFilter]);

    return (
        <Container size="lg" py="xl">
            <Stack gap="md">
                <Stack gap={2}>
                    <Anchor component={Link} href="/dashboard" size="sm">← 대시보드</Anchor>
                    <Group gap={6}><IconActivity size={24} /><Title order={2}>📜 활동 피드</Title></Group>
                    <Text size="sm" c="dimmed">활성 워크스페이스의 모든 멤버 활동</Text>
                </Stack>

                {/* 필터 */}
                {activities.length > 0 && (
                    <Group gap="xs">
                        <Select
                            placeholder="모든 종류"
                            data={kindOptions}
                            value={kindFilter}
                            onChange={setKindFilter}
                            clearable
                            searchable
                            w={200}
                        />
                        {userOptions.length > 1 && (
                            <Select
                                placeholder="모든 멤버"
                                data={userOptions}
                                value={userFilter}
                                onChange={setUserFilter}
                                clearable
                                w={180}
                            />
                        )}
                        <Select
                            data={[
                                { value: 'all', label: '전체 기간' },
                                { value: 'today', label: '오늘' },
                                { value: 'week', label: '최근 7일' },
                                { value: 'month', label: '최근 30일' },
                            ]}
                            value={dateFilter}
                            onChange={(v) => setDateFilter(v || 'all')}
                            allowDeselect={false}
                            w={140}
                        />
                        {(kindFilter || userFilter || dateFilter !== 'all') && (
                            <Text size="xs" c="dimmed">{filtered.length}/{activities.length}</Text>
                        )}
                    </Group>
                )}

                {filtered.length === 0 ? (
                    <Card withBorder p="xl" radius="md">
                        <Stack gap="sm" align="center">
                            <IconActivity size={48} style={{ opacity: 0.3 }} />
                            <Text fw={700}>{activities.length === 0 ? '아직 기록된 활동이 없습니다' : '필터에 맞는 활동이 없습니다'}</Text>
                            <Text size="sm" c="dimmed" ta="center">
                                {activities.length === 0
                                    ? '캠페인 작성·발행·채널 등록 등이 여기 표시됩니다'
                                    : '필터를 다시 조정해보세요'}
                            </Text>
                        </Stack>
                    </Card>
                ) : (
                    <Stack gap="xs">
                        {filtered.map((a) => {
                            const kind = KIND_LABEL[a.kind] || { emoji: '•', label: a.kind, color: 'gray' };
                            const userName = a.user.name || a.user.email.split('@')[0];
                            return (
                                <Card key={a.id} withBorder p="sm" radius="md">
                                    <Group gap="sm" align="flex-start" wrap="nowrap">
                                        <Avatar size="md" radius="xl" color={kind.color}>
                                            {userName.charAt(0).toUpperCase()}
                                        </Avatar>
                                        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                                            <Group gap={6}>
                                                <Text size="sm" fw={700}>{userName}</Text>
                                                <Badge size="xs" color={kind.color} variant="light">
                                                    {kind.emoji} {kind.label}
                                                </Badge>
                                                <Text size="11px" c="dimmed">{dayjs(a.createdAt).fromNow()}</Text>
                                            </Group>
                                            {a.link ? (
                                                <Anchor component={Link} href={a.link} size="sm" c="inherit">
                                                    <Text size="sm">{a.title}</Text>
                                                </Anchor>
                                            ) : (
                                                <Text size="sm">{a.title}</Text>
                                            )}
                                            {a.body && <Text size="xs" c="dimmed">{a.body}</Text>}
                                        </Stack>
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
