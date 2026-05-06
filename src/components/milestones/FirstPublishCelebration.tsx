'use client';

import { Modal, Stack, Group, Text, Button, Box, ThemeIcon, SimpleGrid, Card, Anchor } from '@mantine/core';
import { IconRocket, IconCalendarMonth, IconBolt, IconBookmark, IconShare3, IconCheck } from '@tabler/icons-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { checkFirstPublishMilestone, markFirstPublishCelebrated } from '@/app/actions/milestoneActions';

/**
 * Phase 43 — 첫 발행 SUCCESS 자동 감지 + 축하 모달.
 *
 * 대시보드에서 마운트되어 자동으로 milestone 체크.
 * 영구 1회 표시 (emailPreferences.firstPublishCelebrated 플래그).
 */
export default function FirstPublishCelebration() {
    const [opened, setOpened] = useState(false);
    const [data, setData] = useState<Awaited<ReturnType<typeof checkFirstPublishMilestone>> | null>(null);

    useEffect(() => {
        let cancelled = false;
        // 페이지 로드 직후 체크
        const t = setTimeout(async () => {
            try {
                const r = await checkFirstPublishMilestone();
                if (cancelled) return;
                setData(r);
                if (r.achieved && !r.alreadyCelebrated) {
                    setOpened(true);
                }
            } catch { /* ignore */ }
        }, 1000);
        return () => { cancelled = true; clearTimeout(t); };
    }, []);

    const handleClose = async () => {
        setOpened(false);
        try {
            await markFirstPublishCelebrated();
        } catch { /* ignore */ }
    };

    if (!data) return null;
    const successCount = data.successCount;
    const hasMultipleChannels = data.channelCount > 1;
    const hasNoSeries = data.seriesCount === 0;

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            size="md"
            withCloseButton={false}
            centered
        >
            <Stack gap="md" align="center" py="md">
                <Box style={{ fontSize: 64 }}>🎉</Box>
                <Stack gap={4} align="center">
                    <Text fw={900} size="22px" ta="center">
                        축하합니다! 첫 발행 성공!
                    </Text>
                    <Text c="dimmed" size="sm" ta="center">
                        지금까지 <strong style={{ color: 'var(--mantine-color-violet-7)' }}>{successCount}건</strong> 발행 성공.
                        앞으로의 마케팅 자동화를 응원합니다 ✨
                    </Text>
                </Stack>

                {/* 다음 단계 추천 */}
                <Stack gap="sm" w="100%" mt="md">
                    <Text fw={700} size="sm" c="dimmed">💡 이제 다음 단계를 시도해보세요</Text>

                    <SimpleGrid cols={1} spacing="xs">
                        {hasNoSeries && (
                            <Card
                                withBorder
                                p="sm"
                                radius="md"
                                component={Link}
                                href="/dashboard/campaigns/series/new"
                                style={{
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    cursor: 'pointer',
                                    borderColor: 'var(--mantine-color-violet-3)',
                                }}
                                onClick={handleClose}
                            >
                                <Group gap="sm" wrap="nowrap">
                                    <ThemeIcon size={36} radius="md" color="violet" variant="light">
                                        <IconBolt size={18} />
                                    </ThemeIcon>
                                    <Stack gap={0} style={{ flex: 1 }}>
                                        <Text fw={700} size="sm">자동 발행 시리즈 만들기</Text>
                                        <Text size="11px" c="dimmed">
                                            한 번 설정하면 며칠·몇 주 자동으로 게시물 발행
                                        </Text>
                                    </Stack>
                                    <Text size="xs" c="violet">→</Text>
                                </Group>
                            </Card>
                        )}

                        {!hasMultipleChannels && (
                            <Card
                                withBorder
                                p="sm"
                                radius="md"
                                component={Link}
                                href="/dashboard/channels"
                                style={{
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    cursor: 'pointer',
                                }}
                                onClick={handleClose}
                            >
                                <Group gap="sm" wrap="nowrap">
                                    <ThemeIcon size={36} radius="md" color="blue" variant="light">
                                        <IconShare3 size={18} />
                                    </ThemeIcon>
                                    <Stack gap={0} style={{ flex: 1 }}>
                                        <Text fw={700} size="sm">채널 더 추가하기</Text>
                                        <Text size="11px" c="dimmed">
                                            여러 SNS 동시 발행으로 reach 2-5배 증가
                                        </Text>
                                    </Stack>
                                    <Text size="xs" c="blue">→</Text>
                                </Group>
                            </Card>
                        )}

                        <Card
                            withBorder
                            p="sm"
                            radius="md"
                            component={Link}
                            href="/dashboard/library"
                            style={{
                                textDecoration: 'none',
                                color: 'inherit',
                                cursor: 'pointer',
                            }}
                            onClick={handleClose}
                        >
                            <Group gap="sm" wrap="nowrap">
                                <ThemeIcon size={36} radius="md" color="grape" variant="light">
                                    <IconBookmark size={18} />
                                </ThemeIcon>
                                <Stack gap={0} style={{ flex: 1 }}>
                                    <Text fw={700} size="sm">콘텐츠 라이브러리에 패턴 저장</Text>
                                    <Text size="11px" c="dimmed">
                                        자주 쓰는 캡션·해시태그 저장하면 다음 발행 30초로 단축
                                    </Text>
                                </Stack>
                                <Text size="xs" c="grape">→</Text>
                            </Group>
                        </Card>

                        <Card
                            withBorder
                            p="sm"
                            radius="md"
                            component={Link}
                            href="/dashboard/campaigns/calendar"
                            style={{
                                textDecoration: 'none',
                                color: 'inherit',
                                cursor: 'pointer',
                            }}
                            onClick={handleClose}
                        >
                            <Group gap="sm" wrap="nowrap">
                                <ThemeIcon size={36} radius="md" color="teal" variant="light">
                                    <IconCalendarMonth size={18} />
                                </ThemeIcon>
                                <Stack gap={0} style={{ flex: 1 }}>
                                    <Text fw={700} size="sm">캘린더에서 한눈에 보기</Text>
                                    <Text size="11px" c="dimmed">
                                        월간 발행 일정을 시각적으로 관리
                                    </Text>
                                </Stack>
                                <Text size="xs" c="teal">→</Text>
                            </Group>
                        </Card>
                    </SimpleGrid>
                </Stack>

                <Group justify="center" mt="md">
                    <Button
                        leftSection={<IconCheck size={16} />}
                        variant="light"
                        color="gray"
                        onClick={handleClose}
                    >
                        나중에 할게요
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
