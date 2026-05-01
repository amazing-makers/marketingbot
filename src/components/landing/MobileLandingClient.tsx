'use client';

import { 
  Box, 
  Container, 
  Stack, 
  Title, 
  Text, 
  Button, 
  SimpleGrid, 
  Card, 
  ThemeIcon, 
  Badge, 
  Accordion, 
  Divider, 
  Anchor,
  Group
} from '@mantine/core';
import { 
  IconCheck, 
  IconArrowRight, 
  IconPlayerPlayFilled 
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
import MobileLandingNav from './MobileLandingNav';

interface MobileLandingClientProps {
  isLoggedIn: boolean;
}

export default function MobileLandingClient({ isLoggedIn }: MobileLandingClientProps) {
  return (
    <Box>
      <MobileLandingNav isLoggedIn={isLoggedIn} />

      {/* Hero */}
      <Box py={60} px="md" style={{ backgroundColor: '#f8f9fa' }}>
        <Stack align="center" gap={20}>
          <Badge variant="light">SNS 자동화 끝판왕</Badge>
          <Title 
            ta="center" 
            style={{ fontSize: rem(32), fontWeight: 900, lineHeight: 1.2 }}
            dangerouslySetInnerHTML={{ __html: HERO.titleHTML }}
          />
          <Text size="md" c="dimmed" ta="center">
            {HERO.sub}
          </Text>
          <Stack w="100%" gap="sm">
            <Button size="lg" radius="xl" fullWidth color="blue" component={Link} href="/register">
              {HERO.ctaPrimary}
            </Button>
            {HERO.demoVideoUrl && (
              <Button size="lg" radius="xl" fullWidth variant="outline" color="gray" leftSection={<IconPlayerPlayFilled size={18} />}>
                {HERO.ctaSecondary}
              </Button>
            )}
          </Stack>
        </Stack>
      </Box>

      {/* Problems */}
      <Container py={60}>
        <Title order={3} ta="center" mb={30}>이런 고민, 해결해 드립니다</Title>
        <Stack gap="sm">
          {PROBLEMS.slice(0, 4).map((problem, idx) => (
            <Card key={idx} withBorder padding="sm" radius="md">
              <Group wrap="nowrap" gap="xs">
                <IconCheck size={16} color="red" />
                <Text size="sm" fw={500}>{problem}</Text>
              </Group>
            </Card>
          ))}
        </Stack>
      </Container>

      {/* Channels */}
      <Box bg="gray.0" py={60}>
        <Container>
          <Title order={3} ta="center" mb={30}>지원 채널</Title>
          <SimpleGrid cols={2} spacing="xs">
            {CHANNELS.map((channel, idx) => (
              <Card key={idx} withBorder align="center" padding="md">
                <ThemeIcon color={channel.color} variant="light" size="lg" mb={5}>
                  <channel.icon size={20} />
                </ThemeIcon>
                <Text size="xs" fw={700}>{channel.label}</Text>
                <Text size="10px" c={channel.status === 'AVAILABLE' ? 'blue' : 'dimmed'}>
                  {channel.status === 'AVAILABLE' ? '사용 가능' : '준비 중'}
                </Text>
              </Card>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* Pricing */}
      <Container py={60} id="pricing-mobile">
        <Title order={3} ta="center" mb={30}>가격제</Title>
        <Stack gap="md">
          {PLANS.filter(p => p.key === 'BASIC').map((plan, idx) => (
            <Card key={idx} withBorder padding="xl" radius="md" shadow="sm" bg="blue.0">
              <Badge color="blue" mb="xs">추천</Badge>
              <Text fw={700} size="xl" mb={5}>{plan.label}</Text>
              <Group align="flex-end" gap={5} mb="md">
                <Title order={2}>₩{plan.priceKrw?.toLocaleString()}</Title>
                <Text size="sm" c="dimmed">/ {plan.period}</Text>
              </Group>
              <Divider mb="md" />
              <Stack gap="xs" mb="xl">
                {plan.features.map((f, fi) => (
                  <Group key={fi} gap={5}>
                    <IconCheck size={14} color="blue" />
                    <Text size="xs">{f}</Text>
                  </Group>
                ))}
              </Stack>
              <Button fullWidth radius="md" component={Link} href="/register">시작하기</Button>
            </Card>
          ))}
        </Stack>
      </Container>

      {/* FAQ */}
      <Container py={60}>
        <Title order={3} ta="center" mb={30}>FAQ</Title>
        <Accordion variant="separated">
          {FAQS.slice(0, 5).map((faq, idx) => (
            <Accordion.Item key={idx} value={`faq-${idx}`}>
              <Accordion.Control size="sm" fw={600}>{faq.q}</Accordion.Control>
              <Accordion.Panel size="xs" c="dimmed">{faq.a}</Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Container>

      {/* Footer */}
      <Box bg="gray.1" py={40} px="md">
        <Stack gap="xl">
          <Title order={4} c="blue.6">MarketingBot</Title>
          <Stack gap={5}>
            <Text size="xs" fw={700} c="dimmed">법률 및 정책</Text>
            <Group gap="md">
              <Anchor component={Link} href="/legal/terms" size="xs">이용약관</Anchor>
              <Anchor component={Link} href="/legal/privacy" size="xs">개인정보처리방침</Anchor>
              <Anchor component={Link} href="/legal/refund" size="xs">환불정책</Anchor>
            </Group>
          </Stack>
          <Stack gap={2}>
            <Text size="10px" c="dimmed">{COMPANY_INFO.name} | 대표: {COMPANY_INFO.ceo}</Text>
            <Text size="10px" c="dimmed">사업자번호: {COMPANY_INFO.bizNo}</Text>
            <Text size="10px" c="dimmed">주소: {COMPANY_INFO.address}</Text>
            <Text size="10px" c="dimmed">이메일: {COMPANY_INFO.email}</Text>
          </Stack>
          <Text size="10px" c="dimmed">© {new Date().getFullYear()} {COMPANY_INFO.name}.</Text>
        </Stack>
      </Box>
    </Box>
  );
}

import { rem } from '@mantine/core';
