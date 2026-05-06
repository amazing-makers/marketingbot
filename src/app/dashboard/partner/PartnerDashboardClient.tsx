'use client';

import {
    Container, Title, Text, Stack, Group, Paper, Button, TextInput, Select, Badge,
    Card, SimpleGrid, ThemeIcon, CopyButton, ActionIcon, Tooltip, Modal, Table, Box, Tabs,
    Progress, RingProgress, Anchor, Code, Divider, Alert,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import {
    IconUsersGroup, IconCash, IconUsers, IconCheck, IconCopy,
    IconLink, IconQrcode, IconRosetteDiscountCheck, IconBriefcase, IconBuildingStore,
    IconCode, IconPalette, IconBolt, IconCloud, IconChevronRight, IconExternalLink,
    IconBook, IconHelpCircle, IconBrandDiscord, IconRocket, IconFileText, IconChartBar,
} from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';
import { registerAsReseller, createReferralCode } from '@/app/actions/resellerActions';
import { PARTNER_TIERS } from '@/lib/partner/tiers';
import BarChart from '@/components/charts/BarChart';

type Summary = Awaited<ReturnType<typeof import('@/app/actions/resellerActions')['getMyResellerSummary']>>;

interface ClientItem {
    id: string;
    clientName: string;
    contactName: string | null;
    contactEmail: string | null;
    industry: string | null;
    monthlyFee: number | null;
    status: 'ACTIVE' | 'PAUSED' | 'CHURNED';
    startedAt: string;
    endedAt: string | null;
    workspace: { id: string; name: string; slug: string; brandColor: string | null; memberCount: number };
}

export default function PartnerDashboardClient({
    summary,
    clients,
    accessError,
}: {
    summary: Summary;
    clients: ClientItem[];
    accessError?: string | null;
}) {
    if (!summary) return <PartnerSignupView accessError={accessError} />;
    return <PartnerView summary={summary} clients={clients} accessError={accessError} />;
}

// ════════════════════════════════════════════════════════════
//  미가입 — 가입 폼
// ════════════════════════════════════════════════════════════

function PartnerSignupView({ accessError }: { accessError?: string | null }) {
    const [submitting, setSubmitting] = useState(false);
    const form = useForm({
        initialValues: {
            name: '',
            contactEmail: '',
            taxStatus: 'INDIVIDUAL' as 'INDIVIDUAL' | 'BUSINESS',
            businessNumber: '',
            bankAccount: '',
        },
        validate: {
            name: (v) => (v.length < 2 ? '이름을 입력하세요' : null),
            contactEmail: (v) => (/^\S+@\S+$/.test(v) ? null : '유효한 이메일'),
        },
    });

    const handleSubmit = async (values: typeof form.values) => {
        setSubmitting(true);
        try {
            const r = await registerAsReseller(values);
            notifications.show({
                color: 'teal',
                title: '🎉 파트너 등록 완료',
                message: `기본 추천 코드: ${r.defaultCode}`,
                autoClose: 7000,
            });
            window.location.reload();
        } catch (e: any) {
            notifications.show({ color: 'red', title: '등록 실패', message: e?.message || '실패' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container size="md" py={{ base: "md", sm: "xl" }}>
            <Stack gap="lg">
                <Box>
                    <Title order={2}>🤝 파트너 프로그램</Title>
                    <Text c="dimmed" size="sm">
                        개발자·리셀러·디자이너·마케팅 에이전시를 위한 amakers 파트너 프로그램.
                        고객사 대행 운영, 추천 수수료, 전용 리소스를 제공합니다.
                    </Text>
                </Box>

                {accessError === 'not-partner' && (
                    <Alert color="orange" icon={<IconUsers size={16} />} title="파트너 권한 필요">
                        고객사·에이전트 관리는 <strong>승인된 파트너</strong>만 사용할 수 있어요.
                        아래 양식으로 파트너 등록 후 다시 시도해주세요.
                    </Alert>
                )}
                {accessError === 'suspended' && (
                    <Alert color="red" icon={<IconUsers size={16} />} title="계정 정지됨">
                        파트너 계정이 일시 정지되었습니다. 관리자(help@amakers.co.kr)에게 문의해주세요.
                    </Alert>
                )}

                <Paper withBorder p="lg" radius="md">
                    <Title order={4} mb="sm">💼 누가 가입하면 좋나요?</Title>
                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                        <PersonaCard icon={IconCode} title="개발자" desc="API·webhook 으로 자기 솔루션에 amakers 임베드. 자동화 통합." />
                        <PersonaCard icon={IconUsers} title="리셀러·영업" desc="고객 발굴 + 추천 코드로 평생 수수료 수령. 영업 자료 제공." />
                        <PersonaCard icon={IconPalette} title="디자이너·에이전시" desc="여러 고객사 마케팅을 한 계정에서 대행. 자동 리포트·브랜드 키트." />
                    </SimpleGrid>
                </Paper>

                <Paper withBorder p="lg" radius="md">
                    <Title order={4} mb="sm">🏆 파트너 등급제</Title>
                    <Text size="xs" c="dimmed" mb="md">누적 commission 에 따라 자동 승급. 등급이 높을수록 수수료율 ↑ 와 전용 혜택.</Text>
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                        {PARTNER_TIERS.map((t) => (
                            <Card key={t.tier} withBorder p="sm" radius="md" style={{ borderColor: `var(--mantine-color-${t.color}-3)` }}>
                                <Text size="lg">{t.emoji}</Text>
                                <Text fw={700} size="sm">{t.label}</Text>
                                <Text size="xs" c="dimmed">{t.minLifetimeCommissionKrw === 0 ? '신규 가입' : `누적 ₩${(t.minLifetimeCommissionKrw / 10000).toLocaleString()}만원~`}</Text>
                                <Badge size="xs" mt={4} color={t.color} variant="light">{(t.commissionRate * 100).toFixed(0)}% 수수료</Badge>
                            </Card>
                        ))}
                    </SimpleGrid>
                </Paper>

                <Paper withBorder p="lg" radius="md">
                    <Title order={4} mb="md">📝 가입 신청</Title>
                    <form onSubmit={form.onSubmit(handleSubmit)}>
                        <Stack gap="sm">
                            <TextInput label="이름 / 회사명" required {...form.getInputProps('name')} />
                            <TextInput label="연락처 이메일" placeholder="정산 통지를 받을 이메일" required {...form.getInputProps('contactEmail')} />
                            <Select
                                label="세금 처리 방식"
                                data={[
                                    { value: 'INDIVIDUAL', label: '개인 (3.3% 원천징수 후 송금)' },
                                    { value: 'BUSINESS', label: '사업자 (세금계산서 발행)' },
                                ]}
                                allowDeselect={false}
                                {...form.getInputProps('taxStatus')}
                            />
                            {form.values.taxStatus === 'BUSINESS' && (
                                <TextInput label="사업자 번호" placeholder="000-00-00000" required {...form.getInputProps('businessNumber')} />
                            )}
                            <TextInput
                                label="입금 계좌 (선택)"
                                placeholder="예: 신한은행 110-123-456789 (홍길동)"
                                {...form.getInputProps('bankAccount')}
                            />
                            <Button type="submit" loading={submitting} color="violet" size="md" mt="sm">
                                🚀 파트너로 등록하기
                            </Button>
                        </Stack>
                    </form>
                </Paper>
            </Stack>
        </Container>
    );
}

function PersonaCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
    return (
        <Card withBorder p="md" radius="md">
            <ThemeIcon size={36} radius="md" variant="light" color="violet" mb="sm"><Icon size={20} /></ThemeIcon>
            <Text fw={700} size="sm" mb={4}>{title}</Text>
            <Text size="xs" c="dimmed">{desc}</Text>
        </Card>
    );
}

// ════════════════════════════════════════════════════════════
//  가입 완료 — 메인 대시보드
// ════════════════════════════════════════════════════════════

function PartnerView({ summary, clients }: { summary: NonNullable<Summary>; clients: ClientItem[]; accessError?: string | null }) {
    const { tierInfo } = summary;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://marketingbot.amakers.co.kr';

    const totalReferrals = summary.recentReferrals.length;
    const paidUsers = summary.recentReferrals.filter(u => u.subscription && u.subscription.plan !== 'FREE').length;
    const activeClients = clients.filter(c => c.status === 'ACTIVE').length;

    return (
        <Container size="xl" py={{ base: "md", sm: "xl" }}>
            <Stack gap="md">
                {/* === 헤더 + 티어 배지 === */}
                <Group justify="space-between" wrap="wrap">
                    <Stack gap={2}>
                        <Group gap={6}><IconBriefcase size={24} /><Title order={2}>파트너 대시보드</Title></Group>
                        <Group gap={6}>
                            <Text c="dimmed" size="sm">{summary.reseller.name}</Text>
                            <Badge color={summary.reseller.status === 'ACTIVE' ? 'teal' : 'red'} size="sm" variant="light">
                                {summary.reseller.status}
                            </Badge>
                        </Group>
                    </Stack>
                    <Group gap="sm">
                        {clients.length > 0 && (
                            <Button
                                component={Link}
                                href="/dashboard/partner/overview"
                                variant="light"
                                color="blue"
                                leftSection={<IconChartBar size={14} />}
                            >
                                고객사 통합 통계
                            </Button>
                        )}
                        <TierBadge tierInfo={tierInfo} />
                    </Group>
                </Group>

                {/* === 핵심 지표 6개 === */}
                <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="md">
                    <StatCard color="teal" label="정산 대기" value={`₩${(summary.pendingTotal / 1000).toFixed(0)}K`} hint={`${summary.pendingCount}건`} />
                    <StatCard color="blue" label="누적 수익" value={`₩${(summary.lifetimeCommission / 10000).toFixed(0)}만`} hint={`완료 ${summary.paidCount}건`} />
                    <StatCard color="violet" label="추천 사용자" value={`${totalReferrals}명`} hint={`유료 ${paidUsers}명`} />
                    <StatCard color="orange" label="관리 고객사" value={`${activeClients}곳`} hint={`전체 ${clients.length}곳`} />
                    <StatCard color="grape" label="활성 코드" value={`${summary.reseller.referralCodes.filter(c => c.active).length}`} />
                    <StatCard color={tierInfo.current.color} label="현재 등급" value={`${tierInfo.current.emoji} ${tierInfo.current.label}`} hint={`${(tierInfo.current.commissionRate * 100).toFixed(0)}% 수수료`} />
                </SimpleGrid>

                {/* === 티어 진행 + 시계열 차트 === */}
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <TierProgressCard tierInfo={tierInfo} lifetime={summary.lifetimeCommission} />
                    <Paper withBorder p="md" radius="md">
                        <Group justify="space-between" mb="sm">
                            <Group gap={6}><IconChartBar size={16} /><Text fw={700} size="sm">최근 6개월 수수료 추이</Text></Group>
                        </Group>
                        <BarChart
                            data={summary.monthlySeries.map(m => ({ label: m.label, value: m.commission }))}
                            height={140}
                            color="var(--mantine-color-violet-5)"
                            formatValue={(n) => `₩${n.toLocaleString()}`}
                        />
                    </Paper>
                </SimpleGrid>

                {/* === 메인 탭 === */}
                <Tabs defaultValue="referral" mt="md">
                    <Tabs.List>
                        <Tabs.Tab value="referral" leftSection={<IconLink size={14} />}>🔗 추천</Tabs.Tab>
                        <Tabs.Tab value="clients" leftSection={<IconBuildingStore size={14} />}>🏪 고객사 ({clients.length})</Tabs.Tab>
                        <Tabs.Tab value="developer" leftSection={<IconCode size={14} />}>💻 개발자 도구</Tabs.Tab>
                        <Tabs.Tab value="resources" leftSection={<IconBook size={14} />}>📚 리소스</Tabs.Tab>
                    </Tabs.List>

                    {/* === 추천 === */}
                    <Tabs.Panel value="referral" pt="md">
                        <ReferralPanel summary={summary} baseUrl={baseUrl} />
                    </Tabs.Panel>

                    {/* === 고객사 === */}
                    <Tabs.Panel value="clients" pt="md">
                        <ClientsPanel clients={clients} />
                    </Tabs.Panel>

                    {/* === 개발자 도구 === */}
                    <Tabs.Panel value="developer" pt="md">
                        <DeveloperPanel baseUrl={baseUrl} />
                    </Tabs.Panel>

                    {/* === 리소스 === */}
                    <Tabs.Panel value="resources" pt="md">
                        <ResourcesPanel tierInfo={tierInfo} />
                    </Tabs.Panel>
                </Tabs>
            </Stack>
        </Container>
    );
}

// ────────────────────────────────────────────────────────────
//  개별 컴포넌트
// ────────────────────────────────────────────────────────────

function TierBadge({ tierInfo }: { tierInfo: NonNullable<Summary>['tierInfo'] }) {
    const { current } = tierInfo;
    return (
        <Card withBorder p="sm" radius="md" style={{ background: `var(--mantine-color-${current.color}-0)`, borderColor: `var(--mantine-color-${current.color}-4)` }}>
            <Group gap={6}>
                <Text size="24px">{current.emoji}</Text>
                <Stack gap={0}>
                    <Text fw={800} size="md">{current.label} 파트너</Text>
                    <Text size="xs" c="dimmed">{(current.commissionRate * 100).toFixed(0)}% 수수료</Text>
                </Stack>
            </Group>
        </Card>
    );
}

function TierProgressCard({ tierInfo, lifetime }: { tierInfo: NonNullable<Summary>['tierInfo']; lifetime: number }) {
    const { current, next, progressPercent, amountToNextKrw } = tierInfo;
    return (
        <Paper withBorder p="md" radius="md">
            <Group gap={6} mb="sm">
                <IconRosetteDiscountCheck size={16} />
                <Text fw={700} size="sm">파트너 등급 진행</Text>
            </Group>
            <Group gap="md" align="center">
                <RingProgress
                    size={90}
                    thickness={10}
                    sections={[{ value: progressPercent, color: current.color }]}
                    label={<Text ta="center" size="xs" fw={700}>{progressPercent}%</Text>}
                />
                <Stack gap={2} style={{ flex: 1 }}>
                    <Group gap={4}>
                        <Text size="lg">{current.emoji}</Text>
                        <Text fw={700}>{current.label}</Text>
                        {next && <IconChevronRight size={14} color="var(--mantine-color-dimmed)" />}
                        {next && <Text size="lg">{next.emoji}</Text>}
                        {next && <Text fw={500} c="dimmed">{next.label}</Text>}
                    </Group>
                    {next ? (
                        <>
                            <Text size="xs" c="dimmed">
                                다음 등급까지 <Text component="span" fw={700} c={current.color}>₩{amountToNextKrw.toLocaleString()}</Text> 남음
                            </Text>
                            <Text size="xs" c="dimmed">누적 ₩{lifetime.toLocaleString()} / ₩{next.minLifetimeCommissionKrw.toLocaleString()}</Text>
                        </>
                    ) : (
                        <Text size="xs" c={current.color} fw={700}>🎉 최고 등급 달성!</Text>
                    )}
                </Stack>
            </Group>
            <Progress value={progressPercent} color={current.color} mt="md" size="xs" />
            <Group gap={4} mt="sm">
                {current.perks.slice(0, 3).map(p => (
                    <Badge key={p} size="xs" variant="light" color={current.color}>{p}</Badge>
                ))}
            </Group>
        </Paper>
    );
}

// === 추천 탭 ===
function ReferralPanel({ summary, baseUrl }: { summary: NonNullable<Summary>; baseUrl: string }) {
    const [codeModal, codeModalCtl] = useDisclosure(false);
    const [submitting, setSubmitting] = useState(false);
    const codeForm = useForm({ initialValues: { code: '', description: '' } });

    const handleAddCode = async (values: typeof codeForm.values) => {
        setSubmitting(true);
        try {
            await createReferralCode(values);
            notifications.show({ color: 'teal', title: '코드 추가됨', message: values.code });
            codeModalCtl.close();
            codeForm.reset();
            window.location.reload();
        } catch (e: any) {
            notifications.show({ color: 'red', title: '실패', message: e?.message || '실패' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Stack gap="md">
            <Paper withBorder p="md" radius="md">
                <Group justify="space-between" mb="sm">
                    <Title order={4}>🔗 내 추천 코드</Title>
                    <Button size="compact-sm" variant="light" onClick={codeModalCtl.open}>+ 코드 추가</Button>
                </Group>
                <Stack gap="xs">
                    {summary.reseller.referralCodes.map(c => {
                        const link = `${baseUrl}/register?ref=${c.code}`;
                        return (
                            <Card key={c.id} withBorder p="md" radius="md">
                                <Group justify="space-between" wrap="wrap">
                                    <Stack gap={2}>
                                        <Group gap={6}>
                                            <Badge size="lg" color={c.active ? 'violet' : 'gray'} variant="light">{c.code}</Badge>
                                            <Text size="xs" c="dimmed">추천 {c._count.referrals}명</Text>
                                        </Group>
                                        {c.description && <Text size="xs" c="dimmed">{c.description}</Text>}
                                    </Stack>
                                    <Group gap={4}>
                                        <CopyButton value={link}>
                                            {({ copied, copy }) => (
                                                <Tooltip label={copied ? '복사됨!' : '링크 복사'}>
                                                    <Button size="compact-sm" variant="light" leftSection={<IconCopy size={14} />} onClick={copy}>
                                                        {copied ? '복사됨' : '링크'}
                                                    </Button>
                                                </Tooltip>
                                            )}
                                        </CopyButton>
                                        <Tooltip label="QR 코드 (추후 출시)">
                                            <ActionIcon variant="light" disabled><IconQrcode size={16} /></ActionIcon>
                                        </Tooltip>
                                    </Group>
                                </Group>
                                <Code mt="xs" style={{ wordBreak: 'break-all', fontSize: 11 }}>{link}</Code>
                            </Card>
                        );
                    })}
                </Stack>
            </Paper>

            <Paper withBorder p="md" radius="md">
                <Title order={4} mb="sm">👥 추천한 사용자 ({summary.recentReferrals.length})</Title>
                {summary.recentReferrals.length === 0 ? (
                    <Stack gap="md" align="center" py={{ base: "md", sm: "xl" }}>
                        <div style={{ fontSize: 48 }}>🔗</div>
                        <Stack gap={4} align="center">
                            <Text fw={700}>아직 추천한 사용자가 없습니다</Text>
                            <Text size="sm" c="dimmed" ta="center" maw={420}>
                                위 추천 코드를 <strong>카톡·블로그·인스타·유튜브 설명란</strong>에 공유하면<br />
                                가입자 결제 시 자동으로 commission 이 적립돼요.
                            </Text>
                        </Stack>
                    </Stack>
                ) : (
                    <Table.ScrollContainer minWidth={520}>
                    <Table striped>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>이메일</Table.Th>
                                <Table.Th>이름</Table.Th>
                                <Table.Th>플랜</Table.Th>
                                <Table.Th>가입일</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {summary.recentReferrals.map(u => {
                                const plan = u.subscription?.plan ?? 'FREE';
                                const planColor = plan === 'BUSINESS' ? 'violet' : plan === 'PRO' ? 'blue' : plan === 'STARTER' ? 'teal' : 'gray';
                                return (
                                    <Table.Tr key={u.id}>
                                        <Table.Td><Text size="sm">{u.email}</Text></Table.Td>
                                        <Table.Td><Text size="sm">{u.name || '-'}</Text></Table.Td>
                                        <Table.Td><Badge size="sm" color={planColor} variant="light">{plan}</Badge></Table.Td>
                                        <Table.Td><Text size="xs" c="dimmed">{dayjs(u.createdAt).format('YYYY-MM-DD')}</Text></Table.Td>
                                    </Table.Tr>
                                );
                            })}
                        </Table.Tbody>
                    </Table>
                    </Table.ScrollContainer>
                )}
            </Paper>

            <Modal opened={codeModal} onClose={codeModalCtl.close} title="새 추천 코드 추가" size="sm">
                <form onSubmit={codeForm.onSubmit(handleAddCode)}>
                    <Stack gap="sm">
                        <TextInput label="코드" placeholder="예: SUMMER-2026" required {...codeForm.getInputProps('code')} />
                        <TextInput label="설명 (선택)" {...codeForm.getInputProps('description')} />
                        <Button type="submit" loading={submitting} color="violet">추가</Button>
                    </Stack>
                </form>
            </Modal>
        </Stack>
    );
}

// === 고객사 탭 ===
function ClientsPanel({ clients }: { clients: ClientItem[] }) {
    return (
        <Stack gap="md">
            <Paper withBorder p="md" radius="md">
                <Group justify="space-between" mb="sm">
                    <Stack gap={2}>
                        <Title order={4}>🏪 내가 관리하는 고객사</Title>
                        <Text size="sm" c="dimmed">고객사별 워크스페이스로 격리된 채널·캠페인 관리</Text>
                    </Stack>
                    <Button component={Link} href="/dashboard/partner/clients/new" color="violet" leftSection={<IconBuildingStore size={16} />}>
                        + 고객사 추가
                    </Button>
                </Group>
                <ClientList clients={clients} />
            </Paper>

            <Alert color="violet" variant="light" icon={<IconBolt size={16} />}>
                <Text size="xs">
                    고객사 카드 클릭 → 상세 페이지 → "이 고객사로 작업하기" 버튼으로 활성 워크스페이스 전환.
                    이후 채널·캠페인 작업은 모두 그 고객사 컨텍스트로 격리됩니다.
                </Text>
            </Alert>
        </Stack>
    );
}

function ClientList({ clients }: { clients: ClientItem[] }) {
    if (clients.length === 0) {
        return (
            <Stack gap="md" align="center" py={{ base: "md", sm: "xl" }}>
                <div style={{ fontSize: 48 }}>🏢</div>
                <Stack gap={4} align="center">
                    <Text fw={700}>아직 등록된 고객사가 없습니다</Text>
                    <Text size="sm" c="dimmed" ta="center" maw={420}>
                        대행 마케팅 고객사를 등록하면 <strong>워크스페이스 자동 분리</strong>·월간 PDF 리포트·tier 별 commission 보상이 적용돼요.<br />
                        "+ 고객사 추가" 버튼으로 첫 고객사를 등록하세요.
                    </Text>
                </Stack>
            </Stack>
        );
    }
    return (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {clients.map(c => (
                <Card
                    key={c.id} withBorder p="md" radius="md"
                    component={Link} href={`/dashboard/partner/clients/${c.id}`}
                    style={{ cursor: 'pointer', textDecoration: 'none', opacity: c.status === 'CHURNED' ? 0.5 : 1 }}
                >
                    <Group justify="space-between" mb="sm">
                        <Box style={{
                            width: 36, height: 36, borderRadius: 8,
                            background: c.workspace.brandColor || '#7C3AED',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: 700, fontSize: 14,
                        }}>{c.clientName.slice(0, 2).toUpperCase()}</Box>
                        <Badge size="xs" color={c.status === 'ACTIVE' ? 'teal' : c.status === 'PAUSED' ? 'orange' : 'gray'} variant="light">
                            {c.status === 'ACTIVE' ? '운영중' : c.status === 'PAUSED' ? '일시중단' : '종료'}
                        </Badge>
                    </Group>
                    <Text fw={700} size="sm">{c.clientName}</Text>
                    {c.industry && <Text size="xs" c="dimmed" mb={4}>{c.industry}</Text>}
                    {c.monthlyFee != null && c.monthlyFee > 0 && (
                        <Badge size="xs" color="violet" variant="light" mt={4}>월 ₩{c.monthlyFee.toLocaleString()}</Badge>
                    )}
                </Card>
            ))}
        </SimpleGrid>
    );
}

// === 개발자 도구 탭 ===
function DeveloperPanel({ baseUrl }: { baseUrl: string }) {
    return (
        <Stack gap="md">
            <Alert color="blue" variant="light" icon={<IconCloud size={16} />}>
                <Text size="sm" fw={600} mb={4}>외부에서 amakers 자동 발행하기</Text>
                <Text size="xs">
                    Webhook 토큰을 발급받아 Zapier · Make · n8n · 자체 백엔드에서 캠페인을 즉시 트리거할 수 있어요.
                </Text>
            </Alert>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <Card withBorder p="md" radius="md">
                    <Group gap={6} mb="sm">
                        <ThemeIcon size={32} variant="light" color="blue"><IconKey /></ThemeIcon>
                        <Text fw={700}>1. API 토큰 발급</Text>
                    </Group>
                    <Text size="xs" c="dimmed" mb="sm">
                        토큰별 rate limit (분 60·일 200) 적용. 외부 시스템 1개당 토큰 1개 권장.
                    </Text>
                    <Button component={Link} href="/dashboard/settings/webhooks" variant="light" rightSection={<IconExternalLink size={14} />}>
                        토큰 관리 페이지 ↗
                    </Button>
                </Card>

                <Card withBorder p="md" radius="md">
                    <Group gap={6} mb="sm">
                        <ThemeIcon size={32} variant="light" color="violet"><IconCode /></ThemeIcon>
                        <Text fw={700}>2. 발행 트리거 엔드포인트</Text>
                    </Group>
                    <Code block style={{ fontSize: 11 }}>{`POST ${baseUrl}/api/webhook/<token>/publish
{
  "content": "오늘의 신메뉴! 🎉",
  "channelIds": ["ch_xxx"]
}`}</Code>
                </Card>
            </SimpleGrid>

            <Paper withBorder p="md" radius="md">
                <Title order={5} mb="sm">📦 통합 가이드</Title>
                <Stack gap="xs">
                    <IntegrationGuide
                        title="Zapier"
                        steps="Webhooks by Zapier → POST → URL 입력 → JSON Body"
                        badge="No-code"
                    />
                    <IntegrationGuide
                        title="Make (Integromat)"
                        steps="HTTP 모듈 → Make a request → 위 URL 사용"
                        badge="No-code"
                    />
                    <IntegrationGuide
                        title="n8n"
                        steps="HTTP Request 노드 → POST → JSON body"
                        badge="Self-host"
                    />
                    <IntegrationGuide
                        title="curl / Node.js / Python"
                        steps="표준 HTTP POST. Content-Type: application/json + Body."
                        badge="개발자"
                    />
                </Stack>
            </Paper>

            <Paper withBorder p="md" radius="md" bg="gray.0">
                <Group gap={6} mb={4}>
                    <Text size="sm" fw={700}>📑 곧 추가될 기능</Text>
                </Group>
                <Text size="xs" c="dimmed">
                    • REST API 전체 (캠페인/시리즈/채널 CRUD) — 현재는 webhook publish 만 지원<br />
                    • Postman 컬렉션 다운로드<br />
                    • OAuth 2.0 (제3자 앱이 amakers 사용자 데이터 접근)<br />
                    • SDK (Node.js / Python)
                </Text>
            </Paper>
        </Stack>
    );
}

function IntegrationGuide({ title, steps, badge }: { title: string; steps: string; badge: string }) {
    return (
        <Card withBorder p="sm" radius="md">
            <Group justify="space-between">
                <Group gap={6}>
                    <Text fw={600} size="sm">{title}</Text>
                    <Badge size="xs" variant="light">{badge}</Badge>
                </Group>
                <Text size="xs" c="dimmed">{steps}</Text>
            </Group>
        </Card>
    );
}

// === 리소스 탭 ===
function ResourcesPanel({ tierInfo }: { tierInfo: NonNullable<Summary>['tierInfo'] }) {
    return (
        <Stack gap="md">
            <Paper withBorder p="md" radius="md">
                <Title order={4} mb="sm">🏆 내 등급 혜택</Title>
                <Group gap="sm" mb="md">
                    <Text size="32px">{tierInfo.current.emoji}</Text>
                    <Stack gap={0}>
                        <Text fw={700}>{tierInfo.current.label} 파트너</Text>
                        <Text size="xs" c="dimmed">현재 활성화된 혜택</Text>
                    </Stack>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                    {tierInfo.current.perks.map(p => (
                        <Group key={p} gap={6}>
                            <IconCheck size={14} color="var(--mantine-color-teal-6)" />
                            <Text size="sm">{p}</Text>
                        </Group>
                    ))}
                </SimpleGrid>
            </Paper>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <ResourceCard
                    icon={IconFileText}
                    color="blue"
                    title="영업 가이드"
                    desc="amakers 소개·가격표·기능 비교 PDF"
                    badge="준비중"
                />
                <ResourceCard
                    icon={IconRocket}
                    color="violet"
                    title="데모 영상"
                    desc="고객사에게 보여줄 5분 데모 (한국어)"
                    badge="준비중"
                />
                <ResourceCard
                    icon={IconHelpCircle}
                    color="orange"
                    title="자주 묻는 질문"
                    desc="가입·정산·세금·기능 FAQ"
                    badge="준비중"
                />
                <ResourceCard
                    icon={IconBrandDiscord}
                    color="indigo"
                    title="파트너 커뮤니티"
                    desc="Discord 파트너 채널 — 노하우·질문·인사이트 공유"
                    badge="준비중"
                />
            </SimpleGrid>

            <Paper withBorder p="md" radius="md" bg="violet.0">
                <Group gap={6} mb={4}>
                    <Text size="sm" fw={700} c="violet.9">💡 파트너 매니저 (Gold/Platinum 전용)</Text>
                </Group>
                <Text size="xs" c="violet.9">
                    Gold 등급부터 전담 매니저가 배정되어 영업·운영 지원.
                    현재 등급: <strong>{tierInfo.current.label}</strong>
                    {tierInfo.current.tier === 'BRONZE' || tierInfo.current.tier === 'SILVER'
                        ? ` — ${tierInfo.next ? `${tierInfo.next.label} 등급 달성 시 활성화` : ''}`
                        : ' — help@amakers.co.kr 로 연락주세요'}
                </Text>
            </Paper>
        </Stack>
    );
}

function ResourceCard({ icon: Icon, color, title, desc, badge }: { icon: any; color: string; title: string; desc: string; badge?: string }) {
    return (
        <Card withBorder p="md" radius="md">
            <Group justify="space-between" mb="sm">
                <ThemeIcon size={36} variant="light" color={color}><Icon size={20} /></ThemeIcon>
                {badge && <Badge size="xs" variant="light" color="gray">{badge}</Badge>}
            </Group>
            <Text fw={700} size="sm">{title}</Text>
            <Text size="xs" c="dimmed">{desc}</Text>
        </Card>
    );
}

// === 공통 ===
function StatCard({ color, label, value, hint }: { color: string; label: string; value: string; hint?: string }) {
    return (
        <Paper withBorder p="md" radius="md">
            <Text size="xs" c="dimmed" fw={600}>{label}</Text>
            <Text fw={800} size="lg" c={color} mt={2}>{value}</Text>
            {hint && <Text size="11px" c="dimmed" mt={2}>{hint}</Text>}
        </Paper>
    );
}

// IconKey 임시 import 회피 (Code 위에서 정의)
const IconKey = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
);
