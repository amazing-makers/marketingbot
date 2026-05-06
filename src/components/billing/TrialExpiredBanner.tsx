'use client';

import { Alert, Group, Text, Button, ActionIcon, Stack, Anchor } from '@mantine/core';
import { IconAlertTriangle, IconX, IconRocket, IconShield } from '@tabler/icons-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Props {
    daysSinceExpired: number;
    expiredAt: string; // ISO
}

const HIDDEN_KEY_PREFIX = 'amakers_trial_expired_banner_hidden_';

/**
 * Phase 44 — 트라이얼 만료 후 grace period 안내 배너.
 *
 * 만료 후 ~90일 동안 표시 (사용자 데이터 안심).
 * 7일 단위로 hidden 토큰 갱신 (사용자가 X 누르면 7일 숨김).
 */
export default function TrialExpiredBanner({ daysSinceExpired, expiredAt }: Props) {
    const [hidden, setHidden] = useState(true);

    useEffect(() => {
        if (daysSinceExpired < 0 || daysSinceExpired > 90) return;
        const hiddenKey = HIDDEN_KEY_PREFIX + Math.floor(daysSinceExpired / 7);
        try {
            const saved = localStorage.getItem(hiddenKey);
            if (saved) {
                const ts = parseInt(saved, 10);
                if (Date.now() - ts < 7 * 24 * 60 * 60 * 1000) {
                    setHidden(true);
                    return;
                }
            }
            setHidden(false);
        } catch { /* ignore */ }
    }, [daysSinceExpired]);

    if (hidden) return null;
    if (daysSinceExpired < 0 || daysSinceExpired > 90) return null;

    const dismiss = () => {
        const hiddenKey = HIDDEN_KEY_PREFIX + Math.floor(daysSinceExpired / 7);
        try { localStorage.setItem(hiddenKey, String(Date.now())); } catch { /* ignore */ }
        setHidden(true);
    };

    const remainingPreservation = Math.max(0, 90 - daysSinceExpired);
    const expDate = new Date(expiredAt).toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric',
    });

    // 30일 이내 vs 30일 초과 — 분리 카피
    const isUrgent = daysSinceExpired > 30;

    return (
        <Alert
            color={isUrgent ? 'red' : 'orange'}
            radius="md"
            mb="md"
            icon={<IconAlertTriangle size={18} />}
            title={
                <Group justify="space-between" wrap="nowrap">
                    <Text fw={700}>
                        {isUrgent
                            ? `⚠️ 체험 종료 후 ${daysSinceExpired}일 — 데이터 정리 임박`
                            : `📂 체험 종료 — 데이터는 안전하게 보관 중`}
                    </Text>
                    <ActionIcon size="sm" variant="subtle" color="gray" onClick={dismiss}>
                        <IconX size={14} />
                    </ActionIcon>
                </Group>
            }
        >
            <Stack gap={6} mt={4}>
                <Group gap={6} wrap="wrap">
                    <IconShield size={14} color="var(--mantine-color-teal-6)" />
                    <Text size="sm">
                        <strong>데이터는 안전합니다.</strong> 채널 · 캠페인 · 시리즈 모두 유지 중이에요 ({expDate} 만료).
                    </Text>
                </Group>
                <Text size="sm">
                    {isUrgent
                        ? `만료 후 90일이 지나면 비활성 데이터가 자동 정리됩니다 (남은 ${remainingPreservation}일). 결제하시면 즉시 모든 데이터 복구 + 자동 발행 재개.`
                        : `현재 FREE 플랜으로 강등되어 일부 기능이 제한 중입니다 (채널 2개, 일일 task 5개). 결제 시 즉시 풀 기능으로 복구.`}
                </Text>
                <Group justify="flex-end" mt={4}>
                    <Anchor component={Link} href="/help" size="xs" c="dimmed">
                        자세히 보기
                    </Anchor>
                    <Button
                        component={Link}
                        href="/dashboard/settings/billing"
                        color={isUrgent ? 'red' : 'orange'}
                        size="xs"
                        leftSection={<IconRocket size={14} />}
                    >
                        지금 결제하고 복구
                    </Button>
                </Group>
            </Stack>
        </Alert>
    );
}
