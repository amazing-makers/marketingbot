'use client';

import {
    Container, Title, Text, Stack, Group, Paper, Button, TextInput, Select, Badge,
    Card, SimpleGrid, ThemeIcon, CopyButton, ActionIcon, Tooltip, Modal, Table, Box, Tabs,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import {
    IconUsersGroup, IconCash, IconUsers, IconCheck, IconCopy,
    IconLink, IconQrcode, IconRosetteDiscountCheck, IconBriefcase, IconBuildingStore,
} from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';
import { registerAsReseller, createReferralCode } from '@/app/actions/resellerActions';

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

export default function PartnerDashboardClient({ summary, clients }: { summary: Summary; clients: ClientItem[] }) {
    if (!summary) return <PartnerSignupView />;
    return <PartnerView summary={summary} clients={clients} />;
}

function PartnerSignupView() {
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
        <Container size="md" py="xl">
            <Stack gap="lg">
                <Box>
                    <Title order={2}>🤝 파트너 프로그램에 가입하기</Title>
                    <Text c="dimmed" size="sm">
                        주변에 amakers 를 추천하고 매월 <strong>10% 수수료</strong>를 받거나,
                        고객사 마케팅을 대신 운영해주는 <strong>마케팅 파트너</strong>로 활동하세요.
                    </Text>
                </Box>

                <Paper withBorder p="lg" radius="md">
                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                        <BenefitCard icon={IconCash} title="10% 평생 수수료" desc="추천 사용자가 결제할 때마다 매월 자동 정산" />
                        <BenefitCard icon={IconBriefcase} title="고객사 대행 마케팅" desc="여러 고객사의 마케팅을 한 계정에서 관리" />
                        <BenefitCard icon={IconRosetteDiscountCheck} title="실시간 대시보드" desc="추천 인원·고객사·매출·예상 수수료 한눈에" />
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
                                label="입금 계좌 (선택, 나중에 입력 가능)"
                                placeholder="예: 신한은행 110-123-456789 (홍길동)"
                                {...form.getInputProps('bankAccount')}
                            />
                            <Text size="xs" c="dimmed">
                                💡 가입 즉시 활성화됩니다. 추천 사용자가 결제하면 자동으로 commission 이 누적되고, 다음 달 1일에 정산 대기로 전환됩니다.
                            </Text>
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

function BenefitCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
    return (
        <Card withBorder p="md" radius="md">
            <ThemeIcon size={40} radius="md" variant="light" color="violet" mb="sm"><Icon size={22} /></ThemeIcon>
            <Text fw={700} size="sm" mb={4}>{title}</Text>
            <Text size="xs" c="dimmed">{desc}</Text>
        </Card>
    );
}

function PartnerView({ summary, clients }: { summary: NonNullable<Summary>; clients: ClientItem[] }) {
    const [codeModal, codeModalCtl] = useDisclosure(false);
    const [submitting, setSubmitting] = useState(false);
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://marketingbot.amakers.co.kr';

    const codeForm = useForm({
        initialValues: { code: '', description: '' },
    });

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

    const totalReferrals = summary.recentReferrals.length;
    const paidUsers = summary.recentReferrals.filter(u => u.subscription && u.subscription.plan !== 'FREE').length;

    return (
        <Container size="xl" py="xl">
            <Stack gap="md">
                <Group justify="space-between">
                    <Stack gap={2}>
                        <Group gap={6}><IconBriefcase size={24} /><Title order={2}>파트너 대시보드</Title></Group>
                        <Text c="dimmed" size="sm">{summary.reseller.name} · {(summary.reseller.commissionRate * 100).toFixed(0)}% 수수료율</Text>
                    </Stack>
                    <Badge color={summary.reseller.status === 'ACTIVE' ? 'teal' : 'red'} size="lg" variant="light">{summary.reseller.status}</Badge>
                </Group>

                {/* 핵심 지표 */}
                <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="md">
                    <StatCard icon={IconCash} color="teal" label="정산 대기" value={`₩${summary.pendingTotal.toLocaleString()}`} hint={`${summary.pendingCount}건`} />
                    <StatCard icon={IconCheck} color="blue" label="누적 정산 완료" value={`₩${summary.paidTotal.toLocaleString()}`} hint={`${summary.paidCount}건`} />
                    <StatCard icon={IconUsers} color="violet" label="추천 사용자" value={`${totalReferrals}명`} hint={`그 중 유료 ${paidUsers}명`} />
                    <StatCard icon={IconRosetteDiscountCheck} color="orange" label="활성 코드" value={`${summary.reseller.referralCodes.filter(c => c.active).length}개`} hint={`전체 ${summary.reseller.referralCodes.length}개`} />
                </SimpleGrid>

                <Tabs defaultValue="referral" mt="md">
                    <Tabs.List>
                        <Tabs.Tab value="referral" leftSection={<IconLink size={14} />}>🔗 추천 (Referral)</Tabs.Tab>
                        <Tabs.Tab value="clients" leftSection={<IconBuildingStore size={14} />}>🏪 내 고객사 (대행 마케팅)</Tabs.Tab>
                    </Tabs.List>

                    {/* === 추천 (Referral) === */}
                    <Tabs.Panel value="referral" pt="md">
                        <Stack gap="md">
                            <Paper withBorder p="lg" radius="md">
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
                                                                        {copied ? '복사됨' : '링크 복사'}
                                                                    </Button>
                                                                </Tooltip>
                                                            )}
                                                        </CopyButton>
                                                        <Tooltip label="QR 코드 (추후 출시)">
                                                            <ActionIcon variant="light" disabled><IconQrcode size={16} /></ActionIcon>
                                                        </Tooltip>
                                                    </Group>
                                                </Group>
                                                <Text size="xs" c="dimmed" mt="xs" style={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>{link}</Text>
                                            </Card>
                                        );
                                    })}
                                </Stack>
                            </Paper>

                            <Paper withBorder p="md" radius="md">
                                <Title order={4} mb="sm">👥 내가 추천한 사용자 ({totalReferrals}명)</Title>
                                {totalReferrals === 0 ? (
                                    <Text size="sm" c="dimmed" ta="center" py="xl">
                                        아직 추천한 사용자가 없어요. 위의 추천 링크를 카톡·블로그·인스타에 공유해보세요!
                                    </Text>
                                ) : (
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
                                )}
                            </Paper>

                            <Paper withBorder p="md" radius="md" bg="blue.0">
                                <Text size="xs" c="blue.9">
                                    💡 정산은 매월 1일에 자동 계산됩니다. 추천 사용자의 지난달 결제액 × {(summary.reseller.commissionRate * 100).toFixed(0)}%
                                    가 PENDING 으로 누적되고, 슈퍼관리자가 확인 후 PAID 처리하면 입금됩니다.
                                </Text>
                            </Paper>
                        </Stack>
                    </Tabs.Panel>

                    {/* === 내 고객사 (대행 마케팅) === */}
                    <Tabs.Panel value="clients" pt="md">
                        <Stack gap="md">
                            <Paper withBorder p="lg" radius="md">
                                <Group justify="space-between" mb="sm">
                                    <Stack gap={2}>
                                        <Title order={4}>🏪 내가 관리하는 고객사</Title>
                                        <Text size="sm" c="dimmed">고객사 워크스페이스를 만들어 그 회사 채널·캠페인을 직접 관리하세요</Text>
                                    </Stack>
                                    <Button
                                        component={Link}
                                        href="/dashboard/partner/clients/new"
                                        color="violet"
                                        leftSection={<IconBuildingStore size={16} />}
                                    >
                                        + 고객사 추가
                                    </Button>
                                </Group>
                                <Box mt="md">
                                    <ClientList clients={clients} />
                                </Box>
                            </Paper>

                            <Paper withBorder p="md" radius="md" bg="violet.0">
                                <Stack gap={4}>
                                    <Text size="sm" fw={700} c="violet.9">💡 대행 마케팅 작동 방식</Text>
                                    <Text size="xs" c="violet.8">
                                        1. "고객사 추가" → 고객사 정보 입력 → 워크스페이스 자동 생성<br />
                                        2. 좌상단 워크스페이스 전환 → 그 고객사 컨텍스트로 진입<br />
                                        3. 채널 연결·캠페인 발행 모두 그 고객사 워크스페이스 안에서 격리<br />
                                        4. 고객사 결제는 별도 (파트너가 대신 받거나, 고객사가 직접 — 향후 옵션)
                                    </Text>
                                </Stack>
                            </Paper>
                        </Stack>
                    </Tabs.Panel>
                </Tabs>
            </Stack>

            <Modal opened={codeModal} onClose={codeModalCtl.close} title="새 추천 코드 추가" size="sm">
                <form onSubmit={codeForm.onSubmit(handleAddCode)}>
                    <Stack gap="sm">
                        <TextInput
                            label="코드 (영문 대문자·숫자·하이픈)"
                            placeholder="예: SUMMER-2026"
                            required
                            {...codeForm.getInputProps('code')}
                        />
                        <TextInput
                            label="설명 (선택)"
                            placeholder="예: 여름 시즌 캠페인용"
                            {...codeForm.getInputProps('description')}
                        />
                        <Button type="submit" loading={submitting} color="violet">추가</Button>
                    </Stack>
                </form>
            </Modal>
        </Container>
    );
}

function ClientList({ clients }: { clients: ClientItem[] }) {
    if (clients.length === 0) {
        return (
            <Box style={{ textAlign: 'center', padding: 40, color: 'var(--mantine-color-dimmed)' }}>
                <IconUsersGroup size={36} style={{ opacity: 0.4 }} />
                <Text size="sm" mt="sm">아직 등록된 고객사가 없습니다</Text>
                <Text size="xs">"+ 고객사 추가" 를 눌러 첫 고객사를 등록하세요</Text>
            </Box>
        );
    }
    return (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {clients.map(c => (
                <Card
                    key={c.id}
                    withBorder
                    p="md"
                    radius="md"
                    component={Link}
                    href={`/dashboard/partner/clients/${c.id}`}
                    style={{ cursor: 'pointer', textDecoration: 'none', opacity: c.status === 'CHURNED' ? 0.5 : 1 }}
                >
                    <Group justify="space-between" mb="sm">
                        <Box
                            style={{
                                width: 36, height: 36, borderRadius: 8,
                                background: c.workspace.brandColor || '#7C3AED',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontWeight: 700, fontSize: 14,
                            }}
                        >
                            {c.clientName.slice(0, 2).toUpperCase()}
                        </Box>
                        <Badge
                            size="xs"
                            color={c.status === 'ACTIVE' ? 'teal' : c.status === 'PAUSED' ? 'orange' : 'gray'}
                            variant="light"
                        >
                            {c.status === 'ACTIVE' ? '운영중' : c.status === 'PAUSED' ? '일시중단' : '종료'}
                        </Badge>
                    </Group>
                    <Text fw={700} size="sm">{c.clientName}</Text>
                    {c.industry && <Text size="xs" c="dimmed" mb={4}>{c.industry}</Text>}
                    <Group gap={6} mt="xs">
                        {c.contactName && <Text size="11px" c="dimmed">👤 {c.contactName}</Text>}
                        {c.monthlyFee != null && c.monthlyFee > 0 && (
                            <Badge size="xs" color="violet" variant="light">월 ₩{c.monthlyFee.toLocaleString()}</Badge>
                        )}
                    </Group>
                    <Text size="11px" c="dimmed" mt="xs">시작: {dayjs(c.startedAt).format('YYYY-MM-DD')}</Text>
                </Card>
            ))}
        </SimpleGrid>
    );
}

function StatCard({ icon: Icon, color, label, value, hint }: {
    icon: any; color: string; label: string; value: string; hint?: string;
}) {
    return (
        <Paper withBorder p="md" radius="md">
            <Group gap={6} mb={4}>
                <ThemeIcon size={28} radius="md" variant="light" color={color}><Icon size={16} /></ThemeIcon>
                <Text size="xs" c="dimmed" fw={600}>{label}</Text>
            </Group>
            <Text fw={800} size="22px">{value}</Text>
            {hint && <Text size="11px" c="dimmed" mt={2}>{hint}</Text>}
        </Paper>
    );
}
