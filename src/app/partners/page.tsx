import { prisma } from '@/lib/prisma';
import {
    Container, Stack, Title, Text, Group, Paper, Card, Badge, SimpleGrid, Anchor, Box, ThemeIcon, Button,
} from '@mantine/core';
import { IconUsersGroup, IconBriefcase, IconArrowRight } from '@tabler/icons-react';
import Link from 'next/link';
import { calcPartnerTier } from '@/lib/partner/tiers';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: '파트너 디렉토리 — 마케팅봇',
    description: 'amakers 마케팅봇과 함께하는 파트너들. 마케팅 대행, 디자인, 개발 통합을 도와드립니다.',
    openGraph: {
        title: '파트너 디렉토리',
        description: '검증된 마케팅·디자인·개발 파트너 목록',
    },
};

interface PartnerCardData {
    id: string;
    name: string;
    contactEmail: string;
    industry: string | null;
    tierLabel: string;
    tierEmoji: string;
    tierColor: string;
    referralCount: number;
    activeClientCount: number;
    primaryCode: string | null;
}

async function getPublicPartners(): Promise<PartnerCardData[]> {
    const partners = await prisma.reseller.findMany({
        where: { status: 'ACTIVE' },
        include: {
            referralCodes: {
                where: { active: true },
                include: { _count: { select: { referrals: true } } },
                orderBy: { createdAt: 'asc' },
            },
            commissions: {
                where: { status: { in: ['PENDING', 'PAID'] } },
                select: { amount: true },
            },
            _count: {
                select: { clients: true },
            },
        },
    });

    return partners.map(p => {
        const lifetime = p.commissions.reduce((s, c) => s + Number(c.amount), 0);
        const tier = calcPartnerTier(lifetime);
        const totalReferrals = p.referralCodes.reduce((s, c) => s + c._count.referrals, 0);
        return {
            id: p.id,
            name: p.name,
            contactEmail: p.contactEmail,
            industry: null, // Reseller 에 industry 필드 없음 — 추후 추가 가능
            tierLabel: tier.current.label,
            tierEmoji: tier.current.emoji,
            tierColor: tier.current.color,
            referralCount: totalReferrals,
            activeClientCount: p._count.clients,
            primaryCode: p.referralCodes[0]?.code || null,
        };
    }).sort((a, b) => {
        // 등급 우선 정렬: PLATINUM > GOLD > SILVER > BRONZE
        const order: Record<string, number> = { PLATINUM: 4, GOLD: 3, SILVER: 2, BRONZE: 1 };
        const ta = order[a.tierLabel] || 0;
        const tb = order[b.tierLabel] || 0;
        if (ta !== tb) return tb - ta;
        return b.referralCount - a.referralCount;
    });
}

export default async function PartnersDirectoryPage() {
    const partners = await getPublicPartners();

    return (
        <Box style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #eff6ff 100%)', minHeight: '100vh' }}>
            <Container size="lg" py={60}>
                <Stack gap="xl">
                    <Group justify="space-between" align="center">
                        <Anchor component={Link} href="/" underline="never">
                            <Title order={3} style={{
                                background: 'linear-gradient(135deg, var(--mantine-color-blue-6), var(--mantine-color-violet-6))',
                                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            }}>MarketingBot</Title>
                        </Anchor>
                        <Group gap="xs">
                            <Anchor component={Link} href="/login" size="sm" c="dimmed">로그인</Anchor>
                            <Button component={Link} href="/register" size="sm" color="violet">시작하기</Button>
                        </Group>
                    </Group>

                    <Stack gap="md" align="center" mt="xl">
                        <ThemeIcon size={56} radius="xl" variant="light" color="violet"><IconUsersGroup size={28} /></ThemeIcon>
                        <Title order={1} ta="center" style={{ fontSize: 32 }}>amakers 파트너 디렉토리</Title>
                        <Text c="dimmed" ta="center" size="md" maw={560}>
                            검증된 마케팅·디자인·개발 파트너들이 amakers 마케팅봇과 함께 운영합니다.
                            여러분의 비즈니스에 맞는 파트너를 찾아보세요.
                        </Text>
                    </Stack>

                    {partners.length === 0 ? (
                        <Paper withBorder p="xl" radius="md" style={{ background: 'white' }}>
                            <Stack gap="sm" align="center">
                                <Text size="lg" fw={700}>아직 활성 파트너가 없습니다</Text>
                                <Text size="sm" c="dimmed">파트너 프로그램에 가입하시려면 로그인 후 "내 계정 → 파트너 가입" 으로 진행해주세요.</Text>
                                <Button component={Link} href="/register" color="violet">가입하고 파트너 신청</Button>
                            </Stack>
                        </Paper>
                    ) : (
                        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                            {partners.map(p => (
                                <Card key={p.id} withBorder p="md" radius="md" style={{ background: 'white' }}>
                                    <Group justify="space-between" mb="sm">
                                        <Box
                                            style={{
                                                width: 40, height: 40, borderRadius: 8,
                                                background: `var(--mantine-color-${p.tierColor}-5)`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'white', fontWeight: 700, fontSize: 16,
                                            }}
                                        >
                                            {p.name.slice(0, 2).toUpperCase()}
                                        </Box>
                                        <Badge color={p.tierColor} variant="light" size="sm">
                                            {p.tierEmoji} {p.tierLabel}
                                        </Badge>
                                    </Group>
                                    <Text fw={700} size="md">{p.name}</Text>
                                    <Group gap={6} mt={4}>
                                        {p.activeClientCount > 0 && (
                                            <Badge size="xs" variant="light" color="blue" leftSection={<IconBriefcase size={10} />}>
                                                {p.activeClientCount}개 고객사 운영
                                            </Badge>
                                        )}
                                        {p.referralCount > 0 && (
                                            <Badge size="xs" variant="light" color="violet">
                                                {p.referralCount}명 추천
                                            </Badge>
                                        )}
                                    </Group>

                                    {p.primaryCode && (
                                        <Anchor
                                            component={Link}
                                            href={`/p/${p.primaryCode}`}
                                            size="sm"
                                            mt="md"
                                            style={{ display: 'block' }}
                                        >
                                            🎁 {p.primaryCode} 추천 페이지 <IconArrowRight size={11} style={{ display: 'inline' }} />
                                        </Anchor>
                                    )}
                                </Card>
                            ))}
                        </SimpleGrid>
                    )}

                    <Paper withBorder p="lg" radius="md" mt="xl" style={{ background: 'white' }}>
                        <Stack gap="sm" align="center">
                            <Text size="lg" fw={700}>🤝 파트너로 합류하시겠어요?</Text>
                            <Text size="sm" c="dimmed" ta="center" maw={500}>
                                개발자·리셀러·디자이너·마케팅 에이전시 환영. 가입 즉시 활성화 + 10% 수수료부터 시작.
                                Gold 등급 달성 시 자동 PDF 리포트 + 전담 매니저.
                            </Text>
                            <Button component={Link} href="/dashboard/partner" color="violet" size="md">
                                파트너 가입 →
                            </Button>
                        </Stack>
                    </Paper>

                    <Text size="xs" c="dimmed" ta="center" mt="xl">
                        © amakers · <Anchor component={Link} href="/legal/privacy" size="xs">개인정보</Anchor> · <Anchor component={Link} href="/legal/terms" size="xs">이용약관</Anchor>
                    </Text>
                </Stack>
            </Container>
        </Box>
    );
}
