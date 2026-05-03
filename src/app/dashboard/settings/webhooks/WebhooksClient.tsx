'use client';

import { useState } from 'react';
import {
    Container, Title, Text, Stack, Paper, Group, Button, TextInput, Badge,
    Code, Alert, Switch, Modal, Anchor, ActionIcon, Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useDisclosure, useClipboard } from '@mantine/hooks';
import {
    IconWebhook, IconPlus, IconCopy, IconTrash, IconCheck, IconInfoCircle,
} from '@tabler/icons-react';
import {
    createWebhookToken, toggleWebhookToken, deleteWebhookToken,
    type UserWebhookTokenSummary,
} from '@/app/actions/webhookActions';
import dayjs from 'dayjs';

interface Props {
    initialTokens: UserWebhookTokenSummary[];
}

export default function WebhooksClient({ initialTokens }: Props) {
    const [tokens, setTokens] = useState(initialTokens);
    const [createModal, createModalCtl] = useDisclosure(false);
    const [tokenLabel, setTokenLabel] = useState('');
    const [busy, setBusy] = useState(false);
    const [issuedToken, setIssuedToken] = useState<string | null>(null);
    const clipboard = useClipboard({ timeout: 1500 });

    async function handleCreate() {
        setBusy(true);
        const r = await createWebhookToken(tokenLabel);
        setBusy(false);
        if (r.success && r.token) {
            setIssuedToken(r.token);
            setTokenLabel('');
            notifications.show({ color: 'green', title: '토큰 발급', message: '발급된 평문 토큰은 1회만 표시됩니다 — 안전한 곳에 저장하세요.' });
            // 목록 갱신
            setTokens(prev => [{
                id: r.id!,
                label: tokenLabel || null,
                enabled: true,
                masked: r.token!.slice(0, 4) + '…' + r.token!.slice(-4),
                createdAt: new Date(),
                lastUsedAt: null,
            }, ...prev]);
        } else {
            notifications.show({ color: 'red', title: '발급 실패', message: r.error || '' });
        }
    }

    async function handleToggle(id: string, enabled: boolean) {
        await toggleWebhookToken(id, enabled);
        setTokens(prev => prev.map(t => t.id === id ? { ...t, enabled } : t));
    }

    async function handleDelete(id: string) {
        if (!confirm('이 토큰을 삭제할까요? 사용 중이면 외부 연동이 즉시 중단됩니다.')) return;
        await deleteWebhookToken(id);
        setTokens(prev => prev.filter(t => t.id !== id));
        notifications.show({ color: 'gray', title: '삭제됨', message: '토큰이 영구 삭제됐어요.' });
    }

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const exampleEndpoint = issuedToken ? `${baseUrl}/api/webhook/${issuedToken}/publish` : '';

    return (
        <Container size="lg" py="xl">
            <Stack gap="lg">
                <Group justify="space-between">
                    <Stack gap={0}>
                        <Title order={2}><IconWebhook size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />외부 트리거 (Webhook)</Title>
                        <Text c="dimmed" size="sm">Zapier · Make · 자체 자동화에서 마케팅봇 캠페인을 즉시 트리거</Text>
                    </Stack>
                    <Button leftSection={<IconPlus size={16} />} onClick={() => { setIssuedToken(null); createModalCtl.open(); }}>
                        토큰 발급
                    </Button>
                </Group>

                <Alert color="blue" icon={<IconInfoCircle size={16} />}>
                    <Stack gap="xs">
                        <Text size="sm" fw={600}>Rate limit: 분당 60 · 일 200</Text>
                        <Text size="xs">
                            토큰별로 적용. 초과 시 HTTP 429 + 응답 헤더 <Code>X-RateLimit-*</Code> 에 잔여 노출.
                            토큰 1개당 외부 시스템 1개 연동 권장 (식별성·격리).
                        </Text>
                    </Stack>
                </Alert>

                <Paper withBorder p="md" radius="md">
                    <Title order={4} mb="sm">사용법</Title>
                    <Stack gap="xs">
                        <Text size="sm">
                            <Code>POST</Code> <Code>{baseUrl}/api/webhook/&lt;token&gt;/publish</Code>
                        </Text>
                        <Code block>{`{
  "content": "발행할 본문 (필수)",
  "channelIds": ["ch_xxx"],          // 옵션 — 미지정 시 ACTIVE 채널 모두
  "name": "캠페인 이름",             // 옵션
  "scheduledAt": "2026-05-04T09:00:00Z",  // 옵션 — 미지정 시 즉시
  "sourceLanguage": "ko",            // 옵션 — 기본 ko
  "autoTranslate": true              // 옵션 — 채널 language 다르면 자동 번역
}`}</Code>
                        <Text size="xs" c="dimmed">
                            응답: <Code>200 OK</Code> + <Code>{`{ ok: true, campaignId, taskCount, scheduledAt }`}</Code>.
                            <Code>GET</Code> 동일 경로로 헬스체크 (토큰 유효성만 확인).
                        </Text>
                    </Stack>
                </Paper>

                <Paper withBorder p="md" radius="md">
                    <Title order={4} mb="sm">발급된 토큰</Title>
                    {tokens.length === 0 ? (
                        <Text size="sm" c="dimmed">아직 발급된 토큰이 없어요. "토큰 발급" 버튼을 눌러 시작하세요.</Text>
                    ) : (
                        <Stack gap="sm">
                            {tokens.map((t) => (
                                <Paper key={t.id} withBorder p="sm" radius="sm">
                                    <Group justify="space-between">
                                        <Stack gap={2}>
                                            <Group gap="xs">
                                                <Code>{t.masked}</Code>
                                                {t.label && <Text size="sm" fw={500}>{t.label}</Text>}
                                                {!t.enabled && <Badge color="gray" size="xs">비활성</Badge>}
                                            </Group>
                                            <Text size="xs" c="dimmed">
                                                생성 {dayjs(t.createdAt).format('YYYY-MM-DD HH:mm')} · {t.lastUsedAt ? `마지막 사용 ${dayjs(t.lastUsedAt).format('YYYY-MM-DD HH:mm')}` : '미사용'}
                                            </Text>
                                        </Stack>
                                        <Group gap="xs">
                                            <Switch
                                                checked={t.enabled}
                                                onChange={(e) => handleToggle(t.id, e.currentTarget.checked)}
                                                size="sm"
                                                aria-label="활성화"
                                            />
                                            <Tooltip label="삭제 (되돌릴 수 없음)">
                                                <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(t.id)}>
                                                    <IconTrash size={16} />
                                                </ActionIcon>
                                            </Tooltip>
                                        </Group>
                                    </Group>
                                </Paper>
                            ))}
                        </Stack>
                    )}
                </Paper>
            </Stack>

            <Modal opened={createModal} onClose={createModalCtl.close} title={issuedToken ? '발급 완료 — 1회만 표시됩니다' : '새 Webhook 토큰 발급'} size="md">
                {!issuedToken ? (
                    <Stack gap="md">
                        <TextInput
                            label="라벨 (선택)"
                            description="식별용 — 어디에 쓸 토큰인지 (예: 'Zapier 연동', 'Make 자동화')"
                            placeholder="Zapier"
                            value={tokenLabel}
                            onChange={(e) => setTokenLabel(e.currentTarget.value)}
                            data-autofocus
                        />
                        <Group justify="flex-end">
                            <Button variant="subtle" onClick={createModalCtl.close}>취소</Button>
                            <Button onClick={handleCreate} loading={busy}>발급</Button>
                        </Group>
                    </Stack>
                ) : (
                    <Stack gap="md">
                        <Alert color="orange" title="⚠️ 한 번만 표시됩니다">
                            <Text size="sm">아래 평문 토큰을 안전한 곳에 즉시 저장하세요. 다시 볼 수 없습니다.</Text>
                        </Alert>
                        <Stack gap={4}>
                            <Text size="xs" c="dimmed">평문 토큰</Text>
                            <Group gap="xs">
                                <Code style={{ flex: 1, padding: 8 }}>{issuedToken}</Code>
                                <Button
                                    size="xs"
                                    leftSection={clipboard.copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                                    onClick={() => clipboard.copy(issuedToken)}
                                >
                                    {clipboard.copied ? '복사됨' : '복사'}
                                </Button>
                            </Group>
                        </Stack>
                        <Stack gap={4}>
                            <Text size="xs" c="dimmed">엔드포인트</Text>
                            <Code style={{ padding: 8, wordBreak: 'break-all' }}>{exampleEndpoint}</Code>
                        </Stack>
                        <Group justify="flex-end">
                            <Button onClick={() => { createModalCtl.close(); setIssuedToken(null); }}>완료</Button>
                        </Group>
                    </Stack>
                )}
            </Modal>
        </Container>
    );
}
