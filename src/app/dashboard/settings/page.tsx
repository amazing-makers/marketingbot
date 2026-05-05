'use client';

import { Container, Title, Text, Stack, Paper, Group, ThemeIcon, Anchor, Button, SimpleGrid } from '@mantine/core';
import { IconBolt, IconBell, IconChevronRight, IconWebhook, IconDownload, IconFileSpreadsheet } from '@tabler/icons-react';
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

                {/* Phase 23 — 데이터 내보내기 */}
                <Paper withBorder p="md" radius="md">
                    <Group gap={6} mb="sm">
                        <IconFileSpreadsheet size={20} color="var(--mantine-color-teal-6)" />
                        <Title order={5}>📊 데이터 내보내기 (CSV)</Title>
                    </Group>
                    <Text size="xs" c="dimmed" mb="md">
                        활성 워크스페이스 기준 — Excel·Google Sheets 호환 (UTF-8 BOM 포함)
                    </Text>
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
                        <Button component="a" href="/api/export/campaigns" variant="light" leftSection={<IconDownload size={14} />} size="compact-sm">
                            캠페인
                        </Button>
                        <Button component="a" href="/api/export/channels" variant="light" leftSection={<IconDownload size={14} />} size="compact-sm">
                            채널
                        </Button>
                        <Button component="a" href="/api/export/tasks" variant="light" leftSection={<IconDownload size={14} />} size="compact-sm">
                            발행 이력
                        </Button>
                        <Button component="a" href="/api/export/invoices" variant="light" leftSection={<IconDownload size={14} />} size="compact-sm">
                            인보이스
                        </Button>
                    </SimpleGrid>
                </Paper>
            </Stack>
        </Container>
    );
}
