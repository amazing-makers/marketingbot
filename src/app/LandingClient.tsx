'use client';

import { 
  Container, 
  Title, 
  Text, 
  Button, 
  Group, 
  Stack, 
  SimpleGrid, 
  Card, 
  ThemeIcon, 
  Accordion, 
  List, 
  ThemeIcon as MantineThemeIcon,
  rem,
  Box,
  Divider,
  Badge,
  Paper,
  Anchor
} from '@mantine/core';
import { 
  IconCheck, 
  IconChevronRight, 
  IconPlayerPlayFilled,
  IconArrowRight
} from '@tabler/icons-react';
import { 
  HERO, 
  PROBLEMS, 
  CHANNELS, 
  FEATURES, 
  PLANS, 
  FAQS, 
  COMPANY_INFO 
} from '@/lib/landing-content';
import Link from 'next/link';

interface LandingClientProps {
  isLoggedIn: boolean;
}

export default function LandingClient({ isLoggedIn }: LandingClientProps) {
  return (
    <Box>
      {/* Navigation */}
      <Box style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
        <Container size="lg" h={70}>
          <Group justify="space-between" h="100%">
            <Link href="/" style={{ textDecoration: 'none' }}>
              <Title order={3} c="blue.6" style={{ cursor: 'pointer' }}>
                MarketingBot
              </Title>
            </Link>
            <Group gap="xl">
              <Anchor href="#features" c="dark" fw={500} size="sm">제품 기능</Anchor>
              <Anchor href="#pricing" c="dark" fw={500} size="sm">가격제</Anchor>
              <Anchor href="#faq" c="dark" fw={500} size="sm">FAQ</Anchor>
              {isLoggedIn ? (
                <Button component={Link} href="/dashboard" radius="xl" variant="filled" color="blue">
                  대시보드 가기
                </Button>
              ) : (
                <Group gap="sm">
                  <Button component={Link} href="/login" variant="subtle" color="gray" radius="xl">로그인</Button>
                  <Button component={Link} href="/register" radius="xl" color="blue">14일 무료 체험</Button>
                </Group>
              )}
            </Group>
          </Group>
        </Container>
      </Box>

      {/* Hero Section */}
      <Box py={100} style={{ backgroundColor: '#f8f9fa', backgroundImage: 'radial-gradient(#e9ecef 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
        <Container size="lg">
          <Stack align="center" gap={30}>
            <Badge size="lg" variant="light" color="blue" py="md">SNS 자동화의 새로운 표준</Badge>
            <Title 
              ta="center" 
              style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.1, fontWeight: 900 }}
              dangerouslySetInnerHTML={{ __html: HERO.titleHTML }}
            />
            <Text size="xl" c="dimmed" ta="center" maw={800} style={{ lineHeight: 1.6 }}>
              {HERO.sub}
            </Text>
            <Group gap="md">
              <Button size="xl" radius="xl" color="blue" rightSection={<IconArrowRight size={20} />} component={Link} href="/register">
                {HERO.ctaPrimary}
              </Button>
              {HERO.demoVideoUrl && (
                <Button size="xl" radius="xl" variant="outline" color="gray" leftSection={<IconPlayerPlayFilled size={18} />}>
                  {HERO.ctaSecondary}
                </Button>
              )}
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* Problems Section */}
      <Container size="lg" py={100}>
        <Stack gap={50}>
          <Stack gap={10} align="center">
            <Title order={2} ta="center">혹시 이런 고민을 하고 계신가요?</Title>
            <Text c="dimmed" ta="center">수동 SNS 운영의 한계를 마케팅봇이 해결해 드립니다.</Text>
          </Stack>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xl">
            {PROBLEMS.map((problem, idx) => (
              <Card key={idx} padding="xl" radius="md" withBorder shadow="xs">
                <Group gap="md" align="flex-start" wrap="nowrap">
                  <ThemeIcon color="red.1" c="red.6" size={32} radius="xl">
                    <IconCheck size={18} />
                  </ThemeIcon>
                  <Text fw={500}>{problem}</Text>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>

      {/* Channels Section */}
      <Box bg="gray.0" py={100}>
        <Container size="lg">
          <Stack gap={50}>
            <Stack gap={10} align="center">
              <Title order={2} ta="center">지원 채널 현황</Title>
              <Text c="dimmed" ta="center">현재 5개 핵심 채널을 즉시 사용할 수 있으며, 더 많은 채널이 추가될 예정입니다.</Text>
            </Stack>
            <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="lg">
              {CHANNELS.map((channel, idx) => (
                <Card key={idx} padding="xl" radius="md" withBorder>
                  <Stack align="center" gap="xs">
                    <ThemeIcon color={channel.color} size={60} radius="xl" variant="light" mb="xs">
                      <channel.icon size={32} />
                    </ThemeIcon>
                    <Text fw={700}>{channel.label}</Text>
                    <Badge variant={channel.status === 'AVAILABLE' ? 'filled' : 'light'} color={channel.status === 'AVAILABLE' ? 'blue' : 'gray'} mt="xs">
                      {channel.status === 'AVAILABLE' ? '사용 가능' : '준비 중'}
                    </Badge>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          </Stack>
        </Container>
      </Box>

      {/* Features Section */}
      <Container size="lg" py={100} id="features">
        <Stack gap={50}>
          <Stack gap={10} align="center">
            <Title order={2} ta="center">마케팅봇 주요 기능</Title>
            <Text c="dimmed" ta="center">비즈니스 성장에만 집중하세요. 반복 작업은 저희가 맡겠습니다.</Text>
          </Stack>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={40}>
            {FEATURES.map((feature, idx) => (
              <Stack key={idx} gap="md">
                <ThemeIcon size={50} radius="md" color="blue" variant="light">
                  <feature.icon size={28} />
                </ThemeIcon>
                <Title order={4}>{feature.title}</Title>
                <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>{feature.desc}</Text>
              </Stack>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>

      {/* Pricing Section */}
      <Box bg="blue.0" py={100} id="pricing">
        <Container size="lg">
          <Stack gap={50}>
            <Stack gap={10} align="center">
              <Title order={2} ta="center">합리적인 가격 정책</Title>
              <Text c="dimmed" ta="center">외주 비용의 1/20 가격으로 강력한 자동화 시스템을 구축하세요.</Text>
            </Stack>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
              {PLANS.filter(p => p.key !== 'TRIAL' && p.key !== 'ENTERPRISE').map((plan, idx) => (
                <Card key={idx} padding={30} radius="md" withBorder shadow={plan.highlight ? 'md' : 'sm'} style={{ transform: plan.highlight ? 'scale(1.05)' : 'none', zIndex: plan.highlight ? 1 : 0 }}>
                  {plan.highlight && <Badge color="blue" variant="filled" style={{ position: 'absolute', top: 20, right: 20 }}>인기</Badge>}
                  <Text size="sm" fw={700} c="blue" tt="uppercase" mb={5}>{plan.label}</Text>
                  <Group align="flex-end" gap={5} mb={20}>
                    <Title order={1}>₩{plan.priceKrw?.toLocaleString()}</Title>
                    <Text c="dimmed" mb={5}>/ {plan.period}</Text>
                  </Group>
                  <Divider mb={20} />
                  <Stack gap="sm" mb={30} flex={1}>
                    {plan.features.map((feat, fidx) => (
                      <Group key={fidx} gap="xs">
                        <IconCheck size={16} color="var(--mantine-color-blue-6)" />
                        <Text size="sm">{feat}</Text>
                      </Group>
                    ))}
                  </Stack>
                  <Button size="lg" fullWidth radius="md" color="blue" variant={plan.highlight ? 'filled' : 'outline'}>
                    {plan.ctaText}
                  </Button>
                </Card>
              ))}
            </SimpleGrid>
            <Box mt={30} ta="center">
               <Text c="dimmed" size="sm">
                 엔터프라이즈 및 대량 계정 관리가 필요하신가요? <Anchor fw={700}>별도 문의하기</Anchor>
               </Text>
            </Box>
          </Stack>
        </Container>
      </Box>

      {/* FAQ Section */}
      <Container size="md" py={100} id="faq">
        <Stack gap={50}>
          <Title order={2} ta="center">자주 묻는 질문</Title>
          <Accordion variant="separated" radius="md">
            {FAQS.map((faq, idx) => (
              <Accordion.Item key={idx} value={`faq-${idx}`}>
                <Accordion.Control fw={600}>{faq.q}</Accordion.Control>
                <Accordion.Panel c="dimmed" style={{ lineHeight: 1.7 }}>{faq.a}</Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        </Stack>
      </Container>

      {/* Footer */}
      <Box bg="gray.1" py={80} border-top="1px solid var(--mantine-color-gray-3)">
        <Container size="lg">
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing={50}>
            <Stack gap="lg">
              <Title order={3} c="blue.6">MarketingBot</Title>
              <Text size="sm" c="dimmed" maw={400}>
                마케팅봇은 (주)어메이커스가 개발하고 서비스하는 지능형 SNS 마케팅 자동화 솔루션입니다.
                기술로 마케터의 시간을 가치 있게 만듭니다.
              </Text>
              <Group gap="xl">
                <Stack gap={5}>
                  <Text size="xs" fw={700} c="dimmed">제품</Text>
                  <Anchor href="#features" size="sm" c="gray.7">주요 기능</Anchor>
                  <Anchor href="#pricing" size="sm" c="gray.7">가격 정책</Anchor>
                  <Anchor href="#faq" size="sm" c="gray.7">FAQ</Anchor>
                </Stack>
                <Stack gap={5}>
                  <Text size="xs" fw={700} c="dimmed">법률</Text>
                  <Anchor component={Link} href="/legal/terms" size="sm" c="gray.7">이용약관</Anchor>
                  <Anchor component={Link} href="/legal/privacy" size="sm" c="gray.7">개인정보처리방침</Anchor>
                  <Anchor component={Link} href="/legal/refund" size="sm" c="gray.7">환불정책</Anchor>
                </Stack>
              </Group>
            </Stack>
            <Stack gap="xs">
              <Text size="xs" fw={700} c="dimmed">사업자 정보</Text>
              <Text size="xs" c="dimmed">{COMPANY_INFO.name} | 대표자: {COMPANY_INFO.ceo}</Text>
              <Text size="xs" c="dimmed">사업자등록번호: {COMPANY_INFO.bizNo}</Text>
              <Text size="xs" c="dimmed">통신판매업신고: {COMPANY_INFO.onlineBizNo}</Text>
              <Text size="xs" c="dimmed">주소: {COMPANY_INFO.address}</Text>
              <Text size="xs" c="dimmed">이메일: {COMPANY_INFO.email} | 고객센터: {COMPANY_INFO.tel}</Text>
              <Text size="xs" c="dimmed" mt="lg">© {new Date().getFullYear()} {COMPANY_INFO.name}. All rights reserved.</Text>
            </Stack>
          </SimpleGrid>
        </Container>
      </Box>
    </Box>
  );
}
