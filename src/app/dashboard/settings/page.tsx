'use client';

import { Container, Title, Text, Stack, Paper, Group, ThemeIcon, Anchor } from '@mantine/core';
import { IconBolt, IconBell, IconChevronRight, IconWebhook } from '@tabler/icons-react';
import Link from 'next/link';

const SECTIONS = [
    {
        href: '/dashboard/settings/ai',
        icon: IconBolt,
        color: 'violet',
        title: 'AI 엔진',
        desc: '캡션·번역·이미지 생성 엔진 + API 키 + 모델 + 예산',
    },
    {
        href: '/dashboard/settings/notifications',
        icon: IconBell,
        color: 'blue',
        title: '알림 설정',
        desc: '이메일 수신 여부 (가입·실패·주간 리포트)',
    },
    {
        href: '/dashboard/settings/webhooks',
        icon: IconWebhook,
        color: 'cyan',
        title: '외부 트리거 (Webhook)',
        desc: 'Zapier · Make · 자체 자동화에서 캠페인 즉시 트리거',
    },
];

export default function SettingsHomePage() {
    return (
        <Container size="md" py="xl">
            <Stack gap="lg">
                <div>
                    <Title order={2}>환경 설정</Title>
                    <Text c="dimmed" size="sm" mt={4}>
                        계정 및 마케팅봇 동작 설정을 한 곳에서 관리하세요.
                    </Text>
                </div>

                <Stack gap="sm">
                    {SECTIONS.map((s) => (
                        <Anchor key={s.href} component={Link} href={s.href} underline="never" c="inherit">
                            <Paper withBorder p="md" radius="md" style={{ cursor: 'pointer' }}>
                                <Group justify="space-between" wrap="nowrap">
                                    <Group gap="md" wrap="nowrap">
                                        <ThemeIcon size={42} radius="md" color={s.color} variant="light">
                                            <s.icon size={22} />
                                        </ThemeIcon>
                                        <div>
                                            <Text fw={700}>{s.title}</Text>
                                            <Text size="xs" c="dimmed">{s.desc}</Text>
                                        </div>
                                    </Group>
                                    <IconChevronRight size={18} color="#aaa" />
                                </Group>
                            </Paper>
                        </Anchor>
                    ))}
                </Stack>
            </Stack>
        </Container>
    );
}
