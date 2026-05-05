'use client';

import { Paper, Group, Text, Progress, Stack, Box, Anchor, ActionIcon, Tooltip, Button } from '@mantine/core';
import { IconCheck, IconChevronRight, IconChevronDown, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSetupChecklist } from '@/app/actions/setupChecklistActions';

interface ChecklistItem {
    id: string;
    title: string;
    desc: string;
    done: boolean;
    href: string;
    emoji: string;
}

const HIDDEN_KEY = 'amakers_checklist_hidden';

export default function SetupChecklist() {
    const [items, setItems] = useState<ChecklistItem[]>([]);
    const [completed, setCompleted] = useState(0);
    const [total, setTotal] = useState(0);
    const [percent, setPercent] = useState(0);
    const [hidden, setHidden] = useState(false);
    const [expanded, setExpanded] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try { if (localStorage.getItem(HIDDEN_KEY) === '1') setHidden(true); } catch { /* ignore */ }
        getSetupChecklist()
            .then(r => {
                setItems(r.items);
                setCompleted(r.completed);
                setTotal(r.total);
                setPercent(r.percent);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading || hidden) return null;
    // 100% 완료 시 자동 숨김
    if (total > 0 && completed === total) return null;

    const dismiss = () => {
        try { localStorage.setItem(HIDDEN_KEY, '1'); } catch { /* ignore */ }
        setHidden(true);
    };

    return (
        <Paper withBorder p="md" radius="md" mb="md" style={{
            background: 'light-dark(linear-gradient(135deg, #faf5ff 0%, #eff6ff 100%), linear-gradient(135deg, var(--mantine-color-violet-9) 0%, var(--mantine-color-blue-9) 100%))',
        }}>
            <Group justify="space-between" mb="xs">
                <Group gap="sm">
                    <Text size="lg">🚀</Text>
                    <Stack gap={0}>
                        <Text fw={700} size="sm">시작하기 ({completed}/{total} 완료)</Text>
                        <Text size="xs" c="dimmed">단계별로 진행하면 마케팅봇 기능을 빠르게 활용할 수 있어요</Text>
                    </Stack>
                </Group>
                <Group gap={4}>
                    <ActionIcon size="sm" variant="subtle" onClick={() => setExpanded(e => !e)}>
                        {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                    </ActionIcon>
                    <Tooltip label="이 가이드 숨기기 (다시 표시는 localStorage 정리 후)">
                        <ActionIcon size="sm" variant="subtle" color="gray" onClick={dismiss}>
                            <IconX size={12} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Group>
            <Progress value={percent} color="violet" size="sm" mb="md" />

            {expanded && (<>
                <Stack gap={6}>
                    {items.map(item => (
                        <Anchor
                            key={item.id}
                            component={Link}
                            href={item.href}
                            underline="never"
                            c="inherit"
                        >
                            <Box style={{
                                padding: 8,
                                borderRadius: 6,
                                background: item.done ? 'var(--mantine-color-teal-0)' : 'var(--mantine-color-body)',
                                border: `1px solid ${item.done ? 'var(--mantine-color-teal-3)' : 'var(--mantine-color-default-border)'}`,
                                cursor: 'pointer',
                                opacity: item.done ? 0.7 : 1,
                            }}>
                                <Group justify="space-between" wrap="nowrap">
                                    <Group gap={8} wrap="nowrap">
                                        {item.done ? (
                                            <Box style={{
                                                width: 22, height: 22, borderRadius: '50%',
                                                background: 'var(--mantine-color-teal-6)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <IconCheck size={14} color="white" />
                                            </Box>
                                        ) : (
                                            <Text size="lg">{item.emoji}</Text>
                                        )}
                                        <Stack gap={0}>
                                            <Text size="sm" fw={item.done ? 500 : 700} td={item.done ? 'line-through' : undefined}>
                                                {item.title}
                                            </Text>
                                            <Text size="11px" c="dimmed">{item.desc}</Text>
                                        </Stack>
                                    </Group>
                                    {!item.done && <IconChevronRight size={14} />}
                                </Group>
                            </Box>
                        </Anchor>
                    ))}
                </Stack>
                {percent === 100 && (
                    <Group justify="center" mt="md">
                        <Button size="compact-sm" variant="light" color="teal" leftSection={<IconCheck size={14} />} onClick={dismiss}>
                            🎉 모두 완료! 가이드 숨기기
                        </Button>
                    </Group>
                )}
            </>)}
        </Paper>
    );
}
