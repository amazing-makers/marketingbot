"use client";

import {
  AppShell, Burger, Group, NavLink, Title, UnstyledButton, Text, Menu, Avatar,
  ActionIcon, Stack, Divider, Tooltip, useMantineColorScheme, Kbd, Box
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Spotlight, spotlight } from '@mantine/spotlight';
import '@mantine/spotlight/styles.css';
import {
  IconDashboard, IconPlus, IconUserCircle, IconSettings,
  IconLogout, IconWorld, IconCalendarEvent,
  IconSun, IconMoon, IconSearch, IconCalendarMonth, IconRobot,
  IconChartBar, IconKey, IconWebhook, IconBolt, IconUsers, IconCreditCard
} from '@tabler/icons-react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import HeaderLicense from '@/components/HeaderLicense';
import CopilotSidebar from '@/components/copilot/CopilotSidebar';

function DarkModeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme({ keepTransitions: true });
  const isDark = colorScheme === 'dark';
  return (
    <Tooltip label={isDark ? '라이트 모드로' : '다크 모드로'} withArrow>
      <ActionIcon
        variant="subtle"
        size="lg"
        onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
        aria-label="color scheme toggle"
      >
        {isDark ? <IconSun size={18} stroke={1.7} /> : <IconMoon size={18} stroke={1.7} />}
      </ActionIcon>
    </Tooltip>
  );
}

function CommandPaletteTrigger() {
  return (
    <Tooltip label="명령 팔레트 (Ctrl+K)" withArrow>
      <UnstyledButton
        onClick={() => spotlight.open()}
        style={{
          padding: '4px 12px',
          borderRadius: 8,
          background: 'var(--mantine-color-default-hover)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <IconSearch size={14} stroke={1.7} />
        <Text size="xs" c="dimmed">검색·이동...</Text>
        <Kbd size="xs">Ctrl</Kbd>
        <Kbd size="xs">K</Kbd>
      </UnstyledButton>
    </Tooltip>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [opened, { toggle }] = useDisclosure();
  const pathname = usePathname();
  const router = useRouter();

  const spotlightActions = [
    {
      id: 'home',
      label: '홈 / 대시보드',
      description: '주요 통계와 차트',
      onClick: () => router.push('/dashboard'),
      leftSection: <IconDashboard size={18} />,
    },
    {
      id: 'calendar',
      label: '콘텐츠 캘린더',
      description: '월간 발행 일정 보기',
      onClick: () => router.push('/dashboard/campaigns/calendar'),
      leftSection: <IconCalendarMonth size={18} />,
    },
    {
      id: 'campaigns',
      label: '캠페인 목록',
      description: '예약된 캠페인 관리',
      onClick: () => router.push('/dashboard/campaigns'),
      leftSection: <IconCalendarEvent size={18} />,
    },
    {
      id: 'series',
      label: '🤖 자동화 시리즈',
      description: '한 번 설정 → 며칠/몇주 자동 발행 (사진풀·AI 신규)',
      onClick: () => router.push('/dashboard/campaigns/series'),
      leftSection: <IconRobot size={18} />,
      keywords: ['series', '자동화', '시리즈', 'auto'],
    },
    {
      id: 'new-campaign',
      label: '새 캠페인 작성',
      description: 'AI 자동 + 황금시간대 + 분할 발행',
      onClick: () => router.push('/dashboard/campaigns/new'),
      leftSection: <IconPlus size={18} />,
      keywords: ['create', 'compose', '작성', '게시'],
    },
    {
      id: 'channels',
      label: '채널 관리',
      description: 'Discord / Telegram / LinkedIn / X / 네이버 등 추가',
      onClick: () => router.push('/dashboard/channels'),
      leftSection: <IconWorld size={18} />,
    },
    {
      id: 'agent',
      label: '에이전트 관리',
      description: '데스크톱 에이전트 다운로드 + 라이선스',
      onClick: () => router.push('/dashboard/agent'),
      leftSection: <IconRobot size={18} />,
    },
    {
      id: 'templates',
      label: '캠페인 템플릿',
      description: '10개 업종별 템플릿',
      onClick: () => router.push('/dashboard/campaigns/templates'),
      leftSection: <IconBolt size={18} />,
    },
    {
      id: 'ai-settings',
      label: 'AI 설정',
      description: 'Gemini / Groq / DeepL 키 + 사용량',
      onClick: () => router.push('/dashboard/settings/ai'),
      leftSection: <IconKey size={18} />,
    },
    {
      id: 'billing',
      label: '결제·구독',
      description: '플랜 변경, 결제 정보, 사용 한도',
      onClick: () => router.push('/dashboard/settings/billing'),
      leftSection: <IconCreditCard size={18} />,
      keywords: ['plan', 'subscription', 'pricing', '구독', '결제'],
    },
    {
      id: 'pricing',
      label: '가격제 보기',
      description: '4개 플랜 비교',
      onClick: () => router.push('/pricing'),
      leftSection: <IconCreditCard size={18} />,
    },
    {
      id: 'webhooks',
      label: 'Webhook 토큰',
      description: 'Zapier / Make 외부 자동화',
      onClick: () => router.push('/dashboard/settings/webhooks'),
      leftSection: <IconWebhook size={18} />,
    },
    {
      id: 'notifications',
      label: '알림 설정',
      description: '이메일 알림 환경설정',
      onClick: () => router.push('/dashboard/settings/notifications'),
      leftSection: <IconChartBar size={18} />,
    },
    {
      id: 'settings',
      label: '환경 설정',
      onClick: () => router.push('/dashboard/settings'),
      leftSection: <IconSettings size={18} />,
    },
    {
      id: 'help',
      label: '도움말 / 매뉴얼',
      description: '8 섹션 사용 가이드',
      onClick: () => router.push('/help'),
      leftSection: <IconUsers size={18} />,
    },
  ];

  return (
    <>
      <Spotlight
        actions={spotlightActions}
        nothingFound="결과가 없습니다"
        highlightQuery
        searchProps={{
          leftSection: <IconSearch size={18} />,
          placeholder: '메뉴, 명령, 캠페인 검색...',
        }}
        shortcut={['mod + K', 'mod + P']}
      />
      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: 260,
          breakpoint: 'sm',
          collapsed: { mobile: !opened },
        }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between" wrap="nowrap">
            <Group wrap="nowrap" gap="md">
              <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
              <UnstyledButton component={Link} href="/dashboard">
                <Title order={3} style={{ background: 'linear-gradient(135deg, var(--mantine-color-blue-6), var(--mantine-color-violet-6))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  MarketingBot
                </Title>
              </UnstyledButton>
              <Box visibleFrom="md">
                <CommandPaletteTrigger />
              </Box>
            </Group>

            <Group gap="xs" wrap="nowrap">
              <HeaderLicense />
              <DarkModeToggle />
              {session?.user && (
                <Menu shadow="md" width={220} position="bottom-end">
                  <Menu.Target>
                    <UnstyledButton>
                      <Group gap={6}>
                        <Avatar radius="xl" size="sm" color="brand">
                          {(session.user.name || session.user.email || '?').charAt(0).toUpperCase()}
                        </Avatar>
                        <Text size="sm" fw={500} visibleFrom="md" c="dimmed">
                          {session.user.name || session.user.email}
                        </Text>
                      </Group>
                    </UnstyledButton>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>내 계정</Menu.Label>
                    <Menu.Item leftSection={<IconUserCircle size={14} />}>{session.user.email}</Menu.Item>
                    <Menu.Item leftSection={<IconSettings size={14} />} component={Link} href="/dashboard/settings">
                      환경 설정
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      color="red"
                      leftSection={<IconLogout size={14} />}
                      onClick={() => signOut({ callbackUrl: '/login' })}
                    >
                      로그아웃
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              )}
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <Stack gap="xs">
            <NavLink
              component={Link}
              href="/dashboard"
              label="홈"
              leftSection={<IconDashboard size={18} stroke={1.5} />}
              active={pathname === '/dashboard'}
            />
            <NavLink
              component={Link}
              href="/dashboard/campaigns"
              label="캠페인 관리"
              leftSection={<IconCalendarEvent size={18} stroke={1.5} />}
              active={!!pathname && pathname.startsWith('/dashboard/campaigns') && !pathname.includes('calendar')}
            />
            <NavLink
              component={Link}
              href="/dashboard/campaigns/calendar"
              label="콘텐츠 캘린더"
              leftSection={<IconCalendarMonth size={18} stroke={1.5} />}
              active={!!pathname && pathname.includes('/calendar')}
            />
            <NavLink
              component={Link}
              href="/dashboard/campaigns/series"
              label="자동화 시리즈"
              leftSection={<IconBolt size={18} stroke={1.5} />}
              active={!!pathname && pathname.includes('/series')}
            />
            <NavLink
              component={Link}
              href="/dashboard/channels"
              label="채널 관리"
              leftSection={<IconWorld size={18} stroke={1.5} />}
              active={pathname === '/dashboard/channels'}
            />
            <NavLink
              component={Link}
              href="/dashboard/agent"
              label="에이전트 관리"
              leftSection={<IconRobot size={18} stroke={1.5} />}
              active={pathname === '/dashboard/agent'}
            />
            <Divider my="sm" />
            <NavLink
              component={Link}
              href="/dashboard/settings/billing"
              label="결제·구독"
              leftSection={<IconCreditCard size={18} stroke={1.5} />}
              active={!!pathname && pathname.includes('/billing')}
            />
            <NavLink
              component={Link}
              href="/dashboard/settings"
              label="환경 설정"
              leftSection={<IconSettings size={18} stroke={1.5} />}
              active={!!pathname && pathname.startsWith('/dashboard/settings') && !pathname.includes('/billing')}
            />
          </Stack>

          <Box mt="auto" pt="md">
            <UnstyledButton onClick={() => spotlight.open()} style={{ width: '100%' }}>
              <Group gap={8} p="xs" style={{ borderRadius: 8, background: 'var(--mantine-color-default-hover)' }}>
                <IconSearch size={14} />
                <Text size="xs" c="dimmed" style={{ flex: 1 }}>빠른 검색...</Text>
                <Kbd size="xs">⌘K</Kbd>
              </Group>
            </UnstyledButton>
          </Box>
        </AppShell.Navbar>

        <AppShell.Main>{children}</AppShell.Main>
      </AppShell>
      {/* AI 코파일럿 — 우하단 floating 버튼 + 우측 Drawer (Cursor 스타일) */}
      <CopilotSidebar />
    </>
  );
}
