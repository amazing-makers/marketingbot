"use client";

import {
  AppShell, Burger, Group, NavLink, Title, UnstyledButton, Text,
  ActionIcon, Stack, Divider, Tooltip, useMantineColorScheme, Kbd, Box
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Spotlight, spotlight } from '@mantine/spotlight';
import '@mantine/spotlight/styles.css';
import {
  IconDashboard, IconPlus, IconSettings,
  IconWorld, IconCalendarEvent,
  IconSun, IconMoon, IconSearch, IconCalendarMonth, IconRobot,
  IconChartBar, IconKey, IconWebhook, IconBolt, IconUsers, IconCreditCard,
  IconUsersGroup, IconBriefcase, IconActivity, IconBookmark, IconHistory
} from '@tabler/icons-react';
import { useSession } from 'next-auth/react';
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
import InteractiveTour from '@/components/onboarding/InteractiveTour';
import AccountSwitcher from '@/components/auth/AccountSwitcher';
import SidebarAccountSwitcher from '@/components/auth/SidebarAccountSwitcher';
import MobileBottomTabs from '@/components/nav/MobileBottomTabs';
import FirstPublishCelebration from '@/components/milestones/FirstPublishCelebration';
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
      id: 'quick-publish',
      label: '⚡ 5분 빠른 발행',
      description: '주제만 입력 → AI 캡션 자동 → 모든 채널 즉시 발행',
      onClick: () => router.push('/dashboard/quick-publish'),
      leftSection: <IconBolt size={18} />,
      keywords: ['quick', 'fast', '빠른', '간편', '즉시', 'instant'],
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
      id: 'refer',
      label: '🎁 친구 초대',
      description: '친구가 가입·결제하면 트라이얼 7일 보너스',
      onClick: () => router.push('/dashboard/refer'),
      leftSection: <IconUsers size={18} />,
      keywords: ['refer', '추천', '친구', 'invite', 'referral', 'gift'],
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
        padding={{ base: 'sm', sm: 'md' }}
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between" wrap="nowrap">
            <Group wrap="nowrap" gap="xs">
              <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
              <UnstyledButton component={Link} href="/dashboard">
                <Title order={4} style={{
                  background: 'linear-gradient(135deg, var(--mantine-color-blue-6), var(--mantine-color-violet-6))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontSize: 'clamp(15px, 4vw, 20px)',
                }}>
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
              <Box visibleFrom="md">
                <HeaderLicense />
              </Box>
              {session?.user && <ChangelogBadge />}
              {session?.user && <NotificationBell />}
              <Box visibleFrom="sm">
                <DarkModeToggle />
              </Box>
              {session?.user && (
                <AccountSwitcher
                  currentUser={{
                    email: session.user.email || '',
                    name: session.user.name || null,
                  }}
                  isAdmin={accountFlags.isAdmin}
                  isPartner={accountFlags.isPartner}
                  adminUrl={adminUrl}
                />
              )}
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <Stack gap="xs">
            {/* 홈 */}
            <NavLink
              component={Link}
              href="/dashboard"
              label="홈"
              leftSection={<IconDashboard size={18} stroke={1.5} />}
              active={pathname === '/dashboard'}
            />

            {/* === 콘텐츠 발행 (메인 작업 흐름) === */}
            <NavLink
              component={Link}
              href="/dashboard/campaigns"
              label="콘텐츠 발행"
              leftSection={<IconCalendarEvent size={18} stroke={1.5} />}
              data-tour="nav-campaigns"
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
              data-tour="nav-series"
              active={!!pathname && pathname.includes('/series')}
            />
            <NavLink
              component={Link}
              href="/dashboard/library"
              label="콘텐츠 라이브러리"
              leftSection={<IconBookmark size={18} stroke={1.5} />}
              active={!!pathname && pathname.startsWith('/dashboard/library')}
            />

            {/* === 채널 (발행 인프라) === */}
            <NavLink
              component={Link}
              href="/dashboard/channels"
              label="채널 관리"
              leftSection={<IconWorld size={18} stroke={1.5} />}
              data-tour="nav-channels"
              active={pathname === '/dashboard/channels'}
            />

            {/* === 인사이트 === */}
            <NavLink
              component={Link}
              href="/dashboard/activity"
              label="활동 피드"
              leftSection={<IconHistory size={18} stroke={1.5} />}
              active={!!pathname && pathname.startsWith('/dashboard/activity')}
            />
            <NavLink
              component={Link}
              href="/dashboard/analytics"
              label="심층 분석"
              leftSection={<IconActivity size={18} stroke={1.5} />}
              active={!!pathname && pathname.startsWith('/dashboard/analytics')}
            />

            <Divider my="sm" />

            {/* === 협업·통합·결제·설정 === */}
            <NavLink
              component={Link}
              href="/dashboard/workspace"
              label="워크스페이스"
              leftSection={<IconUsersGroup size={18} stroke={1.5} />}
              active={!!pathname && pathname.startsWith('/dashboard/workspace')}
            />
            <NavLink
              component={Link}
              href="/dashboard/settings/webhooks"
              label="API·Webhook"
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
              href="/dashboard/agent"
              label="에이전트 관리"
              leftSection={<IconRobot size={18} stroke={1.5} />}
              active={pathname === '/dashboard/agent'}
            />
            <NavLink
              component={Link}
              href="/dashboard/settings"
              label="환경 설정"
              leftSection={<IconSettings size={18} stroke={1.5} />}
              active={!!pathname && pathname.startsWith('/dashboard/settings') && !pathname.includes('/billing') && !pathname.includes('/webhooks')}
            />
          </Stack>

          {/* Phase 39 — 사이드바 하단 다중 계정 관리 */}
          {session?.user && (
            <Box mt="auto" pt="md">
              <SidebarAccountSwitcher
                currentUser={{
                  email: session.user.email || '',
                  name: session.user.name || null,
                }}
              />
            </Box>
          )}
        </AppShell.Navbar>

        <AppShell.Main>
          <Box style={{ paddingBottom: 'var(--mb-bottom-tabs, 0)' }} className="amakers-main-content">
            {children}
          </Box>
        </AppShell.Main>
      </AppShell>
      {/* Phase 41 — 모바일 하단 Tab Bar (sm 미만) */}
      {session?.user && <MobileBottomTabs />}
      {/* AI 코파일럿 — 우하단 floating 버튼 + 우측 Drawer (Cursor 스타일) */}
      <CopilotSidebar />
      {/* PWA 설치 프롬프트 — 우하단 토스트 (모바일 우선) */}
      <InstallPrompt />
      {/* Phase 25 — 피드백 버튼 (우하단, 코파일럿 위) */}
      {session?.user && <FeedbackButton />}
      {/* Phase 39 — 인터랙티브 온보딩 투어 (첫 방문 자동 시작) */}
      {session?.user && <InteractiveTour />}
      {/* Phase 43 — 첫 발행 SUCCESS 자동 감지 + 축하 모달 (영구 1회) */}
      {session?.user && <FirstPublishCelebration />}
      <style jsx global>{`
        @media (max-width: 47.999em) {
          .amakers-main-content {
            padding-bottom: calc(56px + env(safe-area-inset-bottom, 0)) !important;
          }
        }
      `}</style>
    </>
  );
}
