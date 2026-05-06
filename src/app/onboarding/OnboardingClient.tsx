'use client';

import { 
  Stepper, 
  Button, 
  Group, 
  Text, 
  Paper, 
  Title, 
  Stack, 
  Container, 
  rem, 
  Code, 
  ActionIcon, 
  CopyButton, 
  Accordion,
  SimpleGrid,
  Card,
  ThemeIcon,
  Anchor
} from '@mantine/core';
import {
  IconCopy,
  IconCheck,
  IconDownload,
  IconUserPlus,
  IconRocket,
  IconLayoutDashboard,
  IconBrandInstagram,
  IconBrandFacebook,
  IconQuote,
  IconSpeakerphone,
  IconArrowRight,
  IconBuildingStore,
  IconSparkles,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import { setOnboardingCompleted } from '../actions/userActions';
import { applyIndustryPreset } from '../actions/onboardingActions';
import { INDUSTRY_LIST } from '@/lib/onboarding/industry-presets';

interface OnboardingClientProps {
  userName: string;
  license: any;
}

export default function OnboardingClient({ userName, license }: OnboardingClientProps) {
  const [active, setActive] = useState(0);
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Phase 42 — 업종 선택 + 자동 적용 진행 상태
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [industryApplying, setIndustryApplying] = useState(false);
  const [industryApplied, setIndustryApplied] = useState(false);

  const nextStep = () => setActive((current) => (current < 4 ? current + 1 : current));
  const prevStep = () => setActive((current) => (current > 0 ? current - 1 : current));

  const handleSelectIndustry = async (id: string) => {
    if (industryApplying) return;
    setSelectedIndustry(id);
    setIndustryApplying(true);
    try {
      const r = await applyIndustryPreset(id);
      setIndustryApplied(true);
      notifications.show({
        title: '✅ 업종 적용됨',
        message: `${r.industry} 업종에 맞는 템플릿 ${r.templatesCreated}개를 자동으로 등록했어요`,
        color: 'teal',
        autoClose: 4000,
      });
    } catch (e: any) {
      notifications.show({ title: '오류', message: e?.message || '실패', color: 'red' });
      setSelectedIndustry(null);
    } finally {
      setIndustryApplying(false);
    }
  };

  const handleFinish = async () => {
    setLoading(true);
    await setOnboardingCompleted();
    router.push('/dashboard');
  };

  return (
    <Container size="md" py={60}>
      <Stack mb={40} align="center">
        <Title order={1} style={{ fontSize: rem(32) }}>
          마케팅봇 셋업 가이드
        </Title>
        <Text c="dimmed">신규 사용자님의 원활한 시작을 도와드립니다.</Text>
      </Stack>

      <Stepper active={active} onStepClick={setActive} allowNextStepsSelect={false}>
        {/* Step 1: 환영 */}
        <Stepper.Step 
          label="환영합니다" 
          description="주요 기능 소개" 
          icon={<IconUserPlus size="1.1rem" />}
        >
          <Stack py="xl" align="center" gap="xl">
            <Title order={2} ta="center">
              {userName}님, 마케팅봇에 오신 것을 환영합니다! 🎉
            </Title>
            <Text ta="center" size="lg" maw={600}>
              Instagram, Naver, Facebook 등 5개 SNS 채널을 한 곳에서 관리하고,<br /> 
              지능형 에이전트로 24시간 자동 게시를 시작해보세요.
            </Text>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mt="md" w="100%">
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <ThemeIcon size={40} radius="md" variant="light" color="blue" mb="sm">
                  <IconSpeakerphone size="1.2rem" />
                </ThemeIcon>
                <Text fw={500} mb="xs">멀티 채널 게시</Text>
                <Text size="sm" c="dimmed">한 번의 작성으로 모든 SNS에 동시 업로드</Text>
              </Card>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <ThemeIcon size={40} radius="md" variant="light" color="teal" mb="sm">
                  <IconRocket size="1.2rem" />
                </ThemeIcon>
                <Text fw={500} mb="xs">지능형 에이전트</Text>
                <Text size="sm" c="dimmed">데스크톱 에이전트가 백그라운드에서 자동 처리</Text>
              </Card>
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <ThemeIcon size={40} radius="md" variant="light" color="orange" mb="sm">
                  <IconLayoutDashboard size="1.2rem" />
                </ThemeIcon>
                <Text fw={500} mb="xs">간편한 관리</Text>
                <Text size="sm" c="dimmed">예약 발행부터 결과 확인까지 한 눈에 파악</Text>
              </Card>
            </SimpleGrid>
          </Stack>
        </Stepper.Step>

        {/* Phase 42 — Step 2: 업종 선택 → 추천 템플릿 자동 등록 */}
        <Stepper.Step
          label="업종 선택"
          description="추천 템플릿 자동 등록"
          icon={<IconBuildingStore size="1.1rem" />}
        >
          <Stack py="xl" gap="lg">
            <Stack gap={4} align="center">
              <Title order={3} ta="center">어떤 업종이세요?</Title>
              <Text c="dimmed" ta="center" maw={520} size="sm">
                선택하시면 업종에 맞는 <strong>캡션 템플릿 3개</strong>가 자동으로 등록되고
                <br />추천 SNS 채널·발행 빈도를 안내받을 수 있어요.
              </Text>
            </Stack>

            <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
              {INDUSTRY_LIST.map(ind => {
                const isSelected = selectedIndustry === ind.id;
                return (
                  <Card
                    key={ind.id}
                    withBorder
                    p="md"
                    radius="md"
                    style={{
                      cursor: industryApplying ? 'wait' : 'pointer',
                      borderColor: isSelected ? 'var(--mantine-color-violet-6)' : undefined,
                      borderWidth: isSelected ? 2 : 1,
                      background: isSelected ? 'var(--mantine-color-violet-0)' : undefined,
                      opacity: industryApplying && !isSelected ? 0.5 : 1,
                      transition: 'all 0.15s',
                    }}
                    onClick={() => handleSelectIndustry(ind.id)}
                  >
                    <Stack gap={4} align="center">
                      <Text size="32px">{ind.emoji}</Text>
                      <Text fw={700} size="sm" ta="center">{ind.label}</Text>
                      <Text size="10px" c="dimmed" ta="center" lineClamp={2}>
                        {ind.description}
                      </Text>
                      {isSelected && industryApplied && (
                        <ThemeIcon size="sm" radius="xl" color="teal" variant="filled" mt={4}>
                          <IconCheck size={12} />
                        </ThemeIcon>
                      )}
                    </Stack>
                  </Card>
                );
              })}
            </SimpleGrid>

            {selectedIndustry && industryApplied && (
              <Paper withBorder p="md" radius="md" bg="violet.0">
                <Group gap={6} mb="xs">
                  <IconSparkles size={16} color="var(--mantine-color-violet-6)" />
                  <Text fw={700} size="sm">자동 셋업 완료</Text>
                </Group>
                {(() => {
                  const ind = INDUSTRY_LIST.find(i => i.id === selectedIndustry);
                  if (!ind) return null;
                  return (
                    <Stack gap={4}>
                      <Text size="xs">
                        ✅ <strong>캡션 템플릿 3개</strong>가 라이브러리에 등록됐어요 (콘텐츠 라이브러리 메뉴에서 확인)
                      </Text>
                      <Text size="xs">
                        💡 <strong>추천 채널:</strong> {ind.recommendedChannels.join(' · ')}
                      </Text>
                      <Text size="xs">
                        ⏰ <strong>추천 발행 빈도:</strong> {ind.recommendedFrequency}
                      </Text>
                    </Stack>
                  );
                })()}
              </Paper>
            )}
          </Stack>
        </Stepper.Step>

        {/* Step 3: 에이전트 설치 (기존 Step 2) */}
        <Stepper.Step
          label="에이전트 설치"
          description="라이선스 및 다운로드"
          icon={<IconDownload size="1.1rem" />}
        >
          <Stack py="xl" gap="lg">
            <Title order={3}>에이전트가 있어야 자동화가 작동합니다</Title>
            
            <Paper withBorder p="xl" radius="md" bg="var(--mantine-color-gray-0)">
              <Text fw={700} mb="xs">1. 내 라이선스 키</Text>
              <Group gap="sm">
                <Code style={{ fontSize: rem(20), padding: rem(12), flex: 1, textAlign: 'center' }}>
                  {license?.key || '발급 중...'}
                </Code>
                <CopyButton value={license?.key}>
                  {({ copied, copy }) => (
                    <Button color={copied ? 'teal' : 'blue'} onClick={copy} leftSection={copied ? <IconCheck size="1rem" /> : <IconCopy size="1rem" />}>
                      {copied ? '복사됨' : '복사'}
                    </Button>
                  )}
                </CopyButton>
              </Group>
              <Text size="xs" c="dimmed" mt="xs">
                유효기간: {license?.validUntil ? dayjs(license.validUntil).format('YYYY년 M월 D일') : '-'}까지 (14일 무료 체험)
              </Text>
            </Paper>

            <Stack gap="xs">
              <Text fw={700}>2. Windows 에이전트 다운로드</Text>
              <Button
                component="a"
                href="https://github.com/amazing-makers/marketingbot-agent/releases/latest/download/Marketingbot-Agent-Setup.exe"
                size="xl"
                fullWidth
                leftSection={<IconDownload size={24} />}
                color="blue"
              >
                마케팅봇 에이전트 다운로드 (.exe)
              </Button>
              <Text size="xs" c="dimmed" ta="center">
                Windows 10/11 64bit 전용 | 약 250MB
              </Text>
            </Stack>

            <Accordion variant="separated" radius="md">
              <Accordion.Item value="install-guide">
                <Accordion.Control>에이전트 설치 및 실행 가이드</Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    <Text size="sm">1. 다운로드한 <b>Marketingbot-Agent-Setup.exe</b> 파일을 실행하여 설치를 완료합니다.</Text>
                    <Text size="sm">2. 바탕화면의 마케팅봇 에이전트 아이콘을 더블 클릭하여 실행합니다.</Text>
                    <Text size="sm">3. 첫 화면에 위에서 복사한 <b>라이선스 키</b>를 붙여넣고 '활성화' 버튼을 누릅니다.</Text>
                    <Text size="sm">4. '활성화됨' 메시지가 나오면 에이전트가 백그라운드에서 작업을 처리할 준비가 끝납니다.</Text>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </Stack>
        </Stepper.Step>

        {/* Step 3: 채널 연결 */}
        <Stepper.Step 
          label="채널 연결" 
          description="SNS 계정 등록" 
          icon={<IconBrandInstagram size="1.1rem" />}
        >
          <Stack py="xl" gap="lg" align="center">
            <Title order={3} ta="center">에이전트가 준비되었나요?<br />이제 게시할 채널을 연결해보세요.</Title>
            <Text c="dimmed" ta="center">채널을 등록해야 캠페인을 생성할 수 있습니다.</Text>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" w="100%">
              <Card withBorder padding="md">
                <Group justify="space-between" mb="xs">
                  <ThemeIcon color="pink" variant="light"><IconBrandInstagram size="1.2rem" /></ThemeIcon>
                  <Button variant="subtle" size="xs" component="a" href="/dashboard/channels">연결하기</Button>
                </Group>
                <Text fw={500}>Instagram</Text>
                <Text size="xs" c="dimmed">이미지/텍스트 자동 게시</Text>
              </Card>
              <Card withBorder padding="md">
                <Group justify="space-between" mb="xs">
                  <ThemeIcon color="green" variant="light"><IconQuote size="1.2rem" /></ThemeIcon>
                  <Button variant="subtle" size="xs" component="a" href="/dashboard/channels">연결하기</Button>
                </Group>
                <Text fw={500}>Naver Blog/Cafe</Text>
                <Text size="xs" c="dimmed">국내 1위 블로그/카페 자동 포스팅</Text>
              </Card>
              <Card withBorder padding="md">
                <Group justify="space-between" mb="xs">
                  <ThemeIcon color="blue" variant="light"><IconBrandFacebook size="1.2rem" /></ThemeIcon>
                  <Button variant="subtle" size="xs" component="a" href="/dashboard/channels">연결하기</Button>
                </Group>
                <Text fw={500}>Facebook</Text>
                <Text size="xs" c="dimmed">페이지 및 타임라인 게시</Text>
              </Card>
              <Card withBorder padding="md">
                <Group justify="space-between" mb="xs">
                  <ThemeIcon color="dark" variant="light"><IconArrowRight size="1.2rem" /></ThemeIcon>
                  <Button variant="subtle" size="xs" component="a" href="/dashboard/channels">연결하기</Button>
                </Group>
                <Text fw={500}>Threads</Text>
                <Text size="xs" c="dimmed">텍스트 기반 SNS 자동화</Text>
              </Card>
            </SimpleGrid>
          </Stack>
        </Stepper.Step>

        {/* Step 4: 시작하기 */}
        <Stepper.Step 
          label="시작하기" 
          description="첫 캠페인 만들기" 
          icon={<IconRocket size="1.1rem" />}
        >
          <Stack py="xl" align="center" gap="xl">
            <ThemeIcon size={80} radius="xl" color="blue" variant="light">
              <IconRocket size={40} />
            </ThemeIcon>
            <Title order={2} ta="center">모든 준비가 끝났습니다!</Title>
            <Text ta="center" size="lg" maw={500}>
              이제 첫 캠페인을 생성하여 마케팅 자동화의 편리함을 직접 경험해보세요.
            </Text>
            
            <Stack w="100%" gap="sm">
              <Button size="lg" color="blue" fullWidth leftSection={<IconRocket size="1.2rem" />} component="a" href="/dashboard/campaigns/new">
                첫 캠페인 만들기
              </Button>
              <Button size="lg" variant="light" color="gray" fullWidth onClick={handleFinish} loading={loading}>
                대시보드로 이동하기
              </Button>
            </Stack>
          </Stack>
        </Stepper.Step>
      </Stepper>

      <Group justify="space-between" mt="xl">
        <Button variant="default" onClick={prevStep} disabled={active === 0}>
          이전
        </Button>
        {active < 4 ? (
          <Button
            onClick={nextStep}
            disabled={active === 1 && !industryApplied}
          >
            {active === 1 && !industryApplied ? '업종을 선택하세요' : '다음 단계'}
          </Button>
        ) : (
          <Button onClick={handleFinish} color="teal" loading={loading}>시작하기</Button>
        )}
      </Group>

      <Stack align="center" mt={40}>
        <Anchor component="button" size="xs" c="dimmed" onClick={handleFinish}>
          온보딩 가이드 건너뛰기
        </Anchor>
      </Stack>
    </Container>
  );
}
