'use client';

import { useState } from 'react';
import {
    Container, Title, Text, Switch, Stack, Paper, Button, Group, TextInput, Select, Modal, Badge, ActionIcon, Tooltip, Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconBrandSlack, IconBrandDiscord, IconPlus, IconTrash, IconSend } from '@tabler/icons-react';
import { updateEmailPreferences } from '@/app/actions/userActions';
import PushNotificationToggle from '@/components/pwa/PushNotificationToggle';
import {
    createNotificationChannel,
    toggleNotificationChannel,
    deleteNotificationChannel,
    testNotificationChannel,
} from '@/app/actions/notificationChannelActions';

interface ExternalChannel {
    id: string;
    type: 'SLACK' | 'DISCORD';
    webhookUrl: string;
    label: string | null;
    enabled: boolean;
    lastUsedAt: string | null;
    createdAt: string;
}

interface NotificationsClientProps {
    initialPrefs: { failures: boolean; weekly: boolean; welcome: boolean };
    initialChannels: ExternalChannel[];
}

export default function NotificationsClient({ initialPrefs, initialChannels }: NotificationsClientProps) {
    const [prefs, setPrefs] = useState(initialPrefs);
    const [loading, setLoading] = useState(false);
    const [channels, setChannels] = useState(initialChannels);
    const [busy, setBusy] = useState(false);
    const [createModal, createModalCtl] = useDisclosure(false);
    const [newChannel, setNewChannel] = useState<{ type: 'SLACK' | 'DISCORD'; webhookUrl: string; label: string }>({
        type: 'SLACK',
        webhookUrl: '',
        label: '',
    });

    const handleSave = async () => {
        setLoading(true);
        const result = await updateEmailPreferences(prefs);
        setLoading(false);

        if (result.success) {
            notifications.show({ title: '저장 완료', message: '알림 설정이 업데이트되었습니다.', color: 'teal' });
        } else {
            notifications.show({ title: '오류', message: '저장 중 문제가 발생했습니다.', color: 'red' });
        }
    };

    const handleCreateChannel = async () => {
        if (!newChannel.webhookUrl.trim()) {
            notifications.show({ color: 'orange', title: 'URL 필요', message: 'webhook URL을 입력하세요' });
            return;
        }
        setBusy(true);
        try {
            await createNotificationChannel({
                type: newChannel.type,
                webhookUrl: newChannel.webhookUrl,
                label: newChannel.label || undefined,
            });
            notifications.show({ color: 'teal', title: `${newChannel.type} 연동됨`, message: '이제 알림이 자동으로 전송됩니다' });
            createModalCtl.close();
            setNewChannel({ type: 'SLACK', webhookUrl: '', label: '' });
            window.location.reload();
        } catch (e: any) {
            notifications.show({ color: 'red', title: '실패', message: e?.message || '실패' });
        } finally {
            setBusy(false);
        }
    };

    const handleToggle = async (id: string, enabled: boolean) => {
        await toggleNotificationChannel(id, enabled);
        setChannels(prev => prev.map(c => c.id === id ? { ...c, enabled } : c));
    };

    const handleDelete = async (id: string) => {
        if (!confirm('이 채널을 삭제하시겠습니까?')) return;
        await deleteNotificationChannel(id);
        setChannels(prev => prev.filter(c => c.id !== id));
        notifications.show({ color: 'gray', title: '삭제됨', message: '채널이 제거되었습니다' });
    };

    const handleTest = async (id: string) => {
        setBusy(true);
        try {
            const r = await testNotificationChannel(id);
            if (r.ok) {
                notifications.show({ color: 'teal', title: '✅ 테스트 성공', message: '채널에서 메시지를 확인하세요' });
            } else {
                notifications.show({ color: 'red', title: '테스트 실패', message: r.error || '실패' });
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <Container size="sm" py="xl">
            <Title order={2} mb="md">알림 설정</Title>
            <Text c="dimmed" mb="xl">이메일 + 브라우저 푸시 + Slack/Discord — 모든 알림을 한 곳에서 관리.</Text>

            {/* 브라우저 푸시 */}
            <Paper withBorder p="xl" radius="md" mb="md">
                <PushNotificationToggle />
            </Paper>

            {/* Slack/Discord 외부 채널 */}
            <Title order={4} mb="sm">💬 Slack / Discord 알림</Title>
            <Paper withBorder p="md" radius="md" mb="md">
                <Group justify="space-between" mb="sm">
                    <Text size="sm" c="dimmed">
                        팀 채팅 채널에 자동 발송 — 추천 가입·commission·시리즈 완료 등
                    </Text>
                    <Button size="compact-sm" leftSection={<IconPlus size={14} />} onClick={createModalCtl.open}>
                        + 채널 추가
                    </Button>
                </Group>
                {channels.length === 0 ? (
                    <Text size="xs" c="dimmed" ta="center" py="md">아직 연동된 채널이 없어요</Text>
                ) : (
                    <Stack gap="xs">
                        {channels.map(c => (
                            <Box key={c.id} p="sm" style={{ background: 'var(--mantine-color-default-hover)', borderRadius: 8 }}>
                                <Group justify="space-between" wrap="wrap">
                                    <Group gap={6}>
                                        {c.type === 'SLACK' ? <IconBrandSlack size={18} color="#4A154B" /> : <IconBrandDiscord size={18} color="#5865F2" />}
                                        <Text fw={600} size="sm">{c.label || c.type}</Text>
                                        <Badge size="xs" color={c.enabled ? 'teal' : 'gray'} variant="light">
                                            {c.enabled ? '활성' : '비활성'}
                                        </Badge>
                                    </Group>
                                    <Group gap={4}>
                                        <Tooltip label="테스트 발송">
                                            <ActionIcon size="sm" variant="light" color="blue" onClick={() => handleTest(c.id)} loading={busy}>
                                                <IconSend size={13} />
                                            </ActionIcon>
                                        </Tooltip>
                                        <Switch
                                            size="sm"
                                            checked={c.enabled}
                                            onChange={(e) => handleToggle(c.id, e.currentTarget.checked)}
                                        />
                                        <ActionIcon size="sm" variant="light" color="red" onClick={() => handleDelete(c.id)}>
                                            <IconTrash size={13} />
                                        </ActionIcon>
                                    </Group>
                                </Group>
                            </Box>
                        ))}
                    </Stack>
                )}
            </Paper>

            {/* 이메일 */}
            <Title order={4} mb="sm">📧 이메일 알림</Title>
            <Paper withBorder p="xl" radius="md">
                <Stack gap="xl">
                    <Group justify="space-between" wrap="nowrap">
                        <div>
                            <Text fw={500}>작업 실패 요약</Text>
                            <Text size="xs" c="dimmed">SNS 게시 실패 매일 아침 요약 발송.</Text>
                        </div>
                        <Switch checked={prefs.failures} onChange={(e) => setPrefs({ ...prefs, failures: e.currentTarget.checked })} size="md" />
                    </Group>
                    <Group justify="space-between" wrap="nowrap">
                        <div>
                            <Text fw={500}>주간 리포트</Text>
                            <Text size="xs" c="dimmed">매주 월요일 한 주 성과 요약.</Text>
                        </div>
                        <Switch checked={prefs.weekly} onChange={(e) => setPrefs({ ...prefs, weekly: e.currentTarget.checked })} size="md" />
                    </Group>
                    <Group justify="space-between" wrap="nowrap">
                        <div>
                            <Text fw={500}>가입 환영 및 공지</Text>
                            <Text size="xs" c="dimmed">계정 활성화 안내 + 서비스 변경 알림.</Text>
                        </div>
                        <Switch checked={prefs.welcome} onChange={(e) => setPrefs({ ...prefs, welcome: e.currentTarget.checked })} size="md" />
                    </Group>
                    <Button onClick={handleSave} loading={loading} mt="md">설정 저장</Button>
                </Stack>
            </Paper>

            {/* 채널 추가 모달 */}
            <Modal opened={createModal} onClose={createModalCtl.close} title="Slack/Discord 채널 추가" size="md">
                <Stack gap="sm">
                    <Select
                        label="플랫폼"
                        data={[
                            { value: 'SLACK', label: '🟣 Slack' },
                            { value: 'DISCORD', label: '🔵 Discord' },
                        ]}
                        value={newChannel.type}
                        onChange={(v) => setNewChannel(c => ({ ...c, type: (v as 'SLACK' | 'DISCORD') || 'SLACK' }))}
                        allowDeselect={false}
                    />
                    <TextInput
                        label="Webhook URL"
                        placeholder={newChannel.type === 'SLACK' ? 'https://hooks.slack.com/services/...' : 'https://discord.com/api/webhooks/...'}
                        value={newChannel.webhookUrl}
                        onChange={(e) => setNewChannel(c => ({ ...c, webhookUrl: e.currentTarget.value }))}
                        required
                    />
                    <TextInput
                        label="라벨 (선택)"
                        placeholder="예: 마케팅팀"
                        value={newChannel.label}
                        onChange={(e) => setNewChannel(c => ({ ...c, label: e.currentTarget.value }))}
                    />
                    <Box style={{ background: 'var(--mantine-color-blue-0)', padding: 10, borderRadius: 6 }}>
                        <Text size="xs" c="blue.9">
                            <strong>Slack</strong>: 워크스페이스 → Apps → Incoming Webhooks 추가 → 채널 선택 → Webhook URL 복사<br />
                            <strong>Discord</strong>: 서버 설정 → 연동 → 웹후크 → 새 웹후크 → URL 복사
                        </Text>
                    </Box>
                    <Group justify="flex-end" mt="md">
                        <Button variant="subtle" onClick={createModalCtl.close}>취소</Button>
                        <Button onClick={handleCreateChannel} loading={busy}>연동</Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
}
