import { Title, Text, SimpleGrid, Card, Group, Stack, Badge, List, Anchor } from '@mantine/core';
import { 
  IconCalendarEvent, IconLoader2, IconCheck, IconAlertCircle, 
  IconDevices, IconWorld, IconChevronRight 
} from '@tabler/icons-react';
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import dayjs from 'dayjs';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({ searchParams }: { searchParams: { skip?: string } }) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) return <Text>로그인이 필요합니다.</Text>;

  const now = new Date();
  const todayStart = dayjs().startOf('day').toDate();
  const weekEnd = dayjs().add(7, 'day').toDate();

  // 1. 통계 데이터 조회
  const [
    user,
    pendingCount,
    runningCount,
    todaySuccess,
    todayFailed,
    channelCount,
    agentCount,
    recentCampaigns
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { onboardingCompletedAt: true, createdAt: true } }),
    prisma.scheduledTask.count({ where: { campaign: { userId }, status: 'PENDING', scheduledAt: { lte: weekEnd } } }),
    prisma.scheduledTask.count({ where: { campaign: { userId }, status: 'RUNNING' } }),
    prisma.scheduledTask.count({ where: { campaign: { userId }, status: 'SUCCESS', executedAt: { gte: todayStart } } }),
    prisma.scheduledTask.count({ where: { campaign: { userId }, status: 'FAILED', executedAt: { gte: todayStart } } }),
    prisma.marketingChannel.count({ where: { userId } }),
    prisma.agentInstance.count({ where: { userId, lastSeenAt: { gte: dayjs().subtract(5, 'minute').toDate() } } }),
    prisma.campaign.findMany({ 
      where: { userId }, 
      take: 5, 
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { tasks: true } } }
    })
  ]);

  if (!user?.onboardingCompletedAt && searchParams.skip !== '1') {
    redirect('/onboarding');
  }

  const stats = [
    { title: '이번 주 예약', value: pendingCount, icon: IconCalendarEvent, color: 'blue' },
    { title: '진행 중 작업', value: runningCount, icon: IconLoader2, color: 'cyan' },
    { title: '오늘 성공', value: todaySuccess, icon: IconCheck, color: 'green' },
    { title: '오늘 실패', value: todayFailed, icon: IconAlertCircle, color: 'red' },
    { title: '연동된 채널', value: channelCount, icon: IconWorld, color: 'violet' },
    { title: '활성 에이전트', value: agentCount, icon: IconDevices, color: 'teal' },
  ];

  // 퀵스타트 노출 조건: 온보딩 완료 7일 이내 또는 미완료 단계 존재
  const showQuickStart = user && (
    !user.onboardingCompletedAt || 
    dayjs().diff(dayjs(user.onboardingCompletedAt), 'day') < 7
  );

  const quickStartSteps = [
    { label: '라이선스 확인', done: true, link: '/dashboard/agent' },
    { label: '에이전트 설치', done: agentCount > 0, link: '/dashboard/agent' },
    { label: '첫 채널 연결', done: channelCount > 0, link: '/dashboard/channels' },
    { label: '첫 캠페인 발행', done: recentCampaigns.length > 0, link: '/dashboard/campaigns/new' },
  ];

  const allStepsDone = quickStartSteps.every(s => s.done);

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>대시보드 개요</Title>
          <Text size="sm" c="dimmed">현재 마케팅 캠페인 현황입니다.</Text>
        </div>
      </Group>

      {showQuickStart && !allStepsDone && (
        <Card withBorder radius="md" p="xl" bg="blue.0">
          <Group justify="space-between" mb="md">
            <Stack gap={0}>
              <Text fw={700} size="lg">🚀 퀵 스타트 가이드</Text>
              <Text size="sm" c="dimmed">효과적인 마케팅을 위해 아래 단계를 완료해주세요.</Text>
            </Stack>
            <Badge size="lg" variant="filled">
              {quickStartSteps.filter(s => s.done).length} / {quickStartSteps.length} 완료
            </Badge>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
            {quickStartSteps.map((step, idx) => (
              <Card key={idx} withBorder radius="sm" p="sm" bg={step.done ? 'white' : 'blue.1'}>
                <Group gap="xs">
                  {step.done ? (
                    <IconCheck size={16} color="var(--mantine-color-green-6)" />
                  ) : (
                    <IconChevronRight size={16} color="var(--mantine-color-blue-6)" />
                  )}
                  <Anchor component={Link} href={step.link} size="sm" fw={step.done ? 400 : 700} c={step.done ? 'dimmed' : 'blue'}>
                    {step.label}
                  </Anchor>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </Card>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {stats.map((stat) => (
          <Card key={stat.title} withBorder radius="md" padding="lg">
            <Group justify="space-between">
              <Stack gap={0}>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">{stat.title}</Text>
                <Text fw={700} size="xl">{stat.value}</Text>
              </Stack>
              <stat.icon size={32} stroke={1.5} color={`var(--mantine-color-${stat.color}-filled)`} />
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
        <Card withBorder radius="md" padding="xl">
          <Group justify="space-between" mb="md">
            <Title order={4}>최근 캠페인</Title>
            <Anchor component={Link} href="/dashboard/campaigns" size="sm">전체 보기</Anchor>
          </Group>
          <Stack>
            {recentCampaigns.map((c) => (
              <Group key={c.id} justify="space-between">
                <Stack gap={0}>
                  <Text size="sm" fw={500}>{c.name}</Text>
                  <Text size="xs" c="dimmed">{dayjs(c.createdAt).format('YYYY-MM-DD')}</Text>
                </Stack>
                <Badge variant="light" size="sm">{c._count.tasks} Tasks</Badge>
              </Group>
            ))}
            {recentCampaigns.length === 0 && <Text size="sm" c="dimmed">진행 중인 캠페인이 없습니다.</Text>}
          </Stack>
        </Card>

        <Card withBorder radius="md" padding="xl">
          <Title order={4} mb="md">공지사항 및 팁</Title>
          <List spacing="xs" size="sm" center>
            <List.Item>에이전트를 실행하여 자동 발행을 시작하세요.</List.Item>
            <List.Item>채널의 인증이 만료되지 않았는지 정기적으로 확인하세요.</List.Item>
            <List.Item>콘텐츠 가이드라인을 준수하여 계정 정지를 예방하세요.</List.Item>
          </List>
        </Card>
      </SimpleGrid>
    </Stack>
  );
}
