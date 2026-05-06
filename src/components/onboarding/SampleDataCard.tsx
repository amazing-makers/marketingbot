'use client';

import { Paper, Group, Text, Button, Badge, Box, Stack } from '@mantine/core';
import { IconWand, IconTrash, IconSparkles } from '@tabler/icons-react';
import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import { createSampleData, cleanupSampleData, hasSampleData } from '@/app/actions/sampleDataActions';

/**
 * Phase 44 — 신규 사용자용 "샘플로 둘러보기" 카드.
 *
 * 캠페인·시리즈·채널이 모두 0개일 때 대시보드에 표시.
 * 클릭 → 샘플 데이터 자동 생성. 한 번 더 누르면 정리.
 */
export default function SampleDataCard({
    channelCount,
    campaignCount,
    seriesCount,
}: {
    channelCount: number;
    campaignCount: number;
    seriesCount: number;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [hasSample, setHasSample] = useState<boolean | null>(null);

    useEffect(() => {
        // 샘플 데이터 존재 여부 체크
        hasSampleData().then(setHasSample).catch(() => setHasSample(false));
    }, []);

    // 데이터가 이미 있으면 (실제 사용 중) 카드 숨김. 단, 샘플 보유 중일 땐 정리 카드는 표시.
    if (hasSample === null) return null;
    if (!hasSample && (channelCount > 0 || campaignCount > 0 || seriesCount > 0)) return null;

    const handleCreate = () => {
        startTransition(async () => {
            try {
                const r = await createSampleData();
                notifications.show({
                    title: '✨ 샘플 데이터 준비 완료',
                    message: `샘플 채널 1개 + 캠페인 ${r.campaignsCreated}개 + 시리즈 ${r.seriesCreated}개 생성됨`,
                    color: 'violet',
                    autoClose: 5000,
                });
                setHasSample(true);
                router.refresh();
            } catch (e: any) {
                notifications.show({ title: '오류', message: e?.message || '실패', color: 'red' });
            }
        });
    };

    const handleCleanup = () => {
        if (!confirm('샘플 데이터를 모두 삭제할까요? 본인이 작성한 캠페인은 유지돼요.')) return;
        startTransition(async () => {
            try {
                const r = await cleanupSampleData();
                notifications.show({
                    title: '🧹 샘플 데이터 정리 완료',
                    message: `채널 ${r.channelsDeleted}개 · 캠페인 ${r.campaignsDeleted}개 · 시리즈 ${r.seriesDeleted}개 삭제됨`,
                    color: 'gray',
                });
                setHasSample(false);
                router.refresh();
            } catch (e: any) {
                notifications.show({ title: '오류', message: e?.message || '실패', color: 'red' });
            }
        });
    };

    if (hasSample) {
        return (
            <Paper withBorder p="md" radius="md" mb="md" bg="var(--mantine-color-yellow-0)" style={{ borderColor: 'var(--mantine-color-yellow-3)' }}>
                <Group justify="space-between" wrap="wrap">
                    <Group gap="sm">
                        <Box style={{ fontSize: 24 }}>👀</Box>
                        <Stack gap={0}>
                            <Text fw={700} size="sm">샘플 데이터로 둘러보는 중</Text>
                            <Text size="xs" c="dimmed">
                                실제 발행은 안 돼요 (샘플 채널은 인증 미완료). 익숙해지면 정리 후 본인 데이터로 시작하세요.
                            </Text>
                        </Stack>
                    </Group>
                    <Button
                        size="xs"
                        variant="light"
                        color="red"
                        leftSection={<IconTrash size={14} />}
                        onClick={handleCleanup}
                        loading={isPending}
                    >
                        샘플 모두 정리
                    </Button>
                </Group>
            </Paper>
        );
    }

    return (
        <Paper withBorder p="lg" radius="md" mb="md" style={{
            background: 'linear-gradient(135deg, var(--mantine-color-violet-0), var(--mantine-color-blue-0))',
            borderColor: 'var(--mantine-color-violet-3)',
        }}>
            <Group justify="space-between" wrap="wrap" gap="md">
                <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                    <Group gap={6}>
                        <IconWand size={20} color="var(--mantine-color-violet-6)" />
                        <Text fw={700}>샘플 데이터로 먼저 둘러보세요</Text>
                        <Badge size="xs" color="violet" variant="light">신규 추천</Badge>
                    </Group>
                    <Text size="sm" c="dimmed">
                        실제 채널 연결 전에 어떻게 작동하는지 미리 둘러볼 수 있어요.
                        샘플 캠페인 3개 + 시리즈 1개가 자동으로 만들어져서 인터페이스를 익히기 편해요.
                        나중에 한 번에 정리 가능.
                    </Text>
                </Stack>
                <Button
                    leftSection={<IconSparkles size={16} />}
                    color="violet"
                    onClick={handleCreate}
                    loading={isPending}
                >
                    샘플로 둘러보기
                </Button>
            </Group>
        </Paper>
    );
}
