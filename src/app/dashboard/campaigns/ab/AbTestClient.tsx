'use client';

import {
    Container, Title, Text, Stack, Group, Card, Button, Paper, Badge,
    TextInput, Textarea, MultiSelect, NumberInput, SimpleGrid, Box, Anchor,
    Select, Divider
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconFlask, IconArrowLeft, IconRocket, IconCheck } from '@tabler/icons-react';
import { createAbTest } from '@/app/actions/seriesActions';

interface ChannelLite {
    id: string;
    type: string;
    accountName: string;
    language?: string | null;
    region?: string | null;
}

export default function AbTestClient({ channels }: { channels: ChannelLite[] }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<{ campaignIds: string[]; variants: { content: string }[] } | null>(null);

    const form = useForm({
        initialValues: {
            name: '',
            channelIds: [] as string[],
            seed: '',
            variantCount: 3,
            briefPurpose: '',
            briefTone: '',
            briefAudience: '',
        },
    });

    const handleSubmit = async (values: typeof form.values) => {
        if (!values.name || !values.seed || values.channelIds.length === 0) {
            notifications.show({ color: 'orange', title: '필수 입력', message: '이름, 시드 본문, 채널 모두 입력' });
            return;
        }
        setBusy(true);
        setResult(null);
        try {
            const brief: any = {};
            if (values.briefPurpose) brief.purpose = values.briefPurpose;
            if (values.briefTone) brief.tone = values.briefTone;
            if (values.briefAudience) brief.audience = values.briefAudience;

            const r = await createAbTest({
                name: values.name,
                channelIds: values.channelIds,
                seed: values.seed,
                variantCount: values.variantCount,
                brief: Object.keys(brief).length > 0 ? brief : undefined,
            });
            setResult(r);
            notifications.show({
                color: 'teal',
                title: `🧪 A/B 테스트 ${r.variants.length}개 변형 생성됨`,
                message: `${r.campaignIds.length}개 캠페인 즉시 발행 예약`,
                autoClose: 7000,
            });
        } catch (e: any) {
            notifications.show({ color: 'red', title: '오류', message: e?.message });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Container size="lg">
            <Stack gap="md" mb="lg">
                <Group gap={4}>
                    <Anchor component={Link} href="/dashboard/campaigns" size="sm">
                        <Group gap={4}>
                            <IconArrowLeft size={14} />
                            캠페인 목록
                        </Group>
                    </Anchor>
                </Group>
                <Group gap="sm">
                    <Title order={2}>🧪 A/B 테스트</Title>
                    <Badge color="violet" variant="light">실험 기능</Badge>
                </Group>
                <Text c="dimmed" size="sm">
                    같은 메시지를 <strong>N개의 다른 표현 (변형)</strong>으로 AI 가 작성 → 동시 발행 → 어떤 변형이 가장 잘 되는지 추후 비교
                </Text>
            </Stack>

            <Paper withBorder p="lg" radius="md">
                {!result ? (
                    <form onSubmit={form.onSubmit(handleSubmit)}>
                        <Stack gap="md">
                            <TextInput
                                label="A/B 테스트 이름"
                                placeholder="예: 봄세일 후킹 문장 테스트"
                                required
                                {...form.getInputProps('name')}
                            />
                            <MultiSelect
                                label="대상 채널 (각 변형이 모든 채널에 동시 발행)"
                                placeholder={channels.length === 0 ? '먼저 채널을 추가하세요' : '채널 선택'}
                                data={channels.map(c => ({
                                    value: c.id,
                                    label: `[${c.type}] ${c.accountName}`,
                                }))}
                                searchable
                                required
                                disabled={channels.length === 0}
                                {...form.getInputProps('channelIds')}
                            />
                            <Textarea
                                label="시드 본문 (AI 가 N개 변형으로 다시 작성)"
                                placeholder="예: 봄 신메뉴 라떼 출시! 따뜻한 햇살 아래 한 잔의 여유."
                                description="이 본문을 기반으로 AI 가 다른 후킹·CTA·구조의 변형을 만듭니다"
                                autosize
                                minRows={3}
                                maxRows={8}
                                required
                                {...form.getInputProps('seed')}
                            />
                            <NumberInput
                                label="변형 개수"
                                description="2-5개 권장. 많을수록 AI 호출 비용 ↑"
                                min={2}
                                max={5}
                                {...form.getInputProps('variantCount')}
                            />

                            <Divider label="AI 브리프 (선택, 변형 품질 향상)" labelPosition="left" />
                            <SimpleGrid cols={3} spacing="sm">
                                <Select
                                    label="목적"
                                    placeholder="선택"
                                    clearable
                                    data={[
                                        { value: 'review', label: '후기' },
                                        { value: 'info', label: '정보' },
                                        { value: 'promo', label: '홍보' },
                                        { value: 'story', label: '스토리' },
                                    ]}
                                    {...form.getInputProps('briefPurpose')}
                                />
                                <Select
                                    label="톤"
                                    placeholder="선택"
                                    clearable
                                    data={[
                                        { value: 'casual', label: '친근' },
                                        { value: 'professional', label: '전문' },
                                        { value: 'humorous', label: '유머' },
                                        { value: 'trendy', label: '트렌디' },
                                        { value: 'warm', label: '감성' },
                                    ]}
                                    {...form.getInputProps('briefTone')}
                                />
                                <Select
                                    label="타겟"
                                    placeholder="선택"
                                    clearable
                                    data={[
                                        { value: 'mz_2030', label: 'MZ' },
                                        { value: 'mid_3040', label: '30-40' },
                                        { value: 'b2b', label: 'B2B' },
                                        { value: 'general', label: '일반' },
                                    ]}
                                    {...form.getInputProps('briefAudience')}
                                />
                            </SimpleGrid>

                            <Group justify="flex-end">
                                <Button
                                    type="submit"
                                    loading={busy}
                                    leftSection={<IconRocket size={16} />}
                                    color="violet"
                                    variant="gradient"
                                    gradient={{ from: 'violet', to: 'pink' }}
                                >
                                    {form.values.variantCount}개 변형 생성 + 즉시 발행
                                </Button>
                            </Group>
                        </Stack>
                    </form>
                ) : (
                    <Stack gap="md">
                        <Group gap="sm">
                            <Badge color="teal" variant="filled" size="lg">✓ 생성 완료</Badge>
                            <Text fw={700}>{result.variants.length}개 변형 · {result.campaignIds.length}개 캠페인 발행 예약</Text>
                        </Group>
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                            {result.variants.map((v, i) => (
                                <Card key={i} withBorder radius="md" p="md" style={{
                                    borderLeft: `4px solid var(--mantine-color-violet-${4 + i})`,
                                }}>
                                    <Group gap={6} mb="xs">
                                        <Badge color="violet" variant="filled" size="lg">변형 {String.fromCharCode(65 + i)}</Badge>
                                        <Anchor component={Link} href={`/dashboard/campaigns/${result.campaignIds[i]}`} size="xs">
                                            캠페인 보기 →
                                        </Anchor>
                                    </Group>
                                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }} lineClamp={10}>
                                        {v.content}
                                    </Text>
                                </Card>
                            ))}
                        </SimpleGrid>
                        <Group justify="space-between" mt="md">
                            <Button variant="subtle" onClick={() => { setResult(null); form.reset(); }}>
                                새 테스트 만들기
                            </Button>
                            <Button leftSection={<IconCheck size={14} />} component={Link} href="/dashboard/campaigns">
                                캠페인 목록으로
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Paper>

            {!result && (
                <Paper withBorder p="md" radius="md" mt="md" bg="violet.0" style={{ borderColor: 'var(--mantine-color-violet-3)' }}>
                    <Group gap="sm" align="flex-start">
                        <IconFlask size={20} color="var(--mantine-color-violet-7)" />
                        <Stack gap={2}>
                            <Text size="sm" fw={700} c="violet.9">A/B 테스트 활용 팁</Text>
                            <Text size="xs" c="violet.8">
                                • <strong>후킹 문장 테스트</strong> — 첫 줄 표현 비교 (질문형 vs 단언형 vs 호기심)<br />
                                • <strong>CTA 테스트</strong> — "지금 구매" vs "더 알아보기" vs "DM 보내기"<br />
                                • <strong>해시태그 전략</strong> — 트렌디 vs 검색 친화 vs 미니멀<br />
                                • 발행 후 24-48시간 좋아요/댓글로 비교 (성과 자동 수집은 향후)
                            </Text>
                        </Stack>
                    </Group>
                </Paper>
            )}
        </Container>
    );
}
