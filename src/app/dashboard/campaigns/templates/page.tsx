"use client";

import { useState } from 'react';
import {
    Container, Title, Text, Stack, Group, SimpleGrid, Paper, Badge, Button,
    SegmentedControl, Box, ThemeIcon
} from '@mantine/core';
import { IconArrowLeft, IconClock, IconBulb } from '@tabler/icons-react';
import Link from 'next/link';
import {
    CAMPAIGN_TEMPLATES,
    TEMPLATE_INDUSTRIES,
    type CampaignTemplate,
} from '@/lib/campaign-templates';

const CHANNEL_COLORS: Record<string, string> = {
    INSTAGRAM: 'pink',
    NAVER_BLOG: 'green',
    NAVER_CAFE: 'green',
    FACEBOOK: 'blue',
    THREADS: 'dark',
    X: 'gray',
    YOUTUBE: 'red',
    KAKAO: 'yellow',
    EMAIL: 'cyan',
    SMS: 'teal',
};

const CHANNEL_LABELS: Record<string, string> = {
    INSTAGRAM: 'Instagram',
    NAVER_BLOG: '네이버 블로그',
    NAVER_CAFE: '네이버 카페',
    FACEBOOK: 'Facebook',
    THREADS: 'Threads',
    X: 'X',
    YOUTUBE: 'YouTube',
    KAKAO: '카카오',
    EMAIL: '이메일',
    SMS: 'SMS',
};

export default function TemplatesGalleryPage() {
    const [filter, setFilter] = useState<string>('전체');

    const visible: CampaignTemplate[] =
        filter === '전체' ? CAMPAIGN_TEMPLATES : CAMPAIGN_TEMPLATES.filter(t => t.industry === filter);

    return (
        <Container size="xl" py="md">
            <Stack gap="lg">
                <Group justify="space-between" align="flex-end">
                    <Stack gap={0}>
                        <Group gap="xs">
                            <Button
                                component={Link}
                                href="/dashboard/campaigns/new"
                                variant="subtle"
                                size="xs"
                                leftSection={<IconArrowLeft size={14} />}
                            >
                                뒤로
                            </Button>
                        </Group>
                        <Group gap="sm">
                            <ThemeIcon variant="light" color="blue" size={36} radius="md">
                                <IconBulb size={20} />
                            </ThemeIcon>
                            <Stack gap={0}>
                                <Title order={2}>캠페인 템플릿</Title>
                                <Text size="sm" c="dimmed">
                                    업종별 검증된 템플릿으로 빠르게 캠페인을 시작하세요
                                </Text>
                            </Stack>
                        </Group>
                    </Stack>
                </Group>

                <SegmentedControl
                    fullWidth
                    value={filter}
                    onChange={setFilter}
                    data={['전체', ...TEMPLATE_INDUSTRIES]}
                    color="blue"
                />

                <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                    {visible.map(template => (
                        <Paper
                            key={template.id}
                            withBorder
                            p="lg"
                            radius="md"
                            style={{ display: 'flex', flexDirection: 'column' }}
                        >
                            <Stack gap="sm" style={{ flex: 1 }}>
                                <Group justify="space-between" align="flex-start">
                                    <Box style={{ fontSize: 36 }}>{template.icon}</Box>
                                    <Badge variant="light" color="gray" size="sm">
                                        {template.industry}
                                    </Badge>
                                </Group>

                                <Stack gap={4}>
                                    <Title order={4} size="h5">
                                        {template.title}
                                    </Title>
                                    <Text size="sm" c="dimmed" lineClamp={2}>
                                        {template.description}
                                    </Text>
                                </Stack>

                                <Box>
                                    <Text size="xs" fw={600} c="dimmed" mb={4}>
                                        추천 채널
                                    </Text>
                                    <Group gap={4} wrap="wrap">
                                        {template.suggestedChannels.map(ch => (
                                            <Badge
                                                key={ch}
                                                size="xs"
                                                color={CHANNEL_COLORS[ch] || 'gray'}
                                                variant="light"
                                            >
                                                {CHANNEL_LABELS[ch] || ch}
                                            </Badge>
                                        ))}
                                    </Group>
                                </Box>

                                <Group gap={4}>
                                    <IconClock size={12} color="var(--mantine-color-gray-6)" />
                                    <Text size="xs" c="dimmed">
                                        {template.suggestedTime}
                                    </Text>
                                </Group>
                            </Stack>

                            <Button
                                component={Link}
                                href={`/dashboard/campaigns/new?template=${template.id}`}
                                fullWidth
                                mt="md"
                                variant="light"
                            >
                                이 템플릿 사용하기
                            </Button>
                        </Paper>
                    ))}
                </SimpleGrid>

                {visible.length === 0 && (
                    <Paper withBorder p="xl" radius="md" ta="center">
                        <Text c="dimmed">선택한 업종에 등록된 템플릿이 없습니다</Text>
                    </Paper>
                )}
            </Stack>
        </Container>
    );
}
