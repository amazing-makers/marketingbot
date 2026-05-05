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
  IconChartBar, IconKey, IconWebhook, IconBolt, IconUsers, IconCreditCard,
  IconUsersGroup, IconShield, IconBriefcase, IconActivity, IconBookmark, IconHistory
} from '@tabler/icons-react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import HeaderLicense from '@/components/HeaderLicense';
import CopilotSidebar from '@/components/copilot/CopilotSidebar';
import WorkspaceSwitcher from '@/components/workspace/WorkspaceSwitcher';
import NotificationBell from '@/components/notifications/NotificationBell';
import InstallPrompt from '@/components/pwa/InstallPrompt';
import FeedbackButton from '@/components/feedback/FeedbackButton';
import ChangelogBadge from '@/components/changelog/ChangelogBadge';
import { getMyAccountFlags } from '@/app/actions/resellerActions';
import { globalSearch, type SearchHit } from '@/app/actions/globalSearchActions';

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
  const [accountFlags, setAccountFlags] = useState<{ isAdmin: boolean; isPartner: boolean; partnerStatus: string | null }>({
    isAdmin: false, isPartner: false, partnerStatus: null,
  });

  // Phase 32 — 글로벌 검색 동적 결과
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);

  useEffect(() => {
    if (session?.user?.id) {
      getMyAccountFlags().then(setAccountFlags).catch(() => {});
    }
  }, [session?.user?.id]);

  // 검색어 디바운스 (300ms)
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 1) {
      setSearchHits([]);
      return;
    }
    const t = setTimeout(() => {
      globalSearch(q).then(setSearchHits).catch(() => setSearchHits([]));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // 운영 환경: adminbot.amakers.co.kr / 로컬: 빈 문자열 → 동일 호스트의 외부 admin 앱
  const adminUrl = typeof window !== 'undefined' && window.location.hostname.includes('amakers.co.kr')
    ? 'https://adminbot.amakers.co.kr'
    : 'http://localhost:3100';

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
      label: '🔁 예약 자동 발행',
      description: '한 번 설정 → 며칠·몇주 동안 알아서 자동으로 게시',
      onClick: () => router.push('/dashboard/campaigns/series'),
      leftSection: <IconRobot size={18} />,
      keywords: ['series', '자동', '시리즈', '예약', '반복', 'auto'],
    },
    {
      id: 'ab-test',
      label: '🧪 다양한 표현 비교',
      description: '같은 내용을 여러 가지 표현으로 한 번에 게시 → 어떤 게 잘 되는지 비교',
      onClick: () => router.push('/dashboard/campaigns/ab'),
      leftSection: <IconBolt size={18} />,
      keywords: ['ab', 'test', '실험', '비교', 'split'],
    },
    {
      id: 'ai-compare',
      label: '🆚 AI 모델 비교',
      description: '같은 프롬프트로 여러 AI 엔진 결과 비교 → 가장 좋은 출력 선택',
      onClick: () => router.push('/dashboard/ai-compare'),
      leftSection: <IconBolt size={18} />,
      keywords: ['ai', 'compare', 'gemini', 'claude', 'groq', '비교'],
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
    // Phase 27 — 신규 페이지 통합 검색
    {
      id: 'analytics',
      label: '📊 심층 분석',
      description: '펀넬 · 코호트 · 채널 활용도',
      onClick: () => router.push('/dashboard/analytics'),
      leftSection: <IconActivity size={18} />,
      keywords: ['analytics', '분석', '통계', 'funnel', 'cohort'],
    },
    {
      id: 'library',
      label: '📚 콘텐츠 라이브러리',
      description: '자주 쓰는 캡션 템플릿 모음',
      onClick: () => router.push('/dashboard/library'),
      leftSection: <IconBookmark size={18} />,
      keywords: ['library', '라이브러리', '템플릿', 'template', 'caption'],
    },
    {
      id: 'activity',
      label: '📜 활동 피드',
      description: '워크스페이스 멤버 활동 타임라인',
      onClick: () => router.push('/dashboard/activity'),
      leftSection: <IconHistory size={18} />,
      keywords: ['activity', '활동', '피드', 'feed', 'log'],
    },
    {
      id: 'workspace',
      label: '🏢 워크스페이스',
      description: '브랜드·팀 분리 + 멤버 관리',
      onClick: () => router.push('/dashboard/workspace'),
      leftSection: <IconUsersGroup size={18} />,
      keywords: ['workspace', '워크스페이스', '브랜드', '팀'],
    },
    {
      id: 'partner',
      label: '🤝 파트너 대시보드',
      description: '추천·고객사 대행 마케팅',
      onClick: () => router.push('/dashboard/partner'),
      leftSection: <IconBriefcase size={18} />,
      keywords: ['partner', '파트너', '리셀러', 'reseller', '추천'],
    },
    {
      id: 'partner-overview',
      label: '🏪 파트너 통합 통계',
      description: '모든 고객사 KPI 한눈에',
      onClick: () => router.push('/dashboard/partner/overview'),
      leftSection: <IconChartBar size={18} />,
      keywords: ['partner', 'overview', 'stats', '고객사', '통합'],
    },
    {
      id: 'reseller-old',
      label: '🤝 파트너 (기존 URL)',
      description: '/dashboard/reseller 는 자동 redirect',
      onClick: () => router.push('/dashboard/partner'),
      leftSection: <IconBriefcase size={18} />,
      keywords: ['reseller'],
    },
  ];

  // Phase 32 — 동적 검색 결과를 spotlight 액션에 합침
  const dynamicHitActions = searchHits.map(h => ({
    id: `hit-${h.type}-${h.id}`,
    label: h.label,
    description: h.sublabel,
    onClick: () => router.push(h.href),
    leftSection: h.type === 'campaign' ? <IconCalendarEvent size={18} />
      : h.type === 'series' ? <IconRobot size={18} />
        : <IconWorld size={18} />,
    keywords: [h.label, h.type, h.sublabel],
  }));

  const allSpotlightActions = searchHits.length > 0
    ? [
        { group: '🔍 검색 결과', actions: dynamicHitActions },
        { group: '📂 메뉴·명령', actions: spotlightActions },
      ]
    : spotlightActions;

  return (
    <>
      <Spotlight
        actions={allSpotlightActions as any}
        nothingFound={searchQuery.trim() ? '검색 결과가 없습니다' : '결과가 없습니다'}
        highlightQuery
        query={searchQuery}
        onQueryChange={setSearchQuery}
        searchProps={{
          leftSection: <IconSearch size={18} />,
          placeholder: '메뉴, 캠페인, 시리즈, 채널 검색...',
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
              <Box visibleFrom="sm">
                <WorkspaceSwitcher />
              </Box>
            </Group>

            <Group gap="xs" wrap="nowrap">
              <HeaderLicense />
              {session?.user && <ChangelogBadge />}
              {session?.user && <NotificationBell />}
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
                    <Menu.Item leftSection={<IconUserCircle size={14} />} component={Link} href="/dashboard/settings/profile">
                      👤 프로필
                    </Menu.Item>
                    <Menu.Item leftSection={<IconSettings size={14} />} component={Link} href="/dashboard/settings">
                      환경 설정
                    </Menu.Item>

                    {/* 파트너 메뉴 — 등록된 파트너만 표시 */}
                    {accountFlags.isPartner && (
                      <>
                        <Menu.Divider />
                        <Menu.Label>파트너</Menu.Label>
                        <Menu.Item
                          leftSection={<IconBriefcase size={14} />}
                          component={Link}
                          href="/dashboard/partner"
                          color="violet"
                        >
                          🤝 파트너 접속
                        </Menu.Item>
                      </>
                    )}

                    {/* 비파트너 — 가입 권유 */}
                    {!accountFlags.isPartner && (
                      <>
                        <Menu.Divider />
                        <Menu.Item
                          leftSection={<IconBriefcase size={14} />}
                          component={Link}
                          href="/dashboard/partner"
                          color="violet"
                        >
                          🤝 파트너 가입
                        </Menu.Item>
                      </>
                    )}

                    {/* 슈퍼관리자 — admin 화이트리스트만 */}
                    {accountFlags.isAdmin && (
                      <>
                        <Menu.Divider />
                        <Menu.Label>관리자</Menu.Label>
                        <Menu.Item
                          leftSection={<IconShield size={14} />}
                          component="a"
                          href={adminUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          color="red"
                        >
                          🛠 관리자 페이지 ↗
                        </Menu.Item>
                      </>
                    )}

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
              href="/dashboard/analytics"
              label="📊 심층 분석"
              leftSection={<IconActivity size={18} stroke={1.5} />}
              active={!!pathname && pathname.startsWith('/dashboard/analytics')}
            />
            <NavLink
              component={Link}
              href="/dashboard/library"
              label="📚 콘텐츠 라이브러리"
              leftSection={<IconBookmark size={18} stroke={1.5} />}
              active={!!pathname && pathname.startsWith('/dashboard/library')}
            />
            <NavLink
              component={Link}
              href="/dashboard/activity"
              label="📜 활동 피드"
              leftSection={<IconHistory size={18} stroke={1.5} />}
              active={!!pathname && pathname.startsWith('/dashboard/activity')}
            />
            <NavLink
              component={Link}
              href="/dashboard/campaigns"
              label="캠페인 관리"
              leftSection={<IconCalendarEvent size={18} stroke={1.5} />}
              active={
                !!pathname &&
                pathname.startsWith('/dashboard/campaigns') &&
                !pathname.includes('/calendar') &&
                !pathname.includes('/series') &&
                !pathname.includes('/ab') &&
                !pathname.includes('/templates')
              }
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
              label="예약 자동 발행"
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
              href="/dashboard/workspace"
              label="🏢 워크스페이스"
              leftSection={<IconUsersGroup size={18} stroke={1.5} />}
              active={!!pathname && pathname.startsWith('/dashboard/workspace')}
            />
            <NavLink
              component={Link}
              href="/dashboard/settings/webhooks"
              label="🔗 API·Webhook"
              leftSection={<IconWebhook size={18} stroke={1.5} />}
              active={!!pathname && pathname.includes('/webhooks')}
            />
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
      {/* PWA 설치 프롬프트 — 우하단 토스트 (모바일 우선) */}
      <InstallPrompt />
      {/* Phase 25 — 피드백 버튼 (우하단, 코파일럿 위) */}
      {session?.user && <FeedbackButton />}
    </>
  );
}
