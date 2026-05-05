import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import { Container, Stack, Group, Text, Title, Paper, Button, Badge, Box, ThemeIcon, SimpleGrid, Anchor } from '@mantine/core';
import { IconRocket, IconBolt, IconUsers, IconBuildingStore, IconCheck, IconArrowRight } from '@tabler/icons-react';
import Link from 'next/link';
import type { Metadata } from 'next';

interface PageProps {
    params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { code } = await params;
    const upperCode = code.toUpperCase();
    const referralCode = await prisma.referralCode.findUnique({
        where: { code: upperCode },
        include: { reseller: { select: { name: true } } },
    }).catch(() => null);

    const partnerName = referralCode?.reseller.name || '파트너';
    return {
        title: `🎁 ${partnerName} 추천 — 마케팅봇`,
        description: `${partnerName} 의 추천으로 가입하면 14일 무료체험 + 추천 혜택. SNS·블로그 자동 발행 SaaS.`,
        openGraph: {
            title: `${partnerName} 가 추천하는 마케팅봇`,
            description: 'Instagram·블로그·X·페이스북 자동 발행. 14일 무료 체험.',
            type: 'website',
        },
    };
}

export default async function PartnerLandingPage({ params }: PageProps) {
    const { code } = await params;
    const upperCode = code.toUpperCase();

    const referralCode = await prisma.referralCode.findUnique({
        where: { code: upperCode },
        include: {
            reseller: { select: { name: true, status: true } },
            _count: { select: { referrals: true } },
        },
    }).catch(() => null);

    if (!referralCode) notFound();
    if (!referralCode.active || referralCode.reseller.status !== 'ACTIVE') {
        // 비활성 코드 — 그냥 일반 가입 페이지로
        redirect('/register');
    }

    const partnerName = referralCode.reseller.name;

    return (
        <Box style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #eff6ff 100%)', minHeight: '100vh' }}>
            <Container size="md" py={60}>
                <Stack gap="xl">
                    {/* === 헤더 === */}
                    <Group justify="space-between" align="center">
                        <Anchor component={Link} href="/" underline="never">
                            <Title order={3} style={{
                                background: 'linear-gradient(135deg, var(--mantine-color-blue-6), var(--mantine-color-violet-6))',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            }}>MarketingBot</Title>
                        </Anchor>
                        <Group gap="xs">
                            <Anchor component={Link} href="/login" size="sm" c="dimmed">로그인</Anchor>
                        </Group>
                    </Group>

                    {/* === 추천 배지 === */}
                    <Paper withBorder p="lg" radius="md" style={{ background: 'white', borderColor: 'var(--mantine-color-violet-3)' }}>
                        <Group gap="md" align="center">
                            <ThemeIcon size={56} radius="xl" variant="light" color="violet">
                                <IconRocket size={28} />
                            </ThemeIcon>
                            <Stack gap={2} style={{ flex: 1 }}>
                                <Group gap={6}>
                                    <Text size="xs" c="dimmed" fw={600}>🎁 파트너 추천</Text>
                                </Group>
                                <Text fw={800} size="lg"><Text component="span" c="violet">{partnerName}</Text> 님이 추천한 마케팅봇</Text>
                                <Group gap={6}>
                                    <Badge size="sm" color="violet" variant="light">{upperCode}</Badge>
                                    {referralCode._count.referrals > 0 && (
                                        <Text size="xs" c="dimmed">이미 {referralCode._count.referrals}명이 가입</Text>
                                    )}
                                </Group>
                            </Stack>
                        </Group>
                    </Paper>

                    {/* === 메인 hero === */}
                    <Stack gap="xs" align="center" mt="xl">
                        <Title order={1} ta="center" style={{ fontSize: 36, lineHeight: 1.2 }}>
                            한 번 작성, <Text component="span" c="violet" inherit>5개 채널 동시 발행</Text>
                        </Title>
                        <Text c="dimmed" ta="center" size="md" maw={500}>
                            Instagram·블로그·X·페이스북·디스코드 — 매번 따로 올리지 마세요. AI 가 자동으로 채널별 톤·길이로 변형 + 자동 번역까지.
                        </Text>
                        <Group gap="xs" mt="md">
                            <Button
                                component={Link}
                                href={`/register?ref=${upperCode}`}
                                size="lg"
                                color="violet"
                                variant="gradient"
                                gradient={{ from: 'violet', to: 'blue' }}
                                rightSection={<IconArrowRight size={18} />}
                            >
                                14일 무료 체험 시작
                            </Button>
                            <Button component={Link} href="/pricing" size="lg" variant="subtle">
                                가격 보기
                            </Button>
                        </Group>
                        <Text size="xs" c="dimmed" mt={4}>신용카드 등록 필요 없음 · 14일 후 자동 종료</Text>
                    </Stack>

                    {/* === 핵심 기능 === */}
                    <Stack gap="md" mt="xl">
                        <Title order={3} ta="center">왜 마케팅봇인가요?</Title>
                        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                            <FeatureCard
                                icon={IconBolt}
                                color="violet"
                                title="자동 발행"
                                desc="시리즈 모드로 한번 설정하면 정해진 시간마다 자동 게시. AI 가 글·이미지까지."
                            />
                            <FeatureCard
                                icon={IconUsers}
                                color="blue"
                                title="채널별 최적화"
                                desc="인스타·X·블로그 톤 다 다르죠. AI 가 채널별로 알아서 변형."
                            />
                            <FeatureCard
                                icon={IconBuildingStore}
                                color="teal"
                                title="다지역·다언어"
                                desc="한국 카페 + 미국 매장? 자동 번역으로 한 번에. 원클릭 글로벌."
                            />
                        </SimpleGrid>
                    </Stack>

                    {/* === 가입 혜택 === */}
                    <Paper withBorder p="lg" radius="md" mt="md">
                        <Title order={4} mb="sm">🎁 {partnerName} 추천 가입 시</Title>
                        <Stack gap="xs">
                            <Group gap={6}><IconCheck size={16} color="var(--mantine-color-teal-6)" /><Text size="sm">14일 무료 체험 (전체 기능 잠금 해제)</Text></Group>
                            <Group gap={6}><IconCheck size={16} color="var(--mantine-color-teal-6)" /><Text size="sm">파트너 전용 우선 지원</Text></Group>
                            <Group gap={6}><IconCheck size={16} color="var(--mantine-color-teal-6)" /><Text size="sm">언제든 취소 가능 — 카드 등록 안 해도 시작</Text></Group>
                        </Stack>
                    </Paper>

                    <Group justify="center" mt="xl">
                        <Button
                            component={Link}
                            href={`/register?ref=${upperCode}`}
                            size="lg"
                            color="violet"
                            variant="gradient"
                            gradient={{ from: 'violet', to: 'blue' }}
                            rightSection={<IconArrowRight size={18} />}
                        >
                            지금 시작하기
                        </Button>
                    </Group>

                    <Text size="xs" c="dimmed" ta="center" mt="xl">
                        © amakers · <Anchor component={Link} href="/legal/privacy" size="xs">개인정보</Anchor> · <Anchor component={Link} href="/legal/terms" size="xs">이용약관</Anchor>
                    </Text>
                </Stack>
            </Container>
        </Box>
    );
}

function FeatureCard({ icon: Icon, color, title, desc }: { icon: any; color: string; title: string; desc: string }) {
    return (
        <Paper withBorder p="md" radius="md" style={{ background: 'white' }}>
            <ThemeIcon size={36} radius="md" variant="light" color={color} mb="sm"><Icon size={20} /></ThemeIcon>
            <Text fw={700} size="sm" mb={4}>{title}</Text>
            <Text size="xs" c="dimmed">{desc}</Text>
        </Paper>
    );
}
