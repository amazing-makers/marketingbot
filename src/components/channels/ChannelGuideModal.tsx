'use client';

import {
    Modal, Stack, Group, Text, Badge, Box, Title, Anchor, Stepper, Paper, List, Accordion,
    SimpleGrid, Card, ThemeIcon, Button,
} from '@mantine/core';
import {
    IconInfoCircle, IconHelpCircle, IconAlertTriangle, IconClock, IconCheck,
} from '@tabler/icons-react';
import { useState } from 'react';
import { CHANNEL_GUIDE_LIST, CHANNEL_GUIDES, type ChannelGuide } from '@/lib/onboarding/channel-guides';

interface Props {
    opened: boolean;
    onClose: () => void;
    /** 처음 열 때 미리 선택할 채널 type. 없으면 목록 표시 */
    initialType?: string | null;
}

const DIFFICULTY_LABEL: Record<string, { label: string; color: string }> = {
    easy: { label: '쉬움', color: 'teal' },
    medium: { label: '보통', color: 'orange' },
    hard: { label: '어려움', color: 'red' },
};

/**
 * Phase 42 — 채널 연결 가이드 모달.
 * 처음 열면 채널 목록 → 채널 클릭 시 단계별 가이드 표시.
 * initialType 이 주어지면 바로 해당 채널 가이드 표시.
 */
export default function ChannelGuideModal({ opened, onClose, initialType }: Props) {
    const [selected, setSelected] = useState<ChannelGuide | null>(
        initialType && CHANNEL_GUIDES[initialType] ? CHANNEL_GUIDES[initialType] : null,
    );

    const handleClose = () => {
        setSelected(null);
        onClose();
    };

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={
                <Group gap={6}>
                    {selected ? (
                        <>
                            <Anchor component="button" type="button" size="sm" onClick={() => setSelected(null)}>
                                ← 채널 목록
                            </Anchor>
                            <Text fw={700}>· {selected.emoji} {selected.label} 가이드</Text>
                        </>
                    ) : (
                        <>
                            <IconInfoCircle size={20} />
                            <Text fw={700}>채널 연결 가이드</Text>
                        </>
                    )}
                </Group>
            }
            size="lg"
        >
            {!selected && (
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        연결하실 채널을 선택하세요. 단계별 가이드와 자주 묻는 질문을 확인할 수 있어요.
                    </Text>
                    <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="sm">
                        {CHANNEL_GUIDE_LIST.map(g => (
                            <Card
                                key={g.type}
                                withBorder
                                p="sm"
                                radius="md"
                                style={{ cursor: 'pointer' }}
                                onClick={() => setSelected(g)}
                            >
                                <Stack gap={4} align="center">
                                    <Text size="28px">{g.emoji}</Text>
                                    <Text fw={700} size="sm">{g.label}</Text>
                                    <Group gap={4}>
                                        <Badge size="xs" color={DIFFICULTY_LABEL[g.difficulty].color} variant="light">
                                            {DIFFICULTY_LABEL[g.difficulty].label}
                                        </Badge>
                                        <Badge size="xs" variant="light" color="gray" leftSection={<IconClock size={10} />}>
                                            {g.timeEstimate}
                                        </Badge>
                                    </Group>
                                </Stack>
                            </Card>
                        ))}
                    </SimpleGrid>
                </Stack>
            )}

            {selected && (
                <Stack gap="md">
                    {/* 헤더 정보 */}
                    <Group gap="md">
                        <Text size="40px">{selected.emoji}</Text>
                        <Stack gap={2} style={{ flex: 1 }}>
                            <Text fw={700}>{selected.label}</Text>
                            <Text size="xs" c="dimmed">{selected.description}</Text>
                            <Group gap={4} mt={4}>
                                <Badge size="xs" color={DIFFICULTY_LABEL[selected.difficulty].color} variant="light">
                                    난이도: {DIFFICULTY_LABEL[selected.difficulty].label}
                                </Badge>
                                <Badge size="xs" variant="light" color="gray" leftSection={<IconClock size={10} />}>
                                    예상 소요: {selected.timeEstimate}
                                </Badge>
                            </Group>
                        </Stack>
                    </Group>

                    {/* 준비물 */}
                    <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-default-hover)">
                        <Text fw={700} size="xs" mb={4}>📋 준비물</Text>
                        <List size="xs" spacing={2} pl="md">
                            {selected.requirements.map((r, i) => (
                                <List.Item key={i}>{r}</List.Item>
                            ))}
                        </List>
                    </Paper>

                    {/* 단계별 가이드 */}
                    <Paper withBorder p="md" radius="md">
                        <Text fw={700} size="sm" mb="sm">📝 단계별 가이드</Text>
                        <Stack gap="md">
                            {selected.steps.map((step, i) => (
                                <Group key={i} gap={12} align="flex-start" wrap="nowrap">
                                    <ThemeIcon size={28} radius="xl" variant="light" color="violet">
                                        <Text size="xs" fw={800}>{i + 1}</Text>
                                    </ThemeIcon>
                                    <Stack gap={2} style={{ flex: 1 }}>
                                        <Text fw={700} size="sm">{step.title}</Text>
                                        <Text size="xs" c="dimmed">{step.detail}</Text>
                                        {step.tip && (
                                            <Box style={{
                                                background: 'var(--mantine-color-yellow-0)',
                                                border: '1px solid var(--mantine-color-yellow-3)',
                                                padding: 6,
                                                borderRadius: 4,
                                                marginTop: 4,
                                            }}>
                                                <Text size="11px" c="yellow.9">💡 {step.tip}</Text>
                                            </Box>
                                        )}
                                    </Stack>
                                </Group>
                            ))}
                        </Stack>
                    </Paper>

                    {/* 주의사항 */}
                    {selected.notes.length > 0 && (
                        <Paper withBorder p="sm" radius="md" bg="var(--mantine-color-orange-0)">
                            <Group gap={4} mb={4}>
                                <IconAlertTriangle size={14} color="var(--mantine-color-orange-7)" />
                                <Text fw={700} size="xs" c="orange.9">참고사항</Text>
                            </Group>
                            <Stack gap={2}>
                                {selected.notes.map((n, i) => (
                                    <Text key={i} size="11px" c="orange.9">{n}</Text>
                                ))}
                            </Stack>
                        </Paper>
                    )}

                    {/* FAQ */}
                    {selected.faqs.length > 0 && (
                        <Accordion variant="separated" radius="md">
                            {selected.faqs.map((f, i) => (
                                <Accordion.Item key={i} value={`faq-${i}`}>
                                    <Accordion.Control icon={<IconHelpCircle size={14} />}>
                                        <Text size="sm" fw={600}>{f.q}</Text>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <Text size="xs" c="dimmed">{f.a}</Text>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            ))}
                        </Accordion>
                    )}

                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={() => setSelected(null)}>
                            다른 채널 보기
                        </Button>
                        <Button color="violet" leftSection={<IconCheck size={14} />} onClick={handleClose}>
                            확인
                        </Button>
                    </Group>
                </Stack>
            )}
        </Modal>
    );
}
