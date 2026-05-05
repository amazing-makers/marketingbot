'use client';

import {
    Container, Title, Text, Stack, Group, Paper, TextInput, NumberInput, Textarea, Select,
    Button, Anchor, ColorInput, Box,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconBuildingStore } from '@tabler/icons-react';
import { createPartnerClient } from '@/app/actions/partnerActions';

const INDUSTRY_OPTIONS = [
    '카페', '식당', '의류·패션', '뷰티·화장품', '헬스장·요가',
    '교육·학원', 'IT·SaaS', '인테리어·가구', '병원·클리닉',
    '여행·숙박', '제조업', '서비스업', '기타',
];

export default function NewClientPage() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);

    const form = useForm({
        initialValues: {
            clientName: '',
            contactName: '',
            contactEmail: '',
            contactPhone: '',
            industry: '',
            monthlyFee: 0,
            brandColor: '#7C3AED',
            notes: '',
        },
        validate: {
            clientName: (v) => (v.trim().length < 2 ? '고객사 이름을 2자 이상 입력하세요' : null),
            contactEmail: (v) => (v && !/^\S+@\S+$/.test(v) ? '유효한 이메일 형식이 아닙니다' : null),
        },
    });

    const handleSubmit = async (values: typeof form.values) => {
        setSubmitting(true);
        try {
            const r = await createPartnerClient({
                clientName: values.clientName.trim(),
                contactName: values.contactName.trim() || undefined,
                contactEmail: values.contactEmail.trim() || undefined,
                contactPhone: values.contactPhone.trim() || undefined,
                industry: values.industry || undefined,
                monthlyFee: values.monthlyFee || undefined,
                brandColor: values.brandColor,
                notes: values.notes.trim() || undefined,
            });
            notifications.show({
                color: 'teal',
                title: '🎉 고객사 등록 완료',
                message: `워크스페이스 자동 생성됨 (${r.workspaceSlug})`,
                autoClose: 5000,
            });
            router.push(`/dashboard/partner/clients/${r.id}`);
        } catch (e: any) {
            notifications.show({ color: 'red', title: '실패', message: e?.message || '실패' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container size="md" py="xl">
            <Stack gap="md">
                <Stack gap={2}>
                    <Anchor component={Link} href="/dashboard/partner" size="sm">← 파트너 대시보드</Anchor>
                    <Group gap={6}><IconBuildingStore size={24} /><Title order={2}>새 고객사 등록</Title></Group>
                    <Text c="dimmed" size="sm">고객사 정보를 입력하면 워크스페이스가 자동으로 만들어지고, 그 안에서 채널·캠페인을 운영할 수 있어요.</Text>
                </Stack>

                <Paper withBorder p="lg" radius="md">
                    <form onSubmit={form.onSubmit(handleSubmit)}>
                        <Stack gap="md">
                            <Box>
                                <Title order={5} mb="xs">📋 기본 정보</Title>
                                <Stack gap="sm">
                                    <TextInput
                                        label="고객사 이름"
                                        placeholder="예: 스타트업 A 카페"
                                        required
                                        {...form.getInputProps('clientName')}
                                    />
                                    <Group grow>
                                        <Select
                                            label="업종"
                                            placeholder="선택"
                                            data={INDUSTRY_OPTIONS}
                                            searchable
                                            clearable
                                            {...form.getInputProps('industry')}
                                        />
                                        <ColorInput
                                            label="브랜드 색상"
                                            description="아바타 배경"
                                            {...form.getInputProps('brandColor')}
                                        />
                                    </Group>
                                </Stack>
                            </Box>

                            <Box>
                                <Title order={5} mb="xs">📞 연락처 (선택)</Title>
                                <Stack gap="sm">
                                    <Group grow>
                                        <TextInput label="담당자 이름" placeholder="홍길동" {...form.getInputProps('contactName')} />
                                        <TextInput label="담당자 전화" placeholder="010-0000-0000" {...form.getInputProps('contactPhone')} />
                                    </Group>
                                    <TextInput label="담당자 이메일" placeholder="contact@client.com" {...form.getInputProps('contactEmail')} />
                                </Stack>
                            </Box>

                            <Box>
                                <Title order={5} mb="xs">💰 비즈니스</Title>
                                <Stack gap="sm">
                                    <NumberInput
                                        label="월 관리비 (원, 선택)"
                                        description="파트너가 고객사에게 별도로 청구하는 금액 (amakers 결제와 별개)"
                                        min={0}
                                        thousandSeparator=","
                                        {...form.getInputProps('monthlyFee')}
                                    />
                                    <Textarea
                                        label="메모 (선택)"
                                        placeholder="예: 신메뉴 출시 매주 화·목 발행 / 인스타·블로그 중심"
                                        autosize
                                        minRows={3}
                                        {...form.getInputProps('notes')}
                                    />
                                </Stack>
                            </Box>

                            <Group justify="space-between" mt="md">
                                <Anchor component={Link} href="/dashboard/partner" size="sm">취소</Anchor>
                                <Button type="submit" loading={submitting} color="violet" size="md">
                                    🚀 고객사 등록 + 워크스페이스 만들기
                                </Button>
                            </Group>
                        </Stack>
                    </form>
                </Paper>

                <Paper withBorder p="md" radius="md" bg="violet.0">
                    <Text size="xs" c="violet.9">
                        💡 등록 후 좌측 워크스페이스 메뉴에서 이 고객사로 전환하면, 모든 채널·캠페인 작업이 그 고객사 컨텍스트로 격리됩니다.
                    </Text>
                </Paper>
            </Stack>
        </Container>
    );
}
