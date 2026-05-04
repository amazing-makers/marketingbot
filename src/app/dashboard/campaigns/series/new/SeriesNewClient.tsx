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
        emoji: '🖼️',
        title: '내 사진 + 매번 다른 글',
        desc: '사진을 미리 여러 장 올려두면 매번 1장씩 사용. 글은 AI 가 매번 새로 작성.',
        bestFor: '예: 음식점 메뉴 사진 30장으로 한 달 내내 다양한 멘트 자동',
    },
    {
        value: 'AI_FRESH',
        emoji: '✨',
        title: '전부 AI 가 새로 만들기',
        desc: '사진도 글도 매번 AI 가 새로 생성. 분위기만 잡아주면 알아서 만듭니다.',
        bestFor: '예: 브랜드 톤만 정해두고 다양성 최대로',
    },
    {
        value: 'POOL_SIMILAR',
        emoji: '🔁',
        title: '내 사진 + 일관된 글',
        desc: '사진은 풀에서 순서대로 사용, 글은 비슷한 톤·스타일 유지 (브랜드 일관성)',
        bestFor: '예: 매번 거의 같은 메시지를 약간만 바꿔서',
    },
    {
        value: 'PARAPHRASE',
        emoji: '📝',
        title: '글만 매번 살짝씩 다르게 (사진 없음)',
        desc: '미리 작성한 글을 AI 가 매번 표현만 약간 바꿔서 게시 (이미지 안 사용)',
        bestFor: '예: 같은 행사 알림을 반복 노출',
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
                        <Text size="sm" fw={700}>📦 사진과 글을 어떻게 만들까요?</Text>
                        <Text size="xs" c="dimmed">아래 4가지 방식 중 하나를 선택하세요. 각 방식의 차이는 카드에 설명되어 있어요.</Text>
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
                                <Text size="sm" fw={700} mb={4}>📸 사진·영상 추가 (3가지 방법 중 골라서)</Text>
                                <Text size="xs" c="dimmed" mb="xs">
                                    각 발행마다 1장씩 순서대로 사용해요. R2 클라우드 저장소가 설정되어 있어야 외부 채널에 첨부됩니다 (미설정 시 미리보기만).
                                </Text>

                                {/* 3가지 추가 방법 안내 */}
                                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs" mb="sm">
                                    <Card withBorder p="xs" radius="md" style={{ background: 'var(--mantine-color-blue-0)' }}>
                                        <Group gap={4} mb={2}><Text size="14px">📂</Text><Text size="xs" fw={700}>1. 파일 직접 선택</Text></Group>
                                        <Text size="10px" c="dimmed">아래 영역에 사진을 끌어다 놓거나 클릭해서 선택</Text>
                                    </Card>
                                    <Card withBorder p="xs" radius="md" style={{ background: 'var(--mantine-color-grape-0)' }}>
                                        <Group gap={4} mb={2}><Text size="14px">📁</Text><Text size="xs" fw={700}>2. 폴더 통째 선택</Text></Group>
                                        <Text size="10px" c="dimmed">아래의 "폴더 통째 선택" 버튼 → 안의 모든 이미지·영상 자동 추가</Text>
                                    </Card>
                                    <Card withBorder p="xs" radius="md" style={{ background: 'var(--mantine-color-violet-0)' }}>
                                        <Group gap={4} mb={2}><Text size="14px">✨</Text><Text size="xs" fw={700}>3. AI 로 만들기</Text></Group>
                                        <Text size="10px" c="dimmed">사진이 없으면 AI 가 만들어줘요. 캠페인 작성 페이지의 "AI 이미지 생성" 활용</Text>
                                    </Card>
                                </SimpleGrid>

                                <MediaUploader items={mediaPool} onChange={setMediaPool} maxItems={50} />
                            </Box>
                        )}
                        {(form.values.mode === 'POOL_SIMILAR' || form.values.mode === 'PARAPHRASE' || form.values.mode === 'AI_FRESH') && (
                            <Textarea
                                label={form.values.mode === 'PARAPHRASE'
                                    ? '📝 어떤 글을 매번 살짝씩 바꿔서 올릴까요?'
                                    : form.values.mode === 'POOL_SIMILAR'
                                        ? '📝 어떤 톤·스타일의 글을 원하세요? (AI 가 이걸 참고해서 일관된 글 작성)'
                                        : '✨ AI 에게 어떤 분위기·주제로 만들지 알려주세요'
                                }
                                placeholder="예: 봄 신메뉴가 출시됐어요! 따뜻한 햇살 아래 한 잔의 여유..."
                                autosize
                                minRows={3}
                                maxRows={8}
                                {...form.getInputProps('contentSeed')}
                            />
                        )}
                        {form.values.mode === 'AI_FRESH' && (
                            <Card withBorder p="md" radius="md" style={{ background: 'var(--mantine-color-violet-0)', borderColor: 'var(--mantine-color-violet-3)' }}>
                                <Group gap="sm">
                                    <Text size="lg">🎬</Text>
                                    <Stack gap={2}>
                                        <Text size="sm" fw={700} c="violet.9">AI 영상 자동 생성은 곧 출시 예정</Text>
                                        <Text size="xs" c="violet.7">
                                            현재는 AI 이미지만 생성 가능 (Pollinations/DALL-E/Imagen). 영상 생성은 비용·인프라 큼 →
                                            우선 직접 영상 파일을 업로드하시거나, AI 이미지로 진행 후 추후 출시 시 자동 마이그레이션.
                                        </Text>
                                    </Stack>
                                </Group>
                            </Card>
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
                                <Box><Text size="xs" c="dimmed">만드는 방식</Text><Text fw={600}>{selectedMode.emoji} {selectedMode.title}</Text></Box>
                                <Box><Text size="xs" c="dimmed">언제 올릴지</Text><Text fw={600}>{SCHEDULE_OPTIONS.find(s => s.value === form.values.scheduleType)?.label}</Text></Box>
                                <Box><Text size="xs" c="dimmed">총 발행 수</Text><Text fw={600}>{form.values.totalPosts}회</Text></Box>
                                {(form.values.mode === 'POOL_VARY' || form.values.mode === 'POOL_SIMILAR') && (
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
