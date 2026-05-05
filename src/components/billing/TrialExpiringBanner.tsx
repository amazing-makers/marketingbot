'use client';

import { Alert, Group, Text, Button, ActionIcon } from '@mantine/core';
import { IconClockHour4, IconX, IconRocket } from '@tabler/icons-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Props {
    daysRemaining: number;
    expiresAt: string; // ISO
}

const HIDDEN_KEY_PREFIX = 'amakers_trial_banner_hidden_';

/**
 * Phase 32 — 트라이얼 만료 임박 배너.
 * - 7일 이하 남았을 때만 노출
 * - 사용자가 X 누르면 해당 D-N 단위로 24시간 동안만 숨김
 */
export default function TrialExpiringBanner({ daysRemaining, expiresAt }: Props) {
    const [hidden, setHidden] = useState(true); // SSR 단계는 숨김으로 시작 (hydration mismatch 방지)

    useEffect(() => {
        if (daysRemaining > 7) return;
        const key = `${HIDDEN_KEY_PREFIX}${daysRemaining}`;
        const saved = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        if (saved) {
            const ts = parseInt(saved, 10);
            // 24시간 이내에 닫았으면 계속 숨김
            if (Date.now() - ts < 24 * 60 * 60 * 1000) {
                setHidden(true);
                return;
            }
        }
        setHidden(false);
    }, [daysRemaining]);

    if (hidden) return null;
    if (daysRemaining > 7 || daysRemaining < 0) return null;

    const dismiss = () => {
        try {
            localStorage.setItem(`${HIDDEN_KEY_PREFIX}${daysRemaining}`, String(Date.now()));
        } catch { /* ignore */ }
        setHidden(true);
    };

    const expDate = new Date(expiresAt).toLocaleDateString('ko-KR', {
        month: 'long', day: 'numeric', weekday: 'short',
    });

    const urgent = daysRemaining <= 3;
    const color = daysRemaining === 0 ? 'red' : urgent ? 'orange' : 'blue';
    const title = daysRemaining === 0
        ? '⚡ 오늘 체험 종료 — 지금 결제하면 끊김 없이 사용'
        : daysRemaining === 1
            ? '⚡ 내일 체험 종료'
            : urgent
                ? `🚨 체험 ${daysRemaining}일 남음 — 결제 추천`
                : `⏰ 체험 ${daysRemaining}일 남음`;

    return (
        <Alert
            color={color}
            radius="md"
            mb="md"
            icon={<IconClockHour4 size={18} />}
            title={
                <Group justify="space-between" wrap="nowrap">
                    <Text fw={700}>{title}</Text>
                    <ActionIcon size="sm" variant="subtle" color="gray" onClick={dismiss}>
                        <IconX size={14} />
                    </ActionIcon>
                </Group>
            }
        >
            <Group justify="space-between" wrap="wrap" gap="md" mt={4}>
                <Text size="sm">
                    {expDate}까지 — 그 후 자동 발행·AI 한도·시리즈 운영이 제한됩니다.
                    지금 결제하면 끊김 없이 유지돼요.
                </Text>
                <Button
                    component={Link}
                    href="/dashboard/settings/billing"
                    color={color}
                    size="xs"
                    leftSection={<IconRocket size={14} />}
                >
                    플랜 업그레이드
                </Button>
            </Group>
        </Alert>
    );
}
