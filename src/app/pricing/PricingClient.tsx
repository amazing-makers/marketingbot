'use client';

import {
    Container, Title, Text, Stack, Group, SimpleGrid, Card, Button,
    Badge, List, ThemeIcon, Center, Anchor, Accordion, Paper, Box, Table,
} from '@mantine/core';
import { IconCheck, IconStar, IconShieldCheck, IconRocket, IconHelpCircle, IconX } from '@tabler/icons-react';
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

                {/* Phase 48 — 신뢰 시그널 */}
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" w="100%" mt="md">
                    <Paper withBorder p="md" radius="md">
                        <Group gap={6} mb={4}>
                            <ThemeIcon size={28} radius="md" color="teal" variant="light">
                                <IconShieldCheck size={16} />
                            </ThemeIcon>
                            <Text fw={700} size="sm">신용카드 등록 불필요</Text>
                        </Group>
                        <Text size="xs" c="dimmed">14일 무료 체험은 결제 정보 없이 시작. 만료 후 자동 결제 안 됨.</Text>
                    </Paper>
                    <Paper withBorder p="md" radius="md">
                        <Group gap={6} mb={4}>
                            <ThemeIcon size={28} radius="md" color="violet" variant="light">
                                <IconRocket size={16} />
                            </ThemeIcon>
                            <Text fw={700} size="sm">언제든 취소 가능</Text>
                        </Group>
                        <Text size="xs" c="dimmed">대시보드 결제 페이지에서 1클릭 취소. 미사용 일수 환불 정책 적용.</Text>
                    </Paper>
                    <Paper withBorder p="md" radius="md">
                        <Group gap={6} mb={4}>
                            <ThemeIcon size={28} radius="md" color="blue" variant="light">
                                <IconCheck size={16} />
                            </ThemeIcon>
                            <Text fw={700} size="sm">데이터 평생 보관</Text>
                        </Group>
                        <Text size="xs" c="dimmed">FREE 강등 후에도 90일 동안 모든 데이터 유지. 재가입 시 즉시 복구.</Text>
                    </Paper>
                </SimpleGrid>

                {/* Phase 48 — 플랜 비교 표 */}
                <Box w="100%" mt="xl">
                    <Title order={3} ta="center" mb="md">📊 플랜 상세 비교</Title>
                    <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
                        <Table.ScrollContainer minWidth={620}>
                            <Table verticalSpacing="md">
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>기능</Table.Th>
                                        <Table.Th ta="center">FREE</Table.Th>
                                        <Table.Th ta="center">STARTER</Table.Th>
                                        <Table.Th ta="center">PRO</Table.Th>
                                        <Table.Th ta="center">BUSINESS</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {[
                                        { feature: '채널 등록', free: '2개', starter: '5개', pro: '20개', business: '100개' },
                                        { feature: '활성 시리즈', free: '1개', starter: '3개', pro: '10개', business: '50개' },
                                        { feature: '일일 발행 task', free: '5건', starter: '30건', pro: '200건', business: '1,000건' },
                                        { feature: 'AI 캡션 생성/일', free: '5회', starter: '30회', pro: '300회', business: '1,500회' },
                                        { feature: 'AI 이미지 생성/일', free: '2장', starter: '10장', pro: '100장', business: '500장' },
                                        { feature: '14개 언어 자동 번역', free: '✓', starter: '✓', pro: '✓', business: '✓' },
                                        { feature: '워크스페이스 (멤버 초대)', free: '-', starter: '✓', pro: '✓', business: '✓' },
                                        { feature: 'Webhook · API', free: '-', starter: '-', pro: '✓', business: '✓' },
                                        { feature: '우선 고객 지원', free: '-', starter: '-', pro: '-', business: '✓' },
                                    ].map((row) => (
                                        <Table.Tr key={row.feature}>
                                            <Table.Td><Text fw={600} size="sm">{row.feature}</Text></Table.Td>
                                            <Table.Td ta="center"><Text size="sm" c={row.free === '-' ? 'dimmed' : undefined}>{row.free}</Text></Table.Td>
                                            <Table.Td ta="center"><Text size="sm" c={row.starter === '-' ? 'dimmed' : undefined}>{row.starter}</Text></Table.Td>
                                            <Table.Td ta="center"><Text size="sm" c={row.pro === '-' ? 'dimmed' : undefined}>{row.pro}</Text></Table.Td>
                                            <Table.Td ta="center"><Text size="sm" c={row.business === '-' ? 'dimmed' : undefined} fw={600}>{row.business}</Text></Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </Table.ScrollContainer>
                    </Paper>
                </Box>

                {/* Phase 48 — FAQ */}
                <Box w="100%" mt="xl">
                    <Group gap={6} justify="center" mb="md">
                        <IconHelpCircle size={20} />
                        <Title order={3} ta="center">❓ 자주 묻는 질문</Title>
                    </Group>
                    <Accordion variant="separated" radius="md">
                        <Accordion.Item value="trial">
                            <Accordion.Control>14일 무료 체험은 어떻게 시작하나요?</Accordion.Control>
                            <Accordion.Panel>
                                회원가입 즉시 14일 무료 체험이 시작돼요. 신용카드 등록 불필요. 만료 후 결제 안 하면 자동으로 FREE 플랜으로 강등 (데이터는 유지).
                            </Accordion.Panel>
                        </Accordion.Item>
                        <Accordion.Item value="cancel">
                            <Accordion.Control>구독을 언제든 취소할 수 있나요?</Accordion.Control>
                            <Accordion.Panel>
                                예. 대시보드 → 결제·구독 페이지에서 1클릭으로 취소 가능. 결제 주기 종료 시점까지는 PRO 기능 그대로 사용.
                            </Accordion.Panel>
                        </Accordion.Item>
                        <Accordion.Item value="data">
                            <Accordion.Control>구독 취소하면 데이터가 사라지나요?</Accordion.Control>
                            <Accordion.Panel>
                                아니요. 채널·캠페인·시리즈 모두 유지됩니다. FREE 플랜의 한도 내에서 계속 사용 가능. 만료 후 90일 동안 데이터 보관 (재가입 시 즉시 복구).
                            </Accordion.Panel>
                        </Accordion.Item>
                        <Accordion.Item value="ai">
                            <Accordion.Control>AI 캡션·이미지 한도를 초과하면?</Accordion.Control>
                            <Accordion.Panel>
                                일일 한도 도달 시 다음 날 0시 (KST) 에 자동 리셋. 본인 OpenAI·Gemini API 키를 등록하면 무제한 사용 가능 (사용자 비용 부담).
                            </Accordion.Panel>
                        </Accordion.Item>
                        <Accordion.Item value="upgrade">
                            <Accordion.Control>플랜을 중간에 변경할 수 있나요?</Accordion.Control>
                            <Accordion.Panel>
                                예. 업그레이드는 즉시 반영 (남은 기간 일할 계산). 다운그레이드는 다음 결제일부터 적용.
                            </Accordion.Panel>
                        </Accordion.Item>
                        <Accordion.Item value="refund">
                            <Accordion.Control>환불 정책이 어떻게 되나요?</Accordion.Control>
                            <Accordion.Panel>
                                결제 후 7일 이내 사용 이력 없으면 100% 환불. 그 외 미사용 일수 일할 계산 환불. 자세한 사항은{' '}
                                <Anchor component={Link} href="/legal/refund">환불 정책</Anchor>{' '}참고.
                            </Accordion.Panel>
                        </Accordion.Item>
                        <Accordion.Item value="invoice">
                            <Accordion.Control>세금계산서 발행 가능한가요?</Accordion.Control>
                            <Accordion.Panel>
                                예. 사업자 등록 사용자는 BUSINESS 플랜 결제 시 세금계산서 자동 발행. STARTER/PRO 도 요청 시 가능 (help@amakers.co.kr).
                            </Accordion.Panel>
                        </Accordion.Item>
                    </Accordion>
                </Box>

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
