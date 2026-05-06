import { Container, Title, Text, Stack, Paper, Group, Badge, ThemeIcon, Anchor, Box, Divider, SimpleGrid } from '@mantine/core';
import {
    IconRocket, IconKey, IconDownload, IconPlugConnected,
    IconSparkles, IconAlertTriangle, IconLifebuoy, IconChecklist,
    IconBrandInstagram, IconArticle, IconBrandFacebook, IconBrandThreads, IconUsersGroup,
    IconWebhook, IconBolt, IconCalendarMonth, IconCreditCard, IconShield, IconMessage,
} from '@tabler/icons-react';
import Link from 'next/link';

export const metadata = {
    title: '사용 안내 - 마케팅봇',
    description: '가입부터 첫 캠페인 발행까지 — 단계별 사용 가이드',
};
export const dynamic = 'force-dynamic';

interface SectionProps {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
    id: string;
}

function Section({ icon, title, children, id }: SectionProps) {
    return (
        <Paper withBorder p="xl" radius="md" id={id}>
            <Group gap="md" mb="md">
                <ThemeIcon size={40} radius="md" variant="light">
                    {icon}
                </ThemeIcon>
                <Title order={2} size="h3">{title}</Title>
            </Group>
            {children}
        </Paper>
    );
}

const TOC = [
    { id: 'start', label: '1. 시작하기', icon: '🚀' },
    { id: 'license', label: '2. 라이센스 키', icon: '🔑' },
    { id: 'agent', label: '3. 에이전트 설치', icon: '⬇️' },
    { id: 'channels', label: '4. 채널 연결', icon: '🔌' },
    { id: 'campaign', label: '5. 첫 캠페인', icon: '✨' },
    { id: 'troubleshooting', label: '6. 문제 해결', icon: '⚠️' },
    { id: 'faq', label: '7. 자주 묻는 질문', icon: '💬' },
    { id: 'support', label: '8. 고객 지원', icon: '🛟' },
];

const CHANNELS = [
    { type: 'INSTAGRAM', label: 'Instagram', icon: IconBrandInstagram, color: 'pink', tip: 'Instagram 계정 ID/비밀번호. 첫 실행 시 수동 로그인 1회.' },
    { type: 'NAVER_BLOG', label: '네이버 블로그', icon: IconArticle, color: 'green', tip: '네이버 ID/비밀번호. 카페와 같은 계정이면 세션 공유.' },
    { type: 'NAVER_CAFE', label: '네이버 카페', icon: IconUsersGroup, color: 'green', tip: 'cafeId + menuId 추가 입력 필요. 카페 글쓰기 권한 필수.' },
    { type: 'FACEBOOK', label: 'Facebook', icon: IconBrandFacebook, color: 'blue', tip: '개인 타임라인 또는 페이지(pageId) 게시 선택.' },
    { type: 'THREADS', label: 'Threads', icon: IconBrandThreads, color: 'dark', tip: 'Instagram 계정 사용. Instagram 과는 별도 세션.' },
];

export default function HelpPage() {
    return (
        <Box style={{ minHeight: '100vh' }} bg="gray.0">
            <Container size="lg" py={60}>
                <Stack gap="xl">
                    <Stack gap="xs">
                        <Title order={1}>마케팅봇 사용 안내</Title>
                        <Text c="dimmed" size="lg">
                            가입부터 첫 캠페인 발행까지 5분이면 끝납니다.
                        </Text>
                    </Stack>

                    {/* Phase 39 — 빠른 시작 카드 그리드 */}
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                        <QuickCard
                            href="/dashboard"
                            icon={<IconRocket size={20} />}
                            color="violet"
                            title="첫 캠페인 만들기"
                            desc="대시보드 → 캠페인 작성. 한 번 쓰면 모든 채널에 자동 발행"
                        />
                        <QuickCard
                            href="/dashboard/campaigns/series"
                            icon={<IconBolt size={20} />}
                            color="orange"
                            title="자동 발행 시리즈"
                            desc="한 번 설정 → 며칠·몇주 동안 자동으로 게시물 만들어 올림"
                        />
                        <QuickCard
                            href="/dashboard/channels"
                            icon={<IconPlugConnected size={20} />}
                            color="blue"
                            title="채널 연결"
                            desc="인스타·페이스북·블로그·디스코드 등 5개+ 동시 등록"
                        />
                        <QuickCard
                            href="/dashboard/ai-compare"
                            icon={<IconSparkles size={20} />}
                            color="grape"
                            title="AI 모델 비교"
                            desc="같은 프롬프트로 4개 AI 동시 호출 → 가장 좋은 결과 선택"
                        />
                        <QuickCard
                            href="/help/api"
                            icon={<IconWebhook size={20} />}
                            color="teal"
                            title="API · Webhook"
                            desc="Zapier/Make/n8n 통합 — 외부 자동화에서 호출"
                        />
                        <QuickCard
                            href="/dashboard/settings/billing"
                            icon={<IconCreditCard size={20} />}
                            color="green"
                            title="플랜 업그레이드"
                            desc="STARTER 9,900원부터. 14일 무료 체험"
                        />
                    </SimpleGrid>

                    {/* FAQ 빠른 답변 */}
                    <Paper withBorder p="lg" radius="md" bg="white">
                        <Group gap={6} mb="md">
                            <IconMessage size={18} />
                            <Title order={4}>자주 묻는 질문 (요약)</Title>
                        </Group>
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                            <Box>
                                <Text fw={700} size="sm" mb={4}>Q. 인스타그램이 막히지 않나요?</Text>
                                <Text size="xs" c="dimmed">
                                    데스크톱 에이전트가 사람처럼 행동합니다 (속도 제한, 랜덤 지연). 한 계정에 평소 사용량 이상으로 발행하지 마세요.
                                </Text>
                            </Box>
                            <Box>
                                <Text fw={700} size="sm" mb={4}>Q. AI 키 없이도 쓸 수 있나요?</Text>
                                <Text size="xs" c="dimmed">
                                    예. 무료 엔진 (Pollinations, Gemini Flash 무료tier, Groq, Ollama) 자동 폴백. 본인 키 등록 시 우선 사용.
                                </Text>
                            </Box>
                            <Box>
                                <Text fw={700} size="sm" mb={4}>Q. 14일 후 데이터는 어떻게 되나요?</Text>
                                <Text size="xs" c="dimmed">
                                    유지됩니다. FREE 플랜으로 강등되어 일부 기능만 제한 (채널 2개, 일일 task 5개). 결제 시 즉시 복구.
                                </Text>
                            </Box>
                            <Box>
                                <Text fw={700} size="sm" mb={4}>Q. 데이터를 모두 다운로드할 수 있나요?</Text>
                                <Text size="xs" c="dimmed">
                                    예. 프로필 페이지에서 "내 데이터 전체 다운로드" 버튼으로 JSON 익스포트 (GDPR Article 20).
                                </Text>
                            </Box>
                        </SimpleGrid>
                    </Paper>

                    {/* TOC */}
                    <Paper withBorder p="md" radius="md" bg="white">
                        <Text fw={700} mb="xs" size="sm">상세 가이드</Text>
                        <Group gap="md">
                            {TOC.map(t => (
                                <Anchor key={t.id} href={`#${t.id}`} size="sm" c="dimmed">
                                    {t.icon} {t.label}
                                </Anchor>
                            ))}
                            <Anchor component={Link} href="/help/api" size="sm" c="violet" fw={600}>
                                🔗 API 문서 →
                            </Anchor>
                        </Group>
                    </Paper>

                    <Section icon={<IconRocket size={20} />} title="1. 시작하기" id="start">
                        <Stack gap="sm">
                            <Text>
                                마케팅봇은 <strong>클라우드 대시보드 + 데스크톱 에이전트</strong> 두 부분으로 동작합니다.
                            </Text>
                            <Box>
                                <Text fw={600} mb={4}>클라우드 대시보드</Text>
                                <Text size="sm" c="dimmed">
                                    웹 브라우저에서 접속해 채널 등록·캠페인 작성·결과 확인 등 모든 관리 작업을 수행합니다.
                                </Text>
                            </Box>
                            <Box>
                                <Text fw={600} mb={4}>데스크톱 에이전트 (서브컴퓨터 권장)</Text>
                                <Text size="sm" c="dimmed">
                                    실제 SNS 자동 게시를 사용자 컴퓨터에서 수행합니다. 서브컴퓨터에 설치하면 메인 작업과 분리되어 안정적입니다.
                                </Text>
                            </Box>
                            <Paper p="sm" bg="blue.0" withBorder>
                                <Text size="sm">
                                    <strong>왜 데스크톱 앱?</strong> SNS 자동화는 사용자의 IP·세션·계정으로 진행되어야 차단되지 않습니다.
                                    클라우드에서 직접 처리하면 모든 사용자 IP 가 공유되어 즉시 차단됩니다.
                                </Text>
                            </Paper>
                        </Stack>
                    </Section>

                    <Section icon={<IconKey size={20} />} title="2. 라이센스 키" id="license">
                        <Stack gap="sm">
                            <Text>
                                <strong>회원가입 즉시</strong> <code>MB-XXXX-XXXX-XXXX-XXXX</code> 형태의 라이센스 키가 자동 발급됩니다 (14일 무료 체험).
                            </Text>
                            <Text size="sm">확인 위치:</Text>
                            <Stack gap={4} ml="md">
                                <Text size="sm">• 가입 직후 자동으로 표시되는 <strong>온보딩 화면</strong></Text>
                                <Text size="sm">• 대시보드 상단 헤더의 <strong>"라이센스" 위젯</strong> 클릭</Text>
                                <Text size="sm">• <Anchor href="/dashboard/agent">에이전트 관리 페이지</Anchor></Text>
                                <Text size="sm">• 가입 환영 이메일</Text>
                            </Stack>
                            <Paper p="sm" bg="yellow.0" withBorder>
                                <Group gap="xs" wrap="nowrap" align="flex-start">
                                    <IconAlertTriangle size={16} color="var(--mantine-color-yellow-7)" />
                                    <Text size="sm">
                                        라이센스 키는 비공개로 보관하세요. 노출 시 다른 PC 에서 자동화 실행 가능.
                                    </Text>
                                </Group>
                            </Paper>
                        </Stack>
                    </Section>

                    <Section icon={<IconDownload size={20} />} title="3. 에이전트 설치" id="agent">
                        <Stack gap="sm">
                            <Text>
                                <Anchor href="/dashboard/agent">에이전트 관리</Anchor> 페이지에서 Windows 인스톨러를 다운로드 → 설치 → 실행.
                            </Text>
                            <Stack gap={4}>
                                <Text size="sm" fw={600}>설치 절차</Text>
                                <Text size="sm">1. 다운로드한 <code>Marketingbot Agent Setup.exe</code> 더블클릭</Text>
                                <Text size="sm">2. 설치 위치 선택 (기본 권장)</Text>
                                <Text size="sm">3. 설치 완료 후 마케팅봇 에이전트 자동 실행</Text>
                                <Text size="sm">4. 첫 화면에 라이센스 키 붙여넣기</Text>
                                <Text size="sm">5. "활성화" 클릭 → 1분 후부터 자동 폴링 시작</Text>
                            </Stack>
                            <Paper p="sm" bg="gray.0" withBorder>
                                <Text size="xs" c="dimmed">
                                    <strong>요구 사항</strong>: Windows 10/11 64bit · 약 250MB 디스크 · 인터넷 연결
                                </Text>
                            </Paper>
                            <Paper p="sm" bg="green.0" withBorder>
                                <Text size="sm">
                                    💡 <strong>자동 업데이트 내장</strong>: 새 버전 출시 시 백그라운드 자동 다운로드 → 다음 시작 시 적용.
                                </Text>
                            </Paper>
                        </Stack>
                    </Section>

                    <Section icon={<IconPlugConnected size={20} />} title="4. 채널 연결" id="channels">
                        <Stack gap="sm">
                            <Text>
                                <Anchor href="/dashboard/channels">채널 관리</Anchor>에서 자동 게시할 SNS 계정을 등록.
                            </Text>
                            <Text size="sm" c="dimmed">현재 지원 채널 (5종)</Text>
                            <Stack gap="xs">
                                {CHANNELS.map(ch => (
                                    <Paper key={ch.type} p="md" withBorder radius="sm">
                                        <Group gap="md" wrap="nowrap" align="flex-start">
                                            <ThemeIcon variant="light" color={ch.color} size={36} radius="md">
                                                <ch.icon size={20} />
                                            </ThemeIcon>
                                            <Box>
                                                <Text fw={600} size="sm">{ch.label}</Text>
                                                <Text size="xs" c="dimmed">{ch.tip}</Text>
                                            </Box>
                                        </Group>
                                    </Paper>
                                ))}
                            </Stack>
                            <Paper p="sm" bg="blue.0" withBorder>
                                <Text size="sm">
                                    🔒 <strong>보안</strong>: SNS 비밀번호는 <strong>AES-256-GCM</strong> 으로 암호화되어 저장됩니다.
                                    실제 게시는 사용자 PC 의 에이전트에서 직접 수행 = 평문 비밀번호가 외부로 나가지 않음.
                                </Text>
                            </Paper>
                        </Stack>
                    </Section>

                    <Section icon={<IconSparkles size={20} />} title="5. 첫 캠페인" id="campaign">
                        <Stack gap="sm">
                            <Stack gap={4}>
                                <Text size="sm" fw={600}>가장 빠른 방법: 템플릿</Text>
                                <Text size="sm">
                                    <Anchor href="/dashboard/campaigns/templates">템플릿 갤러리</Anchor>에서
                                    업종별 템플릿(음식점/미용실/카페 등 10종)을 선택 → 변수만 채우면 자동으로 본문 완성.
                                </Text>
                            </Stack>
                            <Divider my="xs" />
                            <Stack gap={4}>
                                <Text size="sm" fw={600}>직접 작성</Text>
                                <Text size="sm">
                                    <Anchor href="/dashboard/campaigns/new">새 캠페인</Anchor>에서:
                                </Text>
                                <Stack gap={2} ml="md">
                                    <Text size="sm">1. 캠페인 이름 입력</Text>
                                    <Text size="sm">2. 발행 채널 선택 (1개 이상, 멀티 가능)</Text>
                                    <Text size="sm">3. 콘텐츠 본문 + 이미지 URL (선택)</Text>
                                    <Text size="sm">4. 예약 발행 시각 설정</Text>
                                    <Text size="sm">5. "캠페인 생성 및 예약" 클릭</Text>
                                </Stack>
                            </Stack>
                            <Paper p="sm" bg="green.0" withBorder>
                                <Text size="sm">
                                    ⏰ <strong>예약 시각이 되면</strong> 에이전트가 1분 내에 작업을 가져가 자동 실행 → 결과가 캠페인 상세 페이지에 표시됩니다.
                                </Text>
                            </Paper>
                            <Paper p="sm" bg="yellow.0" withBorder>
                                <Group gap="xs" wrap="nowrap" align="flex-start">
                                    <IconAlertTriangle size={16} color="var(--mantine-color-yellow-7)" />
                                    <Text size="sm">
                                        <strong>첫 게시 전 수동 로그인 1회</strong> 필요 — 에이전트가 띄운 브라우저 창에서 직접 SNS 로그인.
                                        이후 세션 저장되어 자동 로그인 됩니다.
                                    </Text>
                                </Group>
                            </Paper>
                        </Stack>
                    </Section>

                    <Section icon={<IconAlertTriangle size={20} />} title="6. 문제 해결" id="troubleshooting">
                        <Stack gap="md">
                            <Box>
                                <Text fw={600} size="sm" mb={4}>에이전트가 작업을 가져가지 않음</Text>
                                <Stack gap={2} ml="md">
                                    <Text size="sm">• 에이전트 실행 중인지 (트레이 아이콘 확인)</Text>
                                    <Text size="sm">• 라이센스 키 유효한지 (대시보드에서 확인)</Text>
                                    <Text size="sm">• 인터넷 연결 정상인지</Text>
                                    <Text size="sm">• 1분 폴링 주기라 즉시 안 보일 수 있음 — 잠시 대기</Text>
                                </Stack>
                            </Box>
                            <Box>
                                <Text fw={600} size="sm" mb={4}>FAILED 상태로 끝남</Text>
                                <Stack gap={2} ml="md">
                                    <Text size="sm">• 캠페인 상세 페이지에서 errorLog 확인</Text>
                                    <Text size="sm">• "세션 만료" 메시지 → 채널 재등록 또는 에이전트에서 수동 재로그인</Text>
                                    <Text size="sm">• "차단" 또는 "캡차" 메시지 → 24시간 휴식 후 재시도, 게시 빈도 줄이기</Text>
                                    <Text size="sm">• "다시 시도" 버튼으로 1클릭 재시도 가능</Text>
                                </Stack>
                            </Box>
                            <Box>
                                <Text fw={600} size="sm" mb={4}>SNS 계정 차단 위험</Text>
                                <Stack gap={2} ml="md">
                                    <Text size="sm">• 메인 계정 X — 마케팅 전용 부계정 사용 권장</Text>
                                    <Text size="sm">• 하루 게시 횟수 적정선 (각 채널 5~10개 이하)</Text>
                                    <Text size="sm">• 같은 콘텐츠 반복 X — 약간의 변형 추가</Text>
                                    <Text size="sm">• 이상 시간대 발행 X — 사람의 활동 시간대 권장</Text>
                                </Stack>
                            </Box>
                        </Stack>
                    </Section>

                    <Section icon={<IconChecklist size={20} />} title="7. 자주 묻는 질문" id="faq">
                        <Stack gap="md">
                            <Box>
                                <Text fw={600} size="sm">Q. 14일 무료 체험 끝나면 어떻게 되나요?</Text>
                                <Text size="sm" c="dimmed" mt={4}>
                                    카드 등록 없이 가입 시 자동 결제되지 않습니다. 체험 종료 후 유료 전환을 원하시면 결제 페이지에서 플랜 선택.
                                </Text>
                            </Box>
                            <Box>
                                <Text fw={600} size="sm">Q. 여러 PC 에서 같은 라이센스를 사용할 수 있나요?</Text>
                                <Text size="sm" c="dimmed" mt={4}>
                                    플랜에 따라 다릅니다. Lite 1대, Basic 2대, Pro 5대까지 동시 활성. 같은 SNS 계정을 여러 PC 에서 동시 사용은 차단 위험으로 비권장.
                                </Text>
                            </Box>
                            <Box>
                                <Text fw={600} size="sm">Q. macOS 지원 예정인가요?</Text>
                                <Text size="sm" c="dimmed" mt={4}>
                                    2026년 하반기 출시 예정. 현재는 Windows 10/11 만 지원합니다.
                                </Text>
                            </Box>
                            <Box>
                                <Text fw={600} size="sm">Q. 에이전트 자동 업데이트는 어떻게 동작하나요?</Text>
                                <Text size="sm" c="dimmed" mt={4}>
                                    백그라운드에서 6시간마다 새 버전 확인 → 자동 다운로드 → "다음 시작 시 적용" 또는 즉시 재시작 옵션.
                                </Text>
                            </Box>
                            <Box>
                                <Text fw={600} size="sm">Q. 환불 가능한가요?</Text>
                                <Text size="sm" c="dimmed" mt={4}>
                                    결제 후 7일 내 미사용 시 100% 환불. 사용 중에도 일할 계산. 자세한 내용은 <Anchor href="/legal/refund">환불정책</Anchor> 참고.
                                </Text>
                            </Box>
                        </Stack>
                    </Section>

                    <Section icon={<IconLifebuoy size={20} />} title="8. 고객 지원" id="support">
                        <Stack gap="sm">
                            <Text>해결 안 되는 문제는 아래로 문의해주세요.</Text>
                            <Stack gap={4} ml="md">
                                <Text size="sm">📧 이메일: <Anchor href="mailto:help@amakers.co.kr">help@amakers.co.kr</Anchor></Text>
                                <Text size="sm">📞 전화: 1600-9221</Text>
                                <Text size="sm">⏰ 응대 시간: 평일 10:00 ~ 18:00 (주말·공휴일 제외)</Text>
                            </Stack>
                            <Paper p="sm" bg="gray.0" withBorder>
                                <Text size="xs" c="dimmed">
                                    문의 시 다음 정보를 알려주시면 더 빠르게 해결됩니다:<br />
                                    • 가입 이메일<br />
                                    • 문제가 발생한 채널/캠페인 ID<br />
                                    • 에러 메시지 또는 스크린샷<br />
                                    • 에이전트 버전 (대시보드 - 에이전트 관리에서 확인)
                                </Text>
                            </Paper>
                        </Stack>
                    </Section>
                </Stack>
            </Container>
        </Box>
    );
}

function QuickCard({ href, icon, color, title, desc }: {
    href: string;
    icon: React.ReactNode;
    color: string;
    title: string;
    desc: string;
}) {
    return (
        <Paper
            component={Link}
            href={href}
            withBorder
            p="md"
            radius="md"
            bg="white"
            style={{
                textDecoration: 'none',
                color: 'inherit',
                transition: 'border-color 0.15s, transform 0.15s',
                cursor: 'pointer',
                display: 'block',
            }}
        >
            <Group gap="sm" mb={6}>
                <ThemeIcon size={36} radius="md" variant="light" color={color}>
                    {icon}
                </ThemeIcon>
                <Text fw={700} size="sm">{title}</Text>
            </Group>
            <Text size="xs" c="dimmed">{desc}</Text>
        </Paper>
    );
}
