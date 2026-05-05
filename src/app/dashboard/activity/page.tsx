import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { listWorkspaceActivities } from '@/app/actions/activityActions';
import {
    Container, Title, Text, Stack, Group, Paper, Card, Badge, Avatar, Box, Anchor,
} from '@mantine/core';
import { IconActivity } from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ko';

dayjs.extend(relativeTime);
dayjs.locale('ko');

export const dynamic = 'force-dynamic';

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

export default async function ActivityPage() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const activities = await listWorkspaceActivities(80);

    return (
        <Container size="lg" py="xl">
            <Stack gap="md">
                <Stack gap={2}>
                    <Anchor component={Link} href="/dashboard" size="sm">← 대시보드</Anchor>
                    <Group gap={6}><IconActivity size={24} /><Title order={2}>📜 활동 피드</Title></Group>
                    <Text size="sm" c="dimmed">활성 워크스페이스의 모든 멤버 활동 (최근 80개)</Text>
                </Stack>

                {activities.length === 0 ? (
                    <Paper withBorder p="xl" radius="md">
                        <Stack gap="sm" align="center">
                            <IconActivity size={48} style={{ opacity: 0.3 }} />
                            <Text fw={700}>아직 기록된 활동이 없습니다</Text>
                            <Text size="sm" c="dimmed" ta="center">
                                캠페인 작성·발행·채널 등록 등이 여기 표시됩니다
                            </Text>
                        </Stack>
                    </Paper>
                ) : (
                    <Stack gap="xs">
                        {activities.map((a, idx) => {
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
