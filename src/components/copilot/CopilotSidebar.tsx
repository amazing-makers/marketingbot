'use client';

import {
    ActionIcon, Drawer, Stack, Text, Textarea, Button, Group, Box,
    Paper, Tooltip, ScrollArea, Avatar, Loader, UnstyledButton, rem
} from '@mantine/core';
import { IconSparkles, IconSend, IconX, IconUser, IconRobot, IconRefresh } from '@tabler/icons-react';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { chatWithCopilot } from '@/app/actions/copilotActions';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

const SUGGESTIONS = [
    '캠페인 작성 시 황금시간대 추천 받는 법?',
    'Discord 채널 추가하는 방법',
    '인스타그램 자동 발행은 어떻게?',
    '이번 달 콘텐츠 30개 자동 생성하려면?',
    'AI 이미지 생성 비용은?',
];

// 빠른 액션 — 클릭하면 해당 페이지로 이동 (대화 없이)
const QUICK_ACTIONS: Array<{ label: string; href: string; emoji: string }> = [
    { emoji: '✍️', label: '새 캠페인 작성', href: '/dashboard/campaigns/new' },
    { emoji: '🤖', label: '자동 발행 만들기', href: '/dashboard/campaigns/series/new' },
    { emoji: '📅', label: '콘텐츠 캘린더', href: '/dashboard/campaigns/calendar' },
    { emoji: '🌐', label: '채널 추가', href: '/dashboard/channels' },
    { emoji: '🤝', label: '파트너 대시보드', href: '/dashboard/partner' },
];

export default function CopilotSidebar() {
    const [opened, setOpened] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const pathname = usePathname();
    const scrollRef = useRef<HTMLDivElement>(null);

    // 새 메시지 들어올 때마다 자동 스크롤
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Alt+I 단축키로 토글
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.altKey && (e.key === 'i' || e.key === 'I')) {
                e.preventDefault();
                setOpened((o) => !o);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const send = async (textOverride?: string) => {
        const text = (textOverride ?? input).trim();
        if (!text || loading) return;

        const userMsg: Message = { role: 'user', content: text, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const r = await chatWithCopilot({
                message: text,
                context: { path: pathname || undefined },
            });
            const reply = r.success && r.reply
                ? r.reply
                : `❌ ${r.error || '응답을 받지 못했습니다.'}\n\n무료 AI 키 등록: /dashboard/settings/ai`;
            setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: Date.now() }]);
        } catch (e: any) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ 오류: ${e?.message || '알 수 없음'}`,
                timestamp: Date.now(),
            }]);
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        if (messages.length === 0) return;
        if (!confirm('대화 기록을 초기화하시겠습니까?')) return;
        setMessages([]);
    };

    return (
        <>
            {/* 우하단 floating 버튼 */}
            <Tooltip label="AI 코파일럿 (Alt+I)" position="left" withArrow>
                <ActionIcon
                    size={56}
                    radius="xl"
                    variant="filled"
                    color="violet"
                    onClick={() => setOpened(true)}
                    style={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 100,
                        boxShadow: '0 8px 24px rgba(124, 58, 237, 0.4)',
                        background: 'linear-gradient(135deg, var(--mantine-color-violet-6), var(--mantine-color-blue-6))',
                    }}
                    aria-label="AI 코파일럿"
                >
                    <IconSparkles size={24} stroke={1.7} color="white" />
                </ActionIcon>
            </Tooltip>

            {/* 우측 사이드바 채팅 */}
            <Drawer
                opened={opened}
                onClose={() => setOpened(false)}
                position="right"
                size={420}
                withCloseButton={false}
                padding={0}
                overlayProps={{ backgroundOpacity: 0.3 }}
                styles={{ body: { padding: 0, height: '100%', display: 'flex', flexDirection: 'column' } }}
            >
                {/* 헤더 */}
                <Box p="md" style={{
                    borderBottom: '1px solid var(--mantine-color-default-border)',
                    background: 'linear-gradient(135deg, var(--mantine-color-violet-0), var(--mantine-color-blue-0))',
                }}>
                    <Group justify="space-between">
                        <Group gap="xs">
                            <Avatar size="sm" radius="xl" color="violet" gradient={{ from: 'violet', to: 'blue' }}>
                                <IconSparkles size={14} stroke={2} />
                            </Avatar>
                            <div>
                                <Text fw={800} size="sm">AI 코파일럿</Text>
                                <Text size="10px" c="dimmed">마케팅봇 어시스턴트 · 무료</Text>
                            </div>
                        </Group>
                        <Group gap={4}>
                            <Tooltip label="대화 초기화" withArrow>
                                <ActionIcon variant="subtle" color="gray" onClick={reset} disabled={messages.length === 0}>
                                    <IconRefresh size={14} />
                                </ActionIcon>
                            </Tooltip>
                            <ActionIcon variant="subtle" color="gray" onClick={() => setOpened(false)}>
                                <IconX size={16} />
                            </ActionIcon>
                        </Group>
                    </Group>
                </Box>

                {/* 메시지 영역 */}
                <ScrollArea viewportRef={scrollRef} style={{ flex: 1 }} p="md">
                    {messages.length === 0 ? (
                        <Stack gap="md" py="xl">
                            <Stack gap={4} align="center">
                                <div style={{ fontSize: 40 }}>👋</div>
                                <Text fw={700} size="sm">무엇을 도와드릴까요?</Text>
                                <Text size="xs" c="dimmed" ta="center">
                                    캠페인 작성·채널 연동·AI 활용·결제 등 무엇이든 물어보세요.
                                </Text>
                            </Stack>
                            <Stack gap={6} mt="md">
                                <Text size="xs" fw={700} c="dimmed">⚡ 빠른 액션</Text>
                                <Group gap={4} wrap="wrap">
                                    {QUICK_ACTIONS.map((a) => (
                                        <UnstyledButton
                                            key={a.href}
                                            component="a"
                                            href={a.href}
                                            style={{
                                                padding: '6px 10px',
                                                borderRadius: 16,
                                                border: '1px solid var(--mantine-color-violet-3)',
                                                background: 'var(--mantine-color-violet-0)',
                                                fontSize: 11,
                                            }}
                                        >
                                            {a.emoji} {a.label}
                                        </UnstyledButton>
                                    ))}
                                </Group>
                            </Stack>
                            <Stack gap={6} mt="md">
                                <Text size="xs" fw={700} c="dimmed">💡 추천 질문</Text>
                                {SUGGESTIONS.map((s) => (
                                    <UnstyledButton
                                        key={s}
                                        onClick={() => send(s)}
                                        style={{
                                            padding: rem(8),
                                            borderRadius: 8,
                                            border: '1px solid var(--mantine-color-default-border)',
                                            background: 'var(--mantine-color-default)',
                                        }}
                                    >
                                        <Text size="xs">{s}</Text>
                                    </UnstyledButton>
                                ))}
                            </Stack>
                        </Stack>
                    ) : (
                        <Stack gap="md">
                            {messages.map((m, i) => (
                                <Group
                                    key={i}
                                    align="flex-start"
                                    gap="xs"
                                    wrap="nowrap"
                                    justify={m.role === 'user' ? 'flex-end' : 'flex-start'}
                                >
                                    {m.role === 'assistant' && (
                                        <Avatar size="sm" radius="xl" color="violet" gradient={{ from: 'violet', to: 'blue' }}>
                                            <IconRobot size={12} />
                                        </Avatar>
                                    )}
                                    <Paper
                                        p="sm"
                                        radius="md"
                                        style={{
                                            maxWidth: '85%',
                                            background: m.role === 'user'
                                                ? 'var(--mantine-color-blue-6)'
                                                : 'var(--mantine-color-default)',
                                            color: m.role === 'user' ? 'white' : undefined,
                                            border: m.role === 'assistant' ? '1px solid var(--mantine-color-default-border)' : undefined,
                                        }}
                                    >
                                        <Text size="xs" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                            {m.content}
                                        </Text>
                                    </Paper>
                                    {m.role === 'user' && (
                                        <Avatar size="sm" radius="xl" color="blue">
                                            <IconUser size={12} />
                                        </Avatar>
                                    )}
                                </Group>
                            ))}
                            {loading && (
                                <Group gap="xs">
                                    <Avatar size="sm" radius="xl" color="violet">
                                        <IconRobot size={12} />
                                    </Avatar>
                                    <Paper p="sm" radius="md" withBorder>
                                        <Group gap={4}>
                                            <Loader size={12} type="dots" color="violet" />
                                            <Text size="xs" c="dimmed">생각 중...</Text>
                                        </Group>
                                    </Paper>
                                </Group>
                            )}
                        </Stack>
                    )}
                </ScrollArea>

                {/* 입력창 */}
                <Box p="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                    <Group gap={6} align="flex-end" wrap="nowrap">
                        <Textarea
                            placeholder="메시지를 입력하세요... (Enter 전송, Shift+Enter 줄바꿈)"
                            value={input}
                            onChange={(e) => setInput(e.currentTarget.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    send();
                                }
                            }}
                            autosize
                            minRows={1}
                            maxRows={4}
                            style={{ flex: 1 }}
                            disabled={loading}
                        />
                        <ActionIcon
                            size="lg"
                            color="violet"
                            variant="filled"
                            onClick={() => send()}
                            disabled={loading || !input.trim()}
                            aria-label="전송"
                        >
                            <IconSend size={16} />
                        </ActionIcon>
                    </Group>
                    <Text size="9px" c="dimmed" mt={4} ta="center">
                        무료 AI (Gemini/Groq) 사용. 키 등록: <Text component="span" fw={700}>/dashboard/settings/ai</Text>
                    </Text>
                </Box>
            </Drawer>
        </>
    );
}
