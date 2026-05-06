'use client';

import {
    Stack, Group, Title, Text, Paper, Textarea, Button, Badge, Box,
    SimpleGrid, Card, ThemeIcon, Anchor, Alert, Container, Checkbox,
    Loader, Stepper,
} from '@mantine/core';
import {
    IconBolt, IconSparkles, IconRocket, IconCheck, IconX, IconArrowRight,
    IconWand, IconWorld, IconAlertCircle,
} from '@tabler/icons-react';
import { useState, useTransition } from 'react';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateCampaignCaption } from '@/app/actions/aiContentActions';
import { createCampaign } from '@/app/actions/campaignActions';

interface ChannelLite {
    id: string;
    type: string;
    accountName: string;
    status: string;
    region: string | null;
    language: string | null;
}

export default function QuickPublishClient({ channels }: { channels: ChannelLite[] }) {
    const router = useRouter();
    const [active, setActive] = useState(0);
    const [topic, setTopic] = useState('');
    const [generated, setGenerated] = useState('');
    const [selectedChannels, setSelectedChannels] = useState<Set<string>>(
        new Set(channels.map(c => c.id)) // 기본: 모든 채널 선택
    );
    const [generating, setGenerating] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [, startTransition] = useTransition();

    const handleGenerate = async () => {
        if (!topic.trim()) {
            notifications.show({ title: '입력', message: '주제를 입력해주세요', color: 'orange' });
            return;
        }
        setGenerating(true);
        try {
            // 첫 채널 1개만 캡션 생성에 사용 (Quick 모드 — 여러 채널은 동일 본문 발행)
            const firstChannel = channels[0];
            if (!firstChannel) {
                notifications.show({ title: '오류', message: '채널이 없어요', color: 'red' });
                return;
            }
            const r = await generateCampaignCaption({
                userHint: topic,
                channelIds: [firstChannel.id],
                language: firstChannel.language || 'ko',
            });
            if (!r.success || !r.captions) {
                throw new Error(r.error || 'AI 생성 실패');
            }
            const first = Object.values(r.captions)[0];
            const text = first?.text || '';
            const tags = first?.hashtags?.length ? '\n\n' + first.hashtags.map((t: string) => `#${t}`).join(' ') : '';
            setGenerated(text + tags);
            setActive(1);
        } catch (e: any) {
            notifications.show({ title: '오류', message: e?.message || 'AI 생성 실패', color: 'red' });
        } finally {
            setGenerating(false);
        }
    };

    const handlePublish = async () => {
        if (!generated.trim()) {
            notifications.show({ title: '입력', message: '본문이 비어있어요', color: 'orange' });
            return;
        }
        if (selectedChannels.size === 0) {
            notifications.show({ title: '입력', message: '발행할 채널을 1개 이상 선택하세요', color: 'orange' });
            return;
        }
        setPublishing(true);
        try {
            const r = await createCampaign({
                name: `[빠른발행] ${topic.slice(0, 30)}`,
                description: 'Quick Publish 모드로 작성',
                channelIds: Array.from(selectedChannels),
                content: generated,
                scheduledAt: new Date(),
                autoTranslate: true,
            });
            notifications.show({
                title: '🚀 발행 시작!',
                message: `${selectedChannels.size}개 채널에 즉시 발행됩니다`,
                color: 'teal',
                autoClose: 4000,
            });
            startTransition(() => {
                router.push(`/dashboard/campaigns/${r.id}`);
            });
        } catch (e: any) {
            notifications.show({ title: '오류', message: e?.message || '발행 실패', color: 'red' });
            setPublishing(false);
        }
    };

    const toggleChannel = (id: string) => {
        setSelectedChannels(s => {
            const n = new Set(s);
            if (n.has(id)) n.delete(id); else n.add(id);
            return n;
        });
    };

    return (
        <Container size="md" px={{ base: 0, sm: 'md' }}>
            <Stack gap="md">
                <Stack gap={2}>
                    <Group gap={6}>
                        <IconBolt size={28} color="var(--mantine-color-orange-6)" />
                        <Title order={2}>5분 빠른 발행</Title>
                    </Group>
                    <Text size="sm" c="dimmed">
                        주제만 입력하면 AI 가 캡션을 자동 생성하고 모든 채널에 즉시 발행해요.
                        <Anchor component={Link} href="/dashboard/campaigns/new" size="sm" ml={6}>
                            (전체 옵션 보기)
                        </Anchor>
                    </Text>
                </Stack>

                {channels.length === 0 ? (
                    <Alert color="orange" icon={<IconAlertCircle size={16} />} title="채널 연결 필요">
                        빠른 발행을 사용하려면 먼저 채널을 1개 이상 연결해야 해요.
                        <Anchor component={Link} href="/dashboard/channels" ml={6}>
                            채널 연결하러 가기 →
                        </Anchor>
                    </Alert>
                ) : (
                    <>
                        <Stepper active={active} onStepClick={setActive} size="sm">
                            <Stepper.Step label="주제 입력" icon={<IconWand size={14} />}>
                                <Stack gap="md" pt="md">
                                    <Paper withBorder p="md" radius="md">
                                        <Text fw={700} size="sm" mb="xs">📝 무엇을 발행할까요?</Text>
                                        <Textarea
                                            placeholder={'예: 신메뉴 바닐라 라떼 출시 알림 — 부드럽고 달콤한 톤\n예: 주말 30% 할인 이벤트 안내 — 긴급한 톤'}
                                            value={topic}
                                            onChange={(e) => setTopic(e.currentTarget.value)}
                                            autosize
                                            minRows={3}
                                            maxRows={6}
                                        />
                                        <Text size="11px" c="dimmed" mt={4}>
                                            💡 <strong>업종·대상·톤·핵심 메시지</strong>를 한 줄로 적으면 AI 가 더 정확한 캡션을 만들어요
                                        </Text>
                                    </Paper>
                                    <Group justify="flex-end">
                                        <Button
                                            leftSection={<IconSparkles size={16} />}
                                            color="violet"
                                            size="md"
                                            onClick={handleGenerate}
                                            loading={generating}
                                            disabled={!topic.trim()}
                                        >
                                            AI 캡션 생성
                                        </Button>
                                    </Group>
                                </Stack>
                            </Stepper.Step>

                            <Stepper.Step label="확인 + 발행" icon={<IconRocket size={14} />}>
                                <Stack gap="md" pt="md">
                                    <Paper withBorder p="md" radius="md">
                                        <Group justify="space-between" mb="xs">
                                            <Text fw={700} size="sm">✨ AI 가 만든 캡션</Text>
                                            <Button
                                                size="compact-xs"
                                                variant="subtle"
                                                onClick={handleGenerate}
                                                loading={generating}
                                                leftSection={<IconWand size={11} />}
                                            >
                                                다시 만들기
                                            </Button>
                                        </Group>
                                        <Textarea
                                            value={generated}
                                            onChange={(e) => setGenerated(e.currentTarget.value)}
                                            autosize
                                            minRows={5}
                                            maxRows={15}
                                        />
                                        <Text size="11px" c="dimmed" mt={4}>
                                            💡 자유롭게 수정 가능. 채널 언어가 다르면 발행 시 자동 번역됩니다.
                                        </Text>
                                    </Paper>

                                    <Paper withBorder p="md" radius="md">
                                        <Group justify="space-between" mb="xs">
                                            <Text fw={700} size="sm">🌐 발행할 채널 ({selectedChannels.size}/{channels.length})</Text>
                                            <Group gap="xs">
                                                <Button
                                                    size="compact-xs"
                                                    variant="subtle"
                                                    onClick={() => setSelectedChannels(new Set(channels.map(c => c.id)))}
                                                >
                                                    모두 선택
                                                </Button>
                                                <Button
                                                    size="compact-xs"
                                                    variant="subtle"
                                                    color="gray"
                                                    onClick={() => setSelectedChannels(new Set())}
                                                >
                                                    해제
                                                </Button>
                                            </Group>
                                        </Group>
                                        <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
                                            {channels.map(ch => {
                                                const isSelected = selectedChannels.has(ch.id);
                                                return (
                                                    <Card
                                                        key={ch.id}
                                                        withBorder
                                                        p="xs"
                                                        radius="md"
                                                        onClick={() => toggleChannel(ch.id)}
                                                        style={{
                                                            cursor: 'pointer',
                                                            borderColor: isSelected ? 'var(--mantine-color-violet-6)' : undefined,
                                                            background: isSelected ? 'var(--mantine-color-violet-0)' : undefined,
                                                        }}
                                                    >
                                                        <Group gap={6} wrap="nowrap">
                                                            <Checkbox
                                                                checked={isSelected}
                                                                onChange={() => toggleChannel(ch.id)}
                                                                size="xs"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                            <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                                                                <Text size="11px" fw={700} truncate>{ch.type}</Text>
                                                                <Text size="10px" c="dimmed" truncate>{ch.accountName}</Text>
                                                            </Stack>
                                                        </Group>
                                                    </Card>
                                                );
                                            })}
                                        </SimpleGrid>
                                    </Paper>

                                    <Group justify="space-between">
                                        <Button variant="default" onClick={() => setActive(0)}>← 다시</Button>
                                        <Button
                                            leftSection={<IconRocket size={16} />}
                                            color="orange"
                                            size="md"
                                            onClick={handlePublish}
                                            loading={publishing}
                                            disabled={!generated.trim() || selectedChannels.size === 0}
                                        >
                                            {selectedChannels.size}개 채널 즉시 발행
                                        </Button>
                                    </Group>
                                </Stack>
                            </Stepper.Step>
                        </Stepper>
                    </>
                )}
            </Stack>
        </Container>
    );
}
