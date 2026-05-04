'use client';

import {
    Container, Title, Text, Stack, Group, Card, Button, Badge,
    SimpleGrid, Paper, Anchor
} from '@mantine/core';
import { IconCreditCard, IconExternalLink, IconArrowUp } from '@tabler/icons-react';
import { useState } from 'react';
import Link from 'next/link';
import { notifications } from '@mantine/notifications';
import { createCustomerPortalSession, cancelSubscriptionAtPeriodEnd } from '@/app/actions/billingActions';
import dayjs from 'dayjs';

interface SubscriptionProp {
    plan: string;
    planName: string;
    priceMonthlyKrw: number;
    status: string;
    currentPeriodEnd: string | null;
    trialEndsAt: string | null;
    cancelAtPeriodEnd: boolean;
    limits: { channels: number; campaignsPerMonth: number; aiCaptionsPerMonth: number; aiImagesPerMonth: number; teamMembers: number };
}

export default function BillingClient({ subscription }: { subscription: SubscriptionProp }) {
    const [busy, setBusy] = useState<'portal' | 'cancel' | null>(null);

    const handlePortal = async () => {
        setBusy('portal');
        try {
            const { url } = await createCustomerPortalSession();
            window.location.href = url;
        } catch (e: any) {
            notifications.show({ title: '오류', message: e?.message || '포털 접속 실패', color: 'red' });
            setBusy(null);
        }
    };

    const handleCancel = async () => {
        if (!confirm('구독을 취소하시겠습니까? 결제 기간 종료 시까지 사용 후 자동으로 무료 플랜이 됩니다.')) return;
        setBusy('cancel');
        try {
            const r = await cancelSubscriptionAtPeriodEnd();
            notifications.show({
                title: '취소 예정',
                message: r.cancelAt
                    ? `${dayjs(r.cancelAt).format('YYYY-MM-DD')} 까지 사용 가능합니다.`
                    : '취소 신청이 접수되었습니다.',
                color: 'orange',
            });
        } catch (e: any) {
            notifications.show({ title: '오류', message: e?.message || '취소 실패', color: 'red' });
        } finally {
            setBusy(null);
        }
    };

    const isFree = subscription.plan === 'FREE';

    return (
        <Container size="md">
            <Stack gap="xl">
                <div>
                    <Title order={2}>💳 결제 관리</Title>
                    <Text size="sm" c="dimmed">현재 구독 정보와 사용 한도</Text>
                </div>

                {/* 현재 플랜 */}
                <Card withBorder p="xl" radius="md" style={{
                    background: isFree ? undefined : 'linear-gradient(135deg, var(--mantine-color-violet-0), var(--mantine-color-blue-0))',
                    borderColor: isFree ? undefined : 'var(--mantine-color-violet-3)',
                }}>
                    <Group justify="space-between" wrap="nowrap" align="flex-start">
                        <Stack gap="xs">
                            <Group gap="xs">
                                <Text size="xs" fw={700} c="dimmed" tt="uppercase">현재 플랜</Text>
                                <Badge color={isFree ? 'gray' : 'violet'} variant="filled">
                                    {subscription.planName}
                                </Badge>
                                {subscription.status === 'trialing' && (
                                    <Badge color="orange" variant="dot">무료 체험 중</Badge>
                                )}
                                {subscription.cancelAtPeriodEnd && (
                                    <Badge color="red" variant="dot">취소 예정</Badge>
                                )}
                                {subscription.status === 'past_due' && (
                                    <Badge color="red" variant="filled">결제 실패</Badge>
                                )}
                            </Group>
                            <Group gap={4} align="baseline">
                                <Text fw={900} size="32px">
                                    {subscription.priceMonthlyKrw === 0 ? '무료' : `₩${subscription.priceMonthlyKrw.toLocaleString()}`}
                                </Text>
                                {subscription.priceMonthlyKrw > 0 && (
                                    <Text size="sm" c="dimmed">/월</Text>
                                )}
                            </Group>
                            {subscription.trialEndsAt && (
                                <Text size="xs" c="orange.7" fw={600}>
                                    🎁 무료 체험 종료: {dayjs(subscription.trialEndsAt).format('YYYY-MM-DD')}
                                </Text>
                            )}
                            {subscription.currentPeriodEnd && (
                                <Text size="xs" c="dimmed">
                                    {subscription.cancelAtPeriodEnd ? '서비스 종료' : '다음 결제'}: {dayjs(subscription.currentPeriodEnd).format('YYYY-MM-DD')}
                                </Text>
                            )}
                        </Stack>
                        <Stack gap="xs" align="flex-end">
                            {isFree ? (
                                <Button
                                    component={Link}
                                    href="/pricing"
                                    color="violet"
                                    leftSection={<IconArrowUp size={16} />}
                                >
                                    플랜 업그레이드
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        onClick={handlePortal}
                                        loading={busy === 'portal'}
                                        variant="light"
                                        leftSection={<IconCreditCard size={16} />}
                                    >
                                        결제·플랜 관리
                                    </Button>
                                    {!subscription.cancelAtPeriodEnd && (
                                        <Button
                                            size="xs"
                                            variant="subtle"
                                            color="red"
                                            onClick={handleCancel}
                                            loading={busy === 'cancel'}
                                        >
                                            구독 취소
                                        </Button>
                                    )}
                                </>
                            )}
                        </Stack>
                    </Group>
                </Card>

                {/* 사용 한도 */}
                <div>
                    <Title order={4} mb="sm">사용 한도 (월)</Title>
                    <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="xs">
                        {[
                            { label: '채널', value: subscription.limits.channels },
                            { label: '캠페인', value: subscription.limits.campaignsPerMonth },
                            { label: 'AI 캡션', value: subscription.limits.aiCaptionsPerMonth },
                            { label: 'AI 이미지', value: subscription.limits.aiImagesPerMonth },
                            { label: '팀 멤버', value: subscription.limits.teamMembers },
                        ].map((s) => (
                            <Paper key={s.label} withBorder p="md" radius="md" ta="center">
                                <Text size="xs" c="dimmed" fw={600}>{s.label}</Text>
                                <Text fw={800} size="xl">
                                    {s.value >= 999999 ? '∞' : s.value.toLocaleString()}
                                </Text>
                            </Paper>
                        ))}
                    </SimpleGrid>
                </div>

                {/* 도움말 링크 */}
                <Paper withBorder p="md" radius="md" bg="gray.0">
                    <Group justify="space-between">
                        <div>
                            <Text size="sm" fw={700}>플랜이 부족하신가요?</Text>
                            <Text size="xs" c="dimmed">전체 플랜 비교 + 14일 무료 체험</Text>
                        </div>
                        <Button
                            component={Link}
                            href="/pricing"
                            variant="subtle"
                            rightSection={<IconExternalLink size={14} />}
                        >
                            가격제 보기
                        </Button>
                    </Group>
                </Paper>
            </Stack>
        </Container>
    );
}
