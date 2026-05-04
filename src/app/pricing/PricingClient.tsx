'use client';

import {
    Container, Title, Text, Stack, Group, SimpleGrid, Card, Button,
    Badge, List, ThemeIcon, Center, Anchor
} from '@mantine/core';
import { IconCheck, IconStar } from '@tabler/icons-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { notifications } from '@mantine/notifications';
import { useSession } from 'next-auth/react';
import { createCheckoutSession } from '@/app/actions/billingActions';

interface PlanProp {
    key: string;
    name: string;
    priceMonthlyKrw: number;
    description: string;
    features: string[];
    highlight: boolean;
    configured: boolean;
}

export default function PricingClient({ plans }: { plans: PlanProp[] }) {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

    const handleSubscribe = async (planKey: string) => {
        if (status !== 'authenticated') {
            router.push('/login?redirect=/pricing');
            return;
        }
        setLoadingPlan(planKey);
        try {
            const { url } = await createCheckoutSession(planKey as any);
            window.location.href = url;
        } catch (e: any) {
            notifications.show({
                title: '결제 진행 불가',
                message: e?.message || '결제 시스템 미설정 — 관리자에게 문의해주세요.',
                color: 'red',
            });
            setLoadingPlan(null);
        }
    };

    return (
        <Container size="lg" py={60}>
            <Stack gap="xl" align="center">
                <Stack gap="xs" align="center">
                    <Badge size="lg" variant="light" color="violet">PRICING</Badge>
                    <Title order={1} ta="center" style={{ fontSize: 48 }}>
                        모든 플랜 <Text span inherit style={{ background: 'linear-gradient(135deg, var(--mantine-color-blue-6), var(--mantine-color-violet-6))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>14일 무료</Text>
                    </Title>
                    <Text size="lg" c="dimmed" ta="center" maw={600}>
                        무료로 시작 → 필요할 때 업그레이드. 언제든 취소 가능. 결제 정보 없이 무료 플랜 사용 가능.
                    </Text>
                </Stack>

                <SimpleGrid cols={{ base: 1, md: 2, lg: 4 }} spacing="lg" w="100%">
                    {plans.map((plan) => (
                        <Card
                            key={plan.key}
                            withBorder
                            radius="lg"
                            p="xl"
                            shadow={plan.highlight ? 'lg' : undefined}
                            style={plan.highlight ? {
                                borderColor: 'var(--mantine-color-violet-5)',
                                borderWidth: 2,
                                position: 'relative',
                            } : undefined}
                        >
                            {plan.highlight && (
                                <Badge
                                    color="violet"
                                    variant="filled"
                                    leftSection={<IconStar size={10} />}
                                    style={{ position: 'absolute', top: -10, right: 16 }}
                                >
                                    인기
                                </Badge>
                            )}
                            <Stack gap="md" h="100%" justify="space-between">
                                <Stack gap="xs">
                                    <Text fw={800} size="lg">{plan.name}</Text>
                                    <Text size="xs" c="dimmed">{plan.description}</Text>
                                    <Group align="baseline" gap={4} mt="sm">
                                        <Text fw={900} size="32px">
                                            {plan.priceMonthlyKrw === 0 ? '무료' : `₩${plan.priceMonthlyKrw.toLocaleString()}`}
                                        </Text>
                                        {plan.priceMonthlyKrw > 0 && (
                                            <Text size="sm" c="dimmed">/월</Text>
                                        )}
                                    </Group>
                                </Stack>

                                <List
                                    spacing="xs"
                                    size="sm"
                                    icon={
                                        <ThemeIcon color="teal" size={18} radius="xl">
                                            <IconCheck size={12} />
                                        </ThemeIcon>
                                    }
                                >
                                    {plan.features.map((f) => (
                                        <List.Item key={f}>{f}</List.Item>
                                    ))}
                                </List>

                                {plan.priceMonthlyKrw === 0 ? (
                                    <Button
                                        component={Link}
                                        href="/register"
                                        variant="light"
                                        size="md"
                                        fullWidth
                                    >
                                        무료로 시작
                                    </Button>
                                ) : (
                                    <Button
                                        size="md"
                                        fullWidth
                                        loading={loadingPlan === plan.key}
                                        disabled={!plan.configured}
                                        color={plan.highlight ? 'violet' : 'brand'}
                                        variant={plan.highlight ? 'filled' : 'light'}
                                        onClick={() => handleSubscribe(plan.key)}
                                    >
                                        {!plan.configured ? '준비 중' : '14일 무료 체험'}
                                    </Button>
                                )}
                            </Stack>
                        </Card>
                    ))}
                </SimpleGrid>

                <Center mt="xl">
                    <Stack gap="xs" align="center">
                        <Text size="sm" c="dimmed">결제는 Stripe 보안 결제로 처리됩니다.</Text>
                        <Group gap="xs">
                            <Anchor component={Link} href="/legal/refund" size="xs">환불 정책</Anchor>
                            <Text size="xs" c="dimmed">·</Text>
                            <Anchor component={Link} href="/legal/terms" size="xs">이용약관</Anchor>
                            <Text size="xs" c="dimmed">·</Text>
                            <Anchor component={Link} href="/help" size="xs">도움말</Anchor>
                        </Group>
                    </Stack>
                </Center>
            </Stack>
        </Container>
    );
}
