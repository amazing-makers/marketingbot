'use client';

import {
    Container, Title, Text, Stack, Group, TextInput, Textarea, Select,
    MultiSelect, NumberInput, Button, Paper, Card, Box, Badge, SimpleGrid,
    Divider, Anchor, Stepper
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { DateTimePicker } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconSparkles, IconRocket, IconClock, IconCalendar, IconCheck } from '@tabler/icons-react';
import { listChannels } from '@/app/actions/channelActions';
import { createSeries } from '@/app/actions/seriesActions';
import MediaUploader, { type MediaItem } from '../../new/MediaUploader';
import { MarketingChannel } from '@prisma/client';

const MODE_OPTIONS = [
    {
        value: 'POOL_VARY',
        emoji: '🎨',
        title: '사진풀 + AI 캡션 변형',
        desc: '사진을 미리 풀로 업로드 → 매번 다른 사진 + AI 가 다른 캡션 작성',
        bestFor: '식당 메뉴 사진 30장으로 한 달간 다양한 캡션 운영',
    },
    {
        value: 'AI_FRESH',
        emoji: '✨',
        title: 'AI 매번 신규 (이미지+캡션)',
        desc: '이미지·캡션 모두 매번 AI 가 새로 생성 (가장 다양, 노이즈 위험)',
        bestFor: '브랜드 분위기만 가이드, 구체 콘텐츠는 AI 에 위임',
    },
    {
        value: 'POOL_SIMILAR',
        emoji: '🔄',
        title: '사진풀, 캡션 비슷',
        desc: '사진은 풀에서 순환, 캡션은 같은 톤·스타일 (브랜드 일관성)',
        bestFor: '같은 행사 알림을 매번 약간만 다르게',
    },
    {
        value: 'PARAPHRASE',
        emoji: '📝',
        title: '본문만 약간씩 변형',
        desc: '시드 본문을 매번 다르게 표현 (이미지 없음)',
        bestFor: '같은 메시지를 여러 번 반복 노출',
    },
];

const SCHEDULE_OPTIONS = [
    { value: 'INTERVAL', label: '⏱️ 시간 간격 (예: 3시간마다)' },
    { value: 'DAILY', label: '📅 매일 정해진 시각 (예: 9시·19시)' },
    { value: 'WEEKLY', label: '📆 주간 패턴 (예: 월·수·금)' },
    { value: 'FIXED_COUNT', label: '🎯 N개 균등 분배 (시작~종료 사이 자동)' },
];

export default function SeriesNewClient() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [channels, setChannels] = useState<MarketingChannel[]>([]);
    const [mediaPool, setMediaPool] = useState<MediaItem[]>([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { listChannels().then(setChannels); }, []);

    const form = useForm({
        initialValues: {
            name: '',
            channelIds: [] as string[],
            mode: 'POOL_VARY' as 'POOL_VARY' | 'AI_FRESH' | 'POOL_SIMILAR' | 'PARAPHRASE',
            scheduleType: 'DAILY' as 'INTERVAL' | 'DAILY' | 'WEEKLY' | 'FIXED_COUNT',
            intervalHours: 3,
            dailyTimes: '09:00,12:00,19:00',
            weeklyDays: [1, 3, 5] as number[], // 월·수·금
            totalPosts: 30,
            contentSeed: '',
            startAt: new Date(Date.now() + 10 * 60 * 1000),
            endAt: undefined as Date | undefined,
            startNow: true,
            // Brief
            briefPurpose: '',
            briefTone: '',
            briefAudience: '',
            briefIndustry: '',
            briefCta: '',
            briefBrandName: '',
        },
    });

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const v = form.values;
            // mediaPool — R2 url 만 (dataUrl 만 있는 inline 미디어는 series 에 부적합 — 외부 publisher 첨부 불가)
            const mediaPoolUrls = mediaPool.filter(m => m.url).map(m => m.url!);
            if ((v.mode === 'POOL_VARY' || v.mode === 'POOL_SIMILAR') && mediaPoolUrls.length === 0) {
                notifications.show({
                    color: 'orange',
                    title: '사진풀 필요',
                    message: '이 모드는 R2 업로드된 사진이 1장 이상 필요합니다. R2 환경변수 미설정 시 inline 만 가능 — 향후 R2 설정 권장.',
                });
            }

            const brief: any = {};
            if (v.briefPurpose) brief.purpose = v.briefPurpose;
            if (v.briefTone) brief.tone = v.briefTone;
            if (v.briefAudience) brief.audience = v.briefAudience;
            if (v.briefIndustry) brief.industry = v.briefIndustry;
            if (v.briefCta) brief.cta = v.briefCta;
            if (v.briefBrandName) brief.brandName = v.briefBrandName;

            const dailyTimesArr = v.dailyTimes.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);

            const r = await createSeries({
                name: v.name,
                channelIds: v.channelIds,
                mode: v.mode,
                scheduleType: v.scheduleType,
                intervalHours: v.scheduleType === 'INTERVAL' ? v.intervalHours : undefined,
                dailyTimes: (v.scheduleType === 'DAILY' || v.scheduleType === 'WEEKLY') ? dailyTimesArr : undefined,
                weeklyDays: v.scheduleType === 'WEEKLY' ? v.weeklyDays : undefined,
                totalPosts: v.totalPosts,
                mediaPool: mediaPoolUrls.length > 0 ? mediaPoolUrls : undefined,
                contentSeed: v.contentSeed.trim() || undefined,
                briefData: Object.keys(brief).length > 0 ? brief : undefined,
                startAt: v.startAt,
                endAt: v.endAt,
                startNow: v.startNow,
            });
            notifications.show({
                color: 'teal',
                title: '🤖 시리즈 생성됨',
                message: v.startNow ? '진행 중 — cron 이 5분마다 다음 발행 처리합니다' : 'DRAFT 로 저장 — 시작은 목록에서',
            });
            router.push('/dashboard/campaigns/series');
        } catch (e: any) {
            notifications.show({ color: 'red', title: '오류', message: e?.message || '실패' });
        } finally {
            setSubmitting(false);
        }
    };

    const selectedMode = MODE_OPTIONS.find(o => o.value === form.values.mode)!;

    return (
        <Container size="lg">
            <Stack gap="md" mb="lg">
                <Group gap={6}>
                    <Anchor component={Link} href="/dashboard/campaigns/series" size="sm">← 시리즈 목록</Anchor>
                </Group>
                <Title order={2}>🤖 새 자동화 시리즈</Title>
                <Text c="dimmed">
                    한 번 설정 → 정해진 일정에 따라 자동 캠페인 생성·발행. cron 이 5분마다 다음 발행 처리.
                </Text>
            </Stack>

            <Stepper active={step} onStepClick={setStep} mb="xl">
                <Stepper.Step label="기본" description="이름·채널" />
                <Stepper.Step label="콘텐츠 모드" description="POOL/AI/PARAPHRASE" />
                <Stepper.Step label="스케줄" description="시간·횟수" />
                <Stepper.Step label="검토·시작" description="확인 후 발행" />
            </Stepper>

            <Paper withBorder p="lg" radius="md">
                {step === 0 && (
                    <Stack gap="md">
                        <TextInput
                            label="시리즈 이름"
                            placeholder="예: 봄 시즌 30일 자동 운영"
                            required
                            {...form.getInputProps('name')}
                        />
                        <MultiSelect
                            label="발행 채널 (멀티 선택)"
                            placeholder={channels.length === 0 ? '채널을 먼저 추가하세요' : '채널 선택'}
                            data={channels.map(c => ({
                                value: c.id,
                                label: `[${c.type}] ${c.accountName} · ${(c as any).language?.toUpperCase() || 'KO'}`,
                            }))}
                            searchable
                            required
                            disabled={channels.length === 0}
                            {...form.getInputProps('channelIds')}
                        />
                        {/* AI 브리프 (간소화 버전) */}
                        <Divider label="AI 콘텐츠 브리프 (선택)" labelPosition="left" />
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                            <Select
                                label="콘텐츠 목적"
                                placeholder="선택"
                                clearable
                                data={[
                                    { value: 'review', label: '✍️ 후기·리뷰' },
                                    { value: 'info', label: '📚 정보·교육' },
                                    { value: 'promo', label: '🎉 홍보·할인' },
                                    { value: 'story', label: '💝 스토리텔링' },
                                ]}
                                {...form.getInputProps('briefPurpose')}
                            />
                            <Select
                                label="톤"
                                placeholder="선택"
                                clearable
                                data={[
                                    { value: 'casual', label: '😊 친근' },
                                    { value: 'professional', label: '👔 전문' },
                                    { value: 'humorous', label: '🤣 유머' },
                                    { value: 'trendy', label: '🔥 트렌디' },
                                    { value: 'warm', label: '💕 감성' },
                                ]}
                                {...form.getInputProps('briefTone')}
                            />
                            <Select
                                label="타겟"
                                placeholder="선택"
                                clearable
                                data={[
                                    { value: 'mz_2030', label: '20-30 MZ' },
                                    { value: 'mid_3040', label: '30-40' },
                                    { value: 'b2b', label: 'B2B' },
                                    { value: 'general', label: '일반' },
                                ]}
                                {...form.getInputProps('briefAudience')}
                            />
                            <TextInput label="업종" placeholder="예: 카페" {...form.getInputProps('briefIndustry')} />
                        </SimpleGrid>
                    </Stack>
                )}

                {step === 1 && (
                    <Stack gap="md">
                        <Text size="sm" fw={700}>콘텐츠 모드 선택</Text>
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                            {MODE_OPTIONS.map(m => (
                                <Card
                                    key={m.value}
                                    withBorder
                                    radius="md"
                                    p="md"
                                    onClick={() => form.setFieldValue('mode', m.value as any)}
                                    style={{
                                        cursor: 'pointer',
                                        borderColor: form.values.mode === m.value ? 'var(--mantine-color-violet-5)' : undefined,
                                        background: form.values.mode === m.value ? 'var(--mantine-color-violet-0)' : undefined,
                                    }}
                                >
                                    <Group gap={8} mb={4}>
                                        <Text size="20px">{m.emoji}</Text>
                                        <Text fw={700} size="sm">{m.title}</Text>
                                    </Group>
                                    <Text size="xs" c="dimmed">{m.desc}</Text>
                                    <Text size="11px" c="violet.7" mt={6} fw={600}>예시: {m.bestFor}</Text>
                                </Card>
                            ))}
                        </SimpleGrid>

                        {/* 모드별 추가 입력 */}
                        {(form.values.mode === 'POOL_VARY' || form.values.mode === 'POOL_SIMILAR') && (
                            <Box>
                                <Text size="sm" fw={700} mb={4}>📸 사진 풀 업로드 (R2 권장)</Text>
                                <Text size="xs" c="dimmed" mb="xs">
                                    이미지를 여러 장 업로드. 각 발행마다 1장씩 라운드로빈으로 사용. R2 미설정 시 inline 은 외부 publisher 에 첨부 안 됨 → R2 설정 권장.
                                </Text>
                                <MediaUploader items={mediaPool} onChange={setMediaPool} maxItems={50} />
                            </Box>
                        )}
                        {(form.values.mode === 'POOL_SIMILAR' || form.values.mode === 'PARAPHRASE' || form.values.mode === 'AI_FRESH') && (
                            <Textarea
                                label="시드 본문 (AI 가 변형/참고)"
                                placeholder="예: 봄 신메뉴가 출시됐어요! 따뜻한 햇살 아래서 라떼 한 잔..."
                                autosize
                                minRows={3}
                                maxRows={8}
                                {...form.getInputProps('contentSeed')}
                            />
                        )}
                    </Stack>
                )}

                {step === 2 && (
                    <Stack gap="md">
                        <Select
                            label="스케줄 유형"
                            data={SCHEDULE_OPTIONS}
                            allowDeselect={false}
                            {...form.getInputProps('scheduleType')}
                        />
                        {form.values.scheduleType === 'INTERVAL' && (
                            <NumberInput
                                label="시간 간격 (시간)"
                                description="발행 간격 — 예: 3 = 3시간마다"
                                min={1}
                                max={168}
                                {...form.getInputProps('intervalHours')}
                            />
                        )}
                        {(form.values.scheduleType === 'DAILY' || form.values.scheduleType === 'WEEKLY') && (
                            <TextInput
                                label="발행 시각 (콤마 구분, HH:mm)"
                                placeholder="09:00,12:00,19:00"
                                {...form.getInputProps('dailyTimes')}
                            />
                        )}
                        {form.values.scheduleType === 'WEEKLY' && (
                            <MultiSelect
                                label="요일"
                                data={[
                                    { value: '0', label: '일' },
                                    { value: '1', label: '월' },
                                    { value: '2', label: '화' },
                                    { value: '3', label: '수' },
                                    { value: '4', label: '목' },
                                    { value: '5', label: '금' },
                                    { value: '6', label: '토' },
                                ]}
                                value={form.values.weeklyDays.map(String)}
                                onChange={(v) => form.setFieldValue('weeklyDays', v.map(Number))}
                            />
                        )}
                        <NumberInput
                            label="총 발행 수"
                            description="이 횟수에 도달하면 자동 종료"
                            min={1}
                            max={1000}
                            {...form.getInputProps('totalPosts')}
                        />
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                            <DateTimePicker
                                label="시작 일시"
                                {...form.getInputProps('startAt')}
                            />
                            <DateTimePicker
                                label="종료 일시 (선택)"
                                placeholder="totalPosts 도달 시 자동 종료"
                                clearable
                                {...form.getInputProps('endAt')}
                            />
                        </SimpleGrid>
                    </Stack>
                )}

                {step === 3 && (
                    <Stack gap="md">
                        <Text size="sm" fw={700}>설정 검토</Text>
                        <Card withBorder radius="md" p="md">
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                                <Box><Text size="xs" c="dimmed">이름</Text><Text fw={600}>{form.values.name || '미입력'}</Text></Box>
                                <Box><Text size="xs" c="dimmed">채널</Text><Text fw={600}>{form.values.channelIds.length}개</Text></Box>
                                <Box><Text size="xs" c="dimmed">모드</Text><Text fw={600}>{selectedMode.emoji} {selectedMode.title}</Text></Box>
                                <Box><Text size="xs" c="dimmed">스케줄</Text><Text fw={600}>{SCHEDULE_OPTIONS.find(s => s.value === form.values.scheduleType)?.label}</Text></Box>
                                <Box><Text size="xs" c="dimmed">총 발행</Text><Text fw={600}>{form.values.totalPosts}개</Text></Box>
                                {(form.values.mode === 'POOL_VARY' || form.values.mode === 'POOL_SIMILAR') && (
                                    <Box><Text size="xs" c="dimmed">사진풀</Text><Text fw={600}>{mediaPool.length}장</Text></Box>
                                )}
                            </SimpleGrid>
                        </Card>
                        <Group>
                            <input
                                type="checkbox"
                                checked={form.values.startNow}
                                onChange={(e) => form.setFieldValue('startNow', e.currentTarget.checked)}
                                id="startNow"
                            />
                            <label htmlFor="startNow"><Text size="sm">생성 직후 즉시 시작 (체크 해제 시 DRAFT 로 저장)</Text></label>
                        </Group>
                    </Stack>
                )}

                {/* 네비 */}
                <Group justify="space-between" mt="xl">
                    <Button variant="subtle" disabled={step === 0} onClick={() => setStep(step - 1)}>
                        이전
                    </Button>
                    {step < 3 ? (
                        <Button onClick={() => setStep(step + 1)} disabled={step === 0 && (form.values.channelIds.length === 0 || !form.values.name)}>
                            다음
                        </Button>
                    ) : (
                        <Button
                            leftSection={<IconRocket size={16} />}
                            onClick={handleSubmit}
                            loading={submitting}
                            color="violet"
                            variant="gradient"
                            gradient={{ from: 'violet', to: 'blue' }}
                        >
                            {form.values.startNow ? '생성하고 즉시 시작' : 'DRAFT 로 저장'}
                        </Button>
                    )}
                </Group>
            </Paper>
        </Container>
    );
}
