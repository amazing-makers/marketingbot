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
        value: 'POOL',
        emoji: '🖼️',
        title: '내 사진/영상 사용',
        desc: '미리 올려둔 사진·영상을 순서대로 1장씩 사용 (글은 아래에서 선택)',
        bestFor: '예: 음식점 메뉴 사진 30장으로 한 달 자동 운영',
    },
    {
        value: 'AI_IMAGE',
        emoji: '🎨',
        title: 'AI 이미지 생성 발행',
        desc: '매번 AI 가 이미지·글을 새로 만들어서 발행 (Pollinations·DALL-E·Imagen)',
        bestFor: '예: 사진이 없을 때 AI 가 알아서 만들기',
    },
    {
        value: 'AI_VIDEO',
        emoji: '🎬',
        title: 'AI 영상 생성 발행',
        desc: '⏳ 곧 출시 예정 — 현재 선택 시 AI 이미지로 자동 폴백',
        bestFor: 'Runway/Pika API 통합 후 활성화 (Phase 12+)',
        comingSoon: true,
    },
];

const CATEGORY_OPTIONS = [
    {
        value: 'SNS',
        emoji: '📱',
        title: 'SNS 발행',
        desc: '짧은 글 + 이미지 1장 (Instagram·X·Threads·페이스북·Discord 등)',
    },
    {
        value: 'BLOG',
        emoji: '📝',
        title: '블로그 발행',
        desc: '긴 글 + 이미지 5장 (네이버 블로그·티스토리·워드프레스 등)',
    },
];

const SCHEDULE_OPTIONS = [
    { value: 'INTERVAL', label: '⏱️ 몇 시간마다 1번씩 (예: 3시간마다)' },
    { value: 'DAILY', label: '📅 매일 정해진 시간에 (예: 매일 9시·19시)' },
    { value: 'WEEKLY', label: '📆 정해진 요일에만 (예: 월·수·금)' },
    { value: 'FIXED_COUNT', label: '🎯 기간 안에 균등하게 (예: 5일 동안 30개)' },
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
            mode: 'POOL' as 'POOL' | 'AI_IMAGE' | 'AI_VIDEO',
            captionStyle: 'VARY' as 'VARY' | 'SIMILAR',
            contentCategory: 'SNS' as 'SNS' | 'BLOG',
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
            if (v.mode === 'POOL' && mediaPoolUrls.length === 0) {
                notifications.show({
                    color: 'orange',
                    title: '사진/영상 필요',
                    message: '"내 사진/영상 사용" 모드는 R2 업로드된 미디어가 1장 이상 필요합니다. R2 환경변수 등록 후 다시 시도하세요.',
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
                captionStyle: v.mode === 'POOL' ? v.captionStyle : undefined,
                contentCategory: v.contentCategory,
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
                <Title order={2}>🔁 새 자동 발행 만들기</Title>
                <Text c="dimmed">
                    한 번만 설정해두면 정해진 시간마다 알아서 게시물을 만들어 올려줍니다. (5분마다 자동 처리)
                </Text>
            </Stack>

            <Stepper active={step} onStepClick={setStep} mb="xl">
                <Stepper.Step label="1. 기본 정보" description="이름·채널" />
                <Stepper.Step label="2. 어떻게 만들지" description="사진·글 방식" />
                <Stepper.Step label="3. 언제 올릴지" description="시간·횟수" />
                <Stepper.Step label="4. 확인·시작" description="검토 후 발행" />
            </Stepper>

            <Paper withBorder p="lg" radius="md">
                {step === 0 && (
                    <Stack gap="md">
                        <TextInput
                            label="이 자동 발행의 이름 (나만 보는 것)"
                            placeholder="예: 봄 시즌 30일 자동 운영"
                            required
                            {...form.getInputProps('name')}
                        />
                        <MultiSelect
                            label="어떤 채널에 올릴까요? (여러 개 선택 가능)"
                            placeholder={channels.length === 0 ? '먼저 채널을 등록해주세요' : '채널 선택'}
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
                        <Divider label="🪄 AI에게 알려주기 (선택, 입력하면 글 품질 ↑)" labelPosition="left" />
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                            <Select
                                label="어떤 종류의 글인가요?"
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
                                label="말투는 어떻게?"
                                placeholder="선택"
                                clearable
                                data={[
                                    { value: 'casual', label: '😊 친근하게 (반말 친구처럼)' },
                                    { value: 'professional', label: '👔 격식 있게 (정중)' },
                                    { value: 'humorous', label: '🤣 유머러스하게' },
                                    { value: 'trendy', label: '🔥 MZ 트렌디 (이모지 많이)' },
                                    { value: 'warm', label: '💕 따뜻·감성적으로' },
                                ]}
                                {...form.getInputProps('briefTone')}
                            />
                            <Select
                                label="누구를 향한 글?"
                                placeholder="선택"
                                clearable
                                data={[
                                    { value: 'mz_2030', label: '20-30대 MZ세대' },
                                    { value: 'mid_3040', label: '30-40대 (가족·실용)' },
                                    { value: 'b2b', label: '회사·전문가 (B2B)' },
                                    { value: 'general', label: '일반인 (다양한 연령)' },
                                ]}
                                {...form.getInputProps('briefAudience')}
                            />
                            <TextInput label="어떤 업종/분야인가요?" placeholder="예: 카페, IT, 헬스장" {...form.getInputProps('briefIndustry')} />
                        </SimpleGrid>
                    </Stack>
                )}

                {step === 1 && (
                    <Stack gap="md">
                        {/* 카테고리 선택 (SNS / BLOG) */}
                        <Box>
                            <Text size="sm" fw={700} mb={4}>📂 어떤 종류의 발행인가요?</Text>
                            <Text size="xs" c="dimmed" mb="xs">SNS 와 블로그는 글 길이와 이미지 개수가 달라요</Text>
                            <SimpleGrid cols={2} spacing="md">
                                {CATEGORY_OPTIONS.map(c => (
                                    <Card
                                        key={c.value}
                                        withBorder
                                        radius="md"
                                        p="md"
                                        onClick={() => form.setFieldValue('contentCategory', c.value as any)}
                                        style={{
                                            cursor: 'pointer',
                                            borderColor: form.values.contentCategory === c.value ? 'var(--mantine-color-blue-5)' : undefined,
                                            background: form.values.contentCategory === c.value ? 'var(--mantine-color-blue-0)' : undefined,
                                        }}
                                    >
                                        <Group gap={8} mb={4}>
                                            <Text size="20px">{c.emoji}</Text>
                                            <Text fw={700} size="sm">{c.title}</Text>
                                        </Group>
                                        <Text size="xs" c="dimmed">{c.desc}</Text>
                                    </Card>
                                ))}
                            </SimpleGrid>
                        </Box>

                        <Divider />

                        <Text size="sm" fw={700}>📦 사진과 글을 어떻게 만들까요?</Text>
                        <Text size="xs" c="dimmed">아래 3가지 방식 중 하나를 선택하세요</Text>
                        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                            {MODE_OPTIONS.map(m => (
                                <Card
                                    key={m.value}
                                    withBorder
                                    radius="md"
                                    p="md"
                                    onClick={() => !m.comingSoon && form.setFieldValue('mode', m.value as any)}
                                    style={{
                                        cursor: m.comingSoon ? 'not-allowed' : 'pointer',
                                        borderColor: form.values.mode === m.value ? 'var(--mantine-color-violet-5)' : undefined,
                                        background: form.values.mode === m.value ? 'var(--mantine-color-violet-0)' : undefined,
                                        opacity: m.comingSoon ? 0.6 : 1,
                                    }}
                                >
                                    <Group gap={8} mb={4}>
                                        <Text size="20px">{m.emoji}</Text>
                                        <Text fw={700} size="sm">{m.title}</Text>
                                        {m.comingSoon && <Badge size="xs" color="gray" variant="filled">곧 출시</Badge>}
                                    </Group>
                                    <Text size="xs" c="dimmed">{m.desc}</Text>
                                    <Text size="11px" c="violet.7" mt={6} fw={600}>{m.bestFor}</Text>
                                </Card>
                            ))}
                        </SimpleGrid>

                        {/* POOL 모드 시 글 스타일 선택 */}
                        {form.values.mode === 'POOL' && (
                            <Card withBorder radius="md" p="md" bg="violet.0" style={{ borderColor: 'var(--mantine-color-violet-3)' }}>
                                <Text size="sm" fw={700} mb="xs">✏️ 글은 어떻게 작성할까요?</Text>
                                <SimpleGrid cols={2} spacing="sm">
                                    <Card
                                        withBorder
                                        radius="md"
                                        p="sm"
                                        onClick={() => form.setFieldValue('captionStyle', 'VARY' as any)}
                                        style={{
                                            cursor: 'pointer',
                                            borderColor: form.values.captionStyle === 'VARY' ? 'var(--mantine-color-violet-5)' : undefined,
                                            background: form.values.captionStyle === 'VARY' ? 'var(--mantine-color-violet-1)' : 'white',
                                        }}
                                    >
                                        <Group gap={6} mb={2}>
                                            <Text>🎲</Text>
                                            <Text fw={700} size="sm">매번 다른 글</Text>
                                        </Group>
                                        <Text size="11px" c="dimmed">매번 새로운 표현·각도로 글 작성 (다양성 ↑)</Text>
                                    </Card>
                                    <Card
                                        withBorder
                                        radius="md"
                                        p="sm"
                                        onClick={() => form.setFieldValue('captionStyle', 'SIMILAR' as any)}
                                        style={{
                                            cursor: 'pointer',
                                            borderColor: form.values.captionStyle === 'SIMILAR' ? 'var(--mantine-color-violet-5)' : undefined,
                                            background: form.values.captionStyle === 'SIMILAR' ? 'var(--mantine-color-violet-1)' : 'white',
                                        }}
                                    >
                                        <Group gap={6} mb={2}>
                                            <Text>🔁</Text>
                                            <Text fw={700} size="sm">일관된 글 (브랜드 통일)</Text>
                                        </Group>
                                        <Text size="11px" c="dimmed">시드 본문 톤 유지하며 약간만 변형</Text>
                                    </Card>
                                </SimpleGrid>
                            </Card>
                        )}

                        {/* 모드별 추가 입력 */}
                        {form.values.mode === 'POOL' && (
                            <Box>
                                <Text size="sm" fw={700} mb={4}>
                                    📸 사진/영상 추가 ({form.values.contentCategory === 'BLOG' ? '블로그용 — 매번 5장 사용' : 'SNS용 — 매번 1장씩 순서대로'})
                                </Text>
                                <Text size="xs" c="dimmed" mb="xs">
                                    아래 3가지 방법 중 편한 걸로 추가하세요. R2 클라우드 저장소 설정 시에만 외부 채널 첨부 가능.
                                </Text>

                                {/* 3가지 추가 방법 안내 */}
                                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs" mb="sm">
                                    <Card withBorder p="xs" radius="md" style={{ background: 'var(--mantine-color-blue-0)' }}>
                                        <Group gap={4} mb={2}><Text size="14px">📂</Text><Text size="xs" fw={700}>1. 파일 직접 선택</Text></Group>
                                        <Text size="10px" c="dimmed">아래 영역에 사진을 끌어다 놓거나 클릭해서 선택</Text>
                                    </Card>
                                    <Card withBorder p="xs" radius="md" style={{ background: 'var(--mantine-color-grape-0)' }}>
                                        <Group gap={4} mb={2}><Text size="14px">📁</Text><Text size="xs" fw={700}>2. 폴더 통째 선택</Text></Group>
                                        <Text size="10px" c="dimmed">"폴더 통째 선택" 버튼 → 안의 모든 이미지·영상 자동 추가</Text>
                                    </Card>
                                    <Card withBorder p="xs" radius="md" style={{ background: 'var(--mantine-color-violet-0)' }}>
                                        <Group gap={4} mb={2}><Text size="14px">✨</Text><Text size="xs" fw={700}>3. AI 로 만들기</Text></Group>
                                        <Text size="10px" c="dimmed">캠페인 작성 페이지에서 AI 이미지 생성 후 다시 시리즈 만들기</Text>
                                    </Card>
                                </SimpleGrid>

                                <MediaUploader items={mediaPool} onChange={setMediaPool} maxItems={form.values.contentCategory === 'BLOG' ? 100 : 50} />

                                {form.values.captionStyle === 'SIMILAR' && (
                                    <Textarea
                                        mt="md"
                                        label="📝 일관된 글의 기준이 될 본문 (AI 가 이걸 참고해서 비슷한 톤으로 작성)"
                                        placeholder="예: 신메뉴가 출시됐어요! 따뜻한 햇살 아래 한 잔의 여유..."
                                        autosize
                                        minRows={3}
                                        maxRows={8}
                                        {...form.getInputProps('contentSeed')}
                                    />
                                )}
                                {form.values.captionStyle === 'VARY' && (
                                    <Textarea
                                        mt="md"
                                        label="✏️ 캠페인 주제 (선택, AI 에게 어떤 내용일지 알려주기)"
                                        placeholder="예: 봄 시즌 신메뉴 라떼 — 매번 다른 각도와 표현으로"
                                        autosize
                                        minRows={2}
                                        maxRows={5}
                                        {...form.getInputProps('contentSeed')}
                                    />
                                )}
                            </Box>
                        )}

                        {(form.values.mode === 'AI_IMAGE' || form.values.mode === 'AI_VIDEO') && (
                            <>
                                <Textarea
                                    label="✨ AI 에게 어떤 분위기·주제로 만들지 알려주세요"
                                    description={form.values.mode === 'AI_VIDEO'
                                        ? '⏳ AI 영상 생성은 곧 출시 예정 — 현재는 AI 이미지로 자동 폴백됩니다'
                                        : '구체적일수록 좋아요. 예: 따뜻한 햇살이 드는 카페에서 봄 신메뉴 라떼...'
                                    }
                                    placeholder="예: 봄 시즌 카페 신메뉴 라떼와 케이크, 따뜻하고 미니멀한 스타일"
                                    autosize
                                    minRows={3}
                                    maxRows={8}
                                    {...form.getInputProps('contentSeed')}
                                />
                                {form.values.mode === 'AI_VIDEO' && (
                                    <Card withBorder p="md" radius="md" style={{ background: 'var(--mantine-color-violet-0)', borderColor: 'var(--mantine-color-violet-3)' }}>
                                        <Group gap="sm">
                                            <Text size="lg">🎬</Text>
                                            <Stack gap={2}>
                                                <Text size="sm" fw={700} c="violet.9">AI 영상 자동 생성은 곧 출시</Text>
                                                <Text size="xs" c="violet.7">
                                                    Runway/Pika API 통합 후 활성화 (Phase 12+). 그 전까지는 AI 이미지로 폴백.
                                                </Text>
                                            </Stack>
                                        </Group>
                                    </Card>
                                )}
                            </>
                        )}
                    </Stack>
                )}

                {step === 2 && (
                    <Stack gap="md">
                        <Select
                            label="언제 올릴까요?"
                            data={SCHEDULE_OPTIONS}
                            allowDeselect={false}
                            {...form.getInputProps('scheduleType')}
                        />
                        {form.values.scheduleType === 'INTERVAL' && (
                            <NumberInput
                                label="몇 시간마다 1번?"
                                description="예: 3 입력 = 3시간마다 1번씩 자동 발행"
                                min={1}
                                max={168}
                                {...form.getInputProps('intervalHours')}
                            />
                        )}
                        {(form.values.scheduleType === 'DAILY' || form.values.scheduleType === 'WEEKLY') && (
                            <TextInput
                                label="몇 시에 올릴까요? (여러 개는 콤마로 구분, 24시간제 HH:mm)"
                                placeholder="09:00,12:00,19:00 (= 매일 오전 9시·낮 12시·저녁 7시)"
                                {...form.getInputProps('dailyTimes')}
                            />
                        )}
                        {form.values.scheduleType === 'WEEKLY' && (
                            <MultiSelect
                                label="어떤 요일에 올릴까요?"
                                data={[
                                    { value: '0', label: '일요일' },
                                    { value: '1', label: '월요일' },
                                    { value: '2', label: '화요일' },
                                    { value: '3', label: '수요일' },
                                    { value: '4', label: '목요일' },
                                    { value: '5', label: '금요일' },
                                    { value: '6', label: '토요일' },
                                ]}
                                value={form.values.weeklyDays.map(String)}
                                onChange={(v) => form.setFieldValue('weeklyDays', v.map(Number))}
                            />
                        )}
                        <NumberInput
                            label="총 몇 번 올릴까요?"
                            description="이 숫자만큼 발행되면 자동으로 멈춰요"
                            min={1}
                            max={1000}
                            {...form.getInputProps('totalPosts')}
                        />
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                            <DateTimePicker
                                label="언제부터 시작할까요?"
                                {...form.getInputProps('startAt')}
                            />
                            <DateTimePicker
                                label="언제까지? (선택)"
                                placeholder="비워두면 위 횟수 도달 시 자동 종료"
                                clearable
                                {...form.getInputProps('endAt')}
                            />
                        </SimpleGrid>
                    </Stack>
                )}

                {step === 3 && (
                    <Stack gap="md">
                        <Text size="sm" fw={700}>마지막 확인</Text>
                        <Card withBorder radius="md" p="md">
                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                                <Box><Text size="xs" c="dimmed">이름</Text><Text fw={600}>{form.values.name || '미입력'}</Text></Box>
                                <Box><Text size="xs" c="dimmed">올릴 채널</Text><Text fw={600}>{form.values.channelIds.length}개</Text></Box>
                                <Box><Text size="xs" c="dimmed">발행 종류</Text><Text fw={600}>{form.values.contentCategory === 'BLOG' ? '📝 블로그 발행' : '📱 SNS 발행'}</Text></Box>
                                <Box><Text size="xs" c="dimmed">만드는 방식</Text><Text fw={600}>{selectedMode?.emoji} {selectedMode?.title}</Text></Box>
                                {form.values.mode === 'POOL' && (
                                    <Box><Text size="xs" c="dimmed">글 스타일</Text><Text fw={600}>{form.values.captionStyle === 'SIMILAR' ? '🔁 일관된 글' : '🎲 매번 다른 글'}</Text></Box>
                                )}
                                <Box><Text size="xs" c="dimmed">언제 올릴지</Text><Text fw={600}>{SCHEDULE_OPTIONS.find(s => s.value === form.values.scheduleType)?.label}</Text></Box>
                                <Box><Text size="xs" c="dimmed">총 발행 수</Text><Text fw={600}>{form.values.totalPosts}회</Text></Box>
                                {form.values.mode === 'POOL' && (
                                    <Box><Text size="xs" c="dimmed">준비된 사진</Text><Text fw={600}>{mediaPool.length}장</Text></Box>
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
                            <label htmlFor="startNow"><Text size="sm">만들자마자 바로 시작하기 (체크 해제 시 저장만)</Text></label>
                        </Group>
                    </Stack>
                )}

                {/* 네비 */}
                <Group justify="space-between" mt="xl">
                    <Button variant="subtle" disabled={step === 0} onClick={() => setStep(step - 1)}>
                        ← 이전
                    </Button>
                    {step < 3 ? (
                        <Button onClick={() => setStep(step + 1)} disabled={step === 0 && (form.values.channelIds.length === 0 || !form.values.name)}>
                            다음 →
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
                            {form.values.startNow ? '🚀 만들고 바로 시작하기' : '💾 일단 저장만 하기'}
                        </Button>
                    )}
                </Group>
            </Paper>
        </Container>
    );
}
