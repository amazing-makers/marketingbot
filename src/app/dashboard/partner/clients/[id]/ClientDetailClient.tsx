'use client';

import {
    Container, Title, Text, Stack, Group, Paper, Badge, Anchor, SimpleGrid, ThemeIcon, Card,
    Button, Modal, TextInput, NumberInput, Textarea, Select, Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    IconBuildingStore, IconArrowRight, IconEdit, IconPlayerPause,
    IconPlayerPlay, IconBan, IconFileTypePdf, IconRefresh, IconDownload, IconCheck,
} from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';
import { updatePartnerClientStatus, updatePartnerClient, enterClientWorkspace } from '@/app/actions/partnerActions';
import { generatePartnerClientReport } from '@/app/actions/partnerReportActions';

interface ClientData {
    id: string;
    clientName: string;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    industry: string | null;
    monthlyFee: number | null;
    status: 'ACTIVE' | 'PAUSED' | 'CHURNED';
    notes: string | null;
    startedAt: string;
    endedAt: string | null;
    workspace: { id: string; name: string; slug: string; brandColor: string | null; memberCount: number };
}

interface ReportItem {
    id: string;
    periodYearMonth: string;
    totalCampaigns: number;
    totalPublished: number;
    totalFailed: number;
    pdfUrl: string | null;
    pdfSizeKb: number | null;
    generatedAt: string;
    generatedBy: string;
    status: string;
    errorMessage: string | null;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    ACTIVE: { label: '운영 중', color: 'teal' },
    PAUSED: { label: '일시 중단', color: 'orange' },
    CHURNED: { label: '계약 종료', color: 'gray' },
};

export default function ClientDetailClient({ data, reports }: { data: ClientData; reports: ReportItem[] }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [editModal, editModalCtl] = useDisclosure(false);
    const [generatingReport, setGeneratingReport] = useState(false);

    const handleGenerateReport = async () => {
        setGeneratingReport(true);
        try {
            const r = await generatePartnerClientReport({ partnerClientId: data.id, generatedBy: 'manual' });
            if (!r.ok) {
                notifications.show({ color: 'red', title: '리포트 생성 실패', message: r.error || '실패' });
                return;
            }
            notifications.show({
                color: 'teal',
                title: r.pdfUrl ? '📄 PDF 리포트 생성 완료' : '📊 통계만 저장됨',
                message: r.pdfUrl ? '아래에서 다운로드 가능' : 'R2 미설정 — PDF 다운로드는 R2 키 등록 후 가능',
                autoClose: 5000,
            });
            window.location.reload();
        } catch (e: any) {
            notifications.show({ color: 'red', title: '실패', message: e?.message || '실패' });
        } finally {
            setGeneratingReport(false);
        }
    };

    const editForm = useForm({
        initialValues: {
            contactName: data.contactName || '',
            contactEmail: data.contactEmail || '',
            contactPhone: data.contactPhone || '',
            industry: data.industry || '',
            monthlyFee: data.monthlyFee || 0,
            notes: data.notes || '',
        },
    });

    const handleEnterWorkspace = async () => {
        setBusy(true);
        try {
            await enterClientWorkspace(data.id);
            notifications.show({
                color: 'violet',
                title: `🏪 ${data.clientName} 워크스페이스로 전환됨`,
                message: '이제 이 고객사 컨텍스트에서 작업합니다',
                autoClose: 4000,
            });
            router.push('/dashboard');
            router.refresh();
        } catch (e: any) {
            notifications.show({ color: 'red', title: '실패', message: e?.message || '실패' });
        } finally {
            setBusy(false);
        }
    };

    const handleStatusChange = async (status: 'ACTIVE' | 'PAUSED' | 'CHURNED') => {
        const labels = { ACTIVE: '운영 재개', PAUSED: '일시 중단', CHURNED: '계약 종료 (되돌릴 수 없음)' };
        if (!confirm(`정말 "${labels[status]}" 처리하시겠습니까?`)) return;
        setBusy(true);
        try {
            await updatePartnerClientStatus({ clientId: data.id, status });
            notifications.show({ color: 'teal', title: '상태 변경됨', message: STATUS_LABEL[status].label });
            window.location.reload();
        } catch (e: any) {
            notifications.show({ color: 'red', title: '실패', message: e?.message || '실패' });
        } finally {
            setBusy(false);
        }
    };

    const handleEdit = async (values: typeof editForm.values) => {
        setBusy(true);
        try {
            await updatePartnerClient({
                clientId: data.id,
                contactName: values.contactName.trim() || undefined,
                contactEmail: values.contactEmail.trim() || undefined,
                contactPhone: values.contactPhone.trim() || undefined,
                industry: values.industry.trim() || undefined,
                monthlyFee: values.monthlyFee || undefined,
                notes: values.notes.trim() || undefined,
            });
            notifications.show({ color: 'teal', title: '저장됨', message: '고객사 정보가 업데이트됐어요' });
            editModalCtl.close();
            window.location.reload();
        } catch (e: any) {
            notifications.show({ color: 'red', title: '실패', message: e?.message || '실패' });
        } finally {
            setBusy(false);
        }
    };

    const status = STATUS_LABEL[data.status];

    return (
        <Container size="lg" py="xl">
            <Stack gap="md">
                {/* 헤더 */}
                <Stack gap={2}>
                    <Anchor component={Link} href="/dashboard/partner" size="sm">← 파트너 대시보드</Anchor>
                    <Group gap="sm" align="center" justify="space-between" wrap="wrap">
                        <Group gap="sm">
                            <Box
                                style={{
                                    width: 48, height: 48, borderRadius: 10,
                                    background: data.workspace.brandColor || '#7C3AED',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontWeight: 700, fontSize: 20,
                                }}
                            >
                                {data.clientName.slice(0, 2).toUpperCase()}
                            </Box>
                            <Stack gap={0}>
                                <Group gap={6}>
                                    <Title order={2}>{data.clientName}</Title>
                                    <Badge size="sm" color={status.color} variant="light">{status.label}</Badge>
                                </Group>
                                {data.industry && <Text size="sm" c="dimmed">{data.industry}</Text>}
                            </Stack>
                        </Group>
                        <Group gap="xs">
                            <Button
                                color="violet"
                                size="md"
                                leftSection={<IconArrowRight size={16} />}
                                onClick={handleEnterWorkspace}
                                loading={busy}
                                disabled={data.status === 'CHURNED'}
                            >
                                이 고객사로 작업하기
                            </Button>
                            <Button variant="light" leftSection={<IconEdit size={14} />} onClick={editModalCtl.open}>
                                수정
                            </Button>
                        </Group>
                    </Group>
                </Stack>

                {/* 핵심 정보 */}
                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                    <InfoCard label="시작일" value={dayjs(data.startedAt).format('YYYY-MM-DD')} hint={`${dayjs().diff(data.startedAt, 'day')}일 운영`} />
                    <InfoCard label="월 관리비" value={data.monthlyFee ? `₩${data.monthlyFee.toLocaleString()}` : '미설정'} />
                    <InfoCard label="워크스페이스" value={data.workspace.slug} hint={`멤버 ${data.workspace.memberCount}명`} />
                </SimpleGrid>

                {/* 연락처 */}
                <Paper withBorder p="md" radius="md">
                    <Title order={5} mb="sm">📞 담당자 연락처</Title>
                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                        <Field label="이름" value={data.contactName || '-'} />
                        <Field label="이메일" value={data.contactEmail || '-'} />
                        <Field label="전화" value={data.contactPhone || '-'} />
                    </SimpleGrid>
                </Paper>

                {/* 메모 */}
                {data.notes && (
                    <Paper withBorder p="md" radius="md">
                        <Title order={5} mb="sm">📝 메모</Title>
                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{data.notes}</Text>
                    </Paper>
                )}

                {/* 월간 리포트 */}
                <Paper withBorder p="md" radius="md">
                    <Group justify="space-between" mb="sm">
                        <Group gap={6}>
                            <IconFileTypePdf size={20} color="var(--mantine-color-violet-6)" />
                            <Title order={5}>📄 월간 리포트</Title>
                            <Badge size="xs" color="violet" variant="light">Gold+ 자동 생성</Badge>
                        </Group>
                        <Button
                            size="compact-sm"
                            variant="light"
                            color="violet"
                            leftSection={<IconRefresh size={14} />}
                            onClick={handleGenerateReport}
                            loading={generatingReport}
                            disabled={data.status === 'CHURNED'}
                        >
                            지난달 리포트 다시 만들기
                        </Button>
                    </Group>
                    {reports.length === 0 ? (
                        <Box style={{ textAlign: 'center', padding: 24, color: 'var(--mantine-color-dimmed)' }}>
                            <IconFileTypePdf size={36} style={{ opacity: 0.3 }} />
                            <Text size="sm" mt="sm">아직 리포트가 없습니다</Text>
                            <Text size="xs">매월 1일 자동 생성 (Gold+ 등급) 또는 위 버튼으로 수동 생성</Text>
                        </Box>
                    ) : (
                        <Stack gap="xs">
                            {reports.map(r => (
                                <Card key={r.id} withBorder p="sm" radius="md">
                                    <Group justify="space-between" wrap="wrap">
                                        <Group gap="md">
                                            <Box style={{
                                                width: 40, height: 40, borderRadius: 6,
                                                background: r.pdfUrl ? 'var(--mantine-color-violet-1)' : 'var(--mantine-color-gray-1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                <IconFileTypePdf size={22} color={r.pdfUrl ? 'var(--mantine-color-violet-6)' : 'var(--mantine-color-gray-5)'} />
                                            </Box>
                                            <Stack gap={2}>
                                                <Group gap={6}>
                                                    <Text fw={700} size="sm">{r.periodYearMonth} 리포트</Text>
                                                    <Badge size="xs" color={r.status === 'READY' ? 'teal' : r.status === 'FAILED' ? 'red' : 'gray'} variant="light">
                                                        {r.status === 'READY' ? '준비됨' : r.status === 'FAILED' ? '실패' : r.status}
                                                    </Badge>
                                                    {r.generatedBy === 'cron' && <Badge size="xs" variant="light" color="blue">자동</Badge>}
                                                    {r.generatedBy === 'manual' && <Badge size="xs" variant="light">수동</Badge>}
                                                </Group>
                                                <Text size="11px" c="dimmed">
                                                    캠페인 {r.totalCampaigns} · 발행 {r.totalPublished} (실패 {r.totalFailed})
                                                    {r.pdfSizeKb ? ` · ${r.pdfSizeKb}KB` : ''}
                                                    {' · '}{dayjs(r.generatedAt).format('YYYY-MM-DD HH:mm')}
                                                </Text>
                                                {r.errorMessage && (
                                                    <Text size="11px" c="red">⚠ {r.errorMessage}</Text>
                                                )}
                                            </Stack>
                                        </Group>
                                        {r.pdfUrl ? (
                                            <Button
                                                size="compact-sm"
                                                variant="filled"
                                                color="violet"
                                                component="a"
                                                href={r.pdfUrl}
                                                target="_blank"
                                                leftSection={<IconDownload size={14} />}
                                            >
                                                PDF 다운로드
                                            </Button>
                                        ) : (
                                            <Text size="xs" c="dimmed">PDF 없음</Text>
                                        )}
                                    </Group>
                                </Card>
                            ))}
                        </Stack>
                    )}
                </Paper>

                {/* 상태 변경 */}
                <Paper withBorder p="md" radius="md">
                    <Title order={5} mb="sm">⚙️ 계약 상태</Title>
                    <Group>
                        {data.status !== 'ACTIVE' && data.status !== 'CHURNED' && (
                            <Button leftSection={<IconPlayerPlay size={14} />} variant="light" color="teal" onClick={() => handleStatusChange('ACTIVE')} loading={busy}>
                                운영 재개
                            </Button>
                        )}
                        {data.status === 'ACTIVE' && (
                            <Button leftSection={<IconPlayerPause size={14} />} variant="light" color="orange" onClick={() => handleStatusChange('PAUSED')} loading={busy}>
                                일시 중단
                            </Button>
                        )}
                        {data.status !== 'CHURNED' && (
                            <Button leftSection={<IconBan size={14} />} variant="light" color="red" onClick={() => handleStatusChange('CHURNED')} loading={busy}>
                                계약 종료
                            </Button>
                        )}
                    </Group>
                </Paper>

                <Paper withBorder p="md" radius="md" bg="blue.0">
                    <Text size="xs" c="blue.9">
                        💡 "이 고객사로 작업하기" 누르면 활성 워크스페이스가 전환됩니다. 이후 채널·캠페인 작업은 모두 이 워크스페이스 안에서 격리되어 처리됩니다.
                    </Text>
                </Paper>
            </Stack>

            {/* 수정 모달 */}
            <Modal opened={editModal} onClose={editModalCtl.close} title="고객사 정보 수정" size="md">
                <form onSubmit={editForm.onSubmit(handleEdit)}>
                    <Stack gap="sm">
                        <Group grow>
                            <TextInput label="담당자 이름" {...editForm.getInputProps('contactName')} />
                            <TextInput label="담당자 전화" {...editForm.getInputProps('contactPhone')} />
                        </Group>
                        <TextInput label="담당자 이메일" {...editForm.getInputProps('contactEmail')} />
                        <Select
                            label="업종"
                            data={[
                                '카페', '식당', '의류·패션', '뷰티·화장품', '헬스장·요가',
                                '교육·학원', 'IT·SaaS', '인테리어·가구', '병원·클리닉',
                                '여행·숙박', '제조업', '서비스업', '기타',
                            ]}
                            searchable
                            clearable
                            {...editForm.getInputProps('industry')}
                        />
                        <NumberInput
                            label="월 관리비 (원)"
                            min={0}
                            thousandSeparator=","
                            {...editForm.getInputProps('monthlyFee')}
                        />
                        <Textarea label="메모" autosize minRows={3} {...editForm.getInputProps('notes')} />
                        <Group justify="flex-end">
                            <Button variant="subtle" onClick={editModalCtl.close}>취소</Button>
                            <Button type="submit" loading={busy}>저장</Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Container>
    );
}

function InfoCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <Paper withBorder p="md" radius="md">
            <Text size="xs" c="dimmed" fw={600} mb={4}>{label}</Text>
            <Text fw={700} size="lg">{value}</Text>
            {hint && <Text size="11px" c="dimmed" mt={2}>{hint}</Text>}
        </Paper>
    );
}

function Field({ label, value }: { label: string; value: string }) {
    return (
        <Box>
            <Text size="xs" c="dimmed">{label}</Text>
            <Text fw={600} size="sm">{value}</Text>
        </Box>
    );
}
