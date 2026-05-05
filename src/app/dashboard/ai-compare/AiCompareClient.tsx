'use client';

import {
    Paper, Stack, Group, Textarea, Button, Text, Badge, Box, Checkbox,
    SimpleGrid, CopyButton, ActionIcon, Tooltip, Alert,
} from '@mantine/core';
import {
    IconSparkles, IconCopy, IconCheck, IconCircleCheck, IconCircleX,
    IconArrowRight, IconClock,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import { compareAiCaptions, type CompareEngine, type CompareResult } from '@/app/actions/aiCompareActions';

const ENGINES: Array<{ value: CompareEngine; label: string; color: string; emoji: string }> = [
    { value: 'gemini', label: 'Gemini Flash', color: 'blue', emoji: '✨' },
    { value: 'groq', label: 'Llama 3.3 (Groq)', color: 'orange', emoji: '⚡' },
    { value: 'claude', label: 'Claude Haiku', color: 'violet', emoji: '🎯' },
    { value: 'ollama', label: 'Ollama (로컬)', color: 'gray', emoji: '🖥️' },
];

export default function AiCompareClient() {
    const router = useRouter();
    const [prompt, setPrompt] = useState('');
    const [selectedEngines, setSelectedEngines] = useState<CompareEngine[]>(['gemini', 'groq', 'claude']);
    const [results, setResults] = useState<CompareResult[]>([]);
    const [running, setRunning] = useState(false);

    const toggleEngine = (e: CompareEngine) => {
        setSelectedEngines(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);
    };

    const handleRun = async () => {
        if (!prompt.trim()) {
            notifications.show({ title: '오류', message: '프롬프트를 입력하세요', color: 'red' });
            return;
        }
        if (selectedEngines.length === 0) {
            notifications.show({ title: '오류', message: '엔진을 1개 이상 선택하세요', color: 'red' });
            return;
        }
        setRunning(true);
        setResults([]);
        try {
            const r = await compareAiCaptions({ prompt, engines: selectedEngines });
            setResults(r);
            const okCount = r.filter(x => x.success).length;
            notifications.show({
                title: `${okCount}/${r.length} 엔진 응답 완료`,
                message: r.map(x => `${x.engine}: ${x.success ? `✓ ${x.latencyMs}ms` : `✗ 오류`}`).join(' · '),
                color: okCount > 0 ? 'teal' : 'red',
                autoClose: 4000,
            });
        } catch (e: any) {
            notifications.show({ title: '오류', message: e?.message || '실패', color: 'red' });
        } finally {
            setRunning(false);
        }
    };

    const handleUseAsCampaign = (text: string) => {
        // 새 캠페인 페이지로 이동 + 본문 미리 채움 (sessionStorage)
        try {
            sessionStorage.setItem('amakers_prefill_content', text);
        } catch { /* ignore */ }
        router.push('/dashboard/campaigns/new?from=ai-compare');
    };

    const fastestEngine = results.filter(r => r.success).reduce<CompareResult | null>(
        (best, cur) => !best || cur.latencyMs < best.latencyMs ? cur : best,
        null,
    );

    return (
        <>
            <Paper withBorder p="md" radius="md">
                <Stack gap="md">
                    <Textarea
                        label="프롬프트"
                        description="원하는 콘텐츠를 자연어로 설명해주세요. 예: '신메뉴 출시 — 30대 여성 대상, 부드럽고 따뜻한 톤'"
                        value={prompt}
                        onChange={(e) => setPrompt(e.currentTarget.value)}
                        placeholder="예: 카페 신메뉴 '바닐라 라떼 출시' 인스타그램 게시물 — 친근하고 트렌디한 톤"
                        autosize
                        minRows={3}
                    />

                    <div>
                        <Text size="xs" fw={600} mb={4}>엔진 선택 (병렬 호출)</Text>
                        <Group gap="xs">
                            {ENGINES.map(e => (
                                <Checkbox
                                    key={e.value}
                                    label={`${e.emoji} ${e.label}`}
                                    checked={selectedEngines.includes(e.value)}
                                    onChange={() => toggleEngine(e.value)}
                                    color={e.color}
                                />
                            ))}
                        </Group>
                    </div>

                    <Group justify="space-between">
                        <Text size="xs" c="dimmed">
                            💡 사용자 본인 API 키 (또는 env 폴백) 사용. 실패한 엔진은 키 미설정 가능.
                        </Text>
                        <Button
                            leftSection={<IconSparkles size={16} />}
                            onClick={handleRun}
                            loading={running}
                            disabled={!prompt.trim() || selectedEngines.length === 0}
                        >
                            {selectedEngines.length}개 엔진 동시 호출
                        </Button>
                    </Group>
                </Stack>
            </Paper>

            {results.length > 0 && (
                <SimpleGrid cols={{ base: 1, lg: results.length >= 3 ? 3 : 2 }} spacing="md">
                    {results.map((r) => {
                        const meta = ENGINES.find(e => e.value === r.engine);
                        const isFastest = fastestEngine?.engine === r.engine;
                        return (
                            <Paper
                                key={r.engine}
                                withBorder
                                p="md"
                                radius="md"
                                style={isFastest ? {
                                    borderColor: 'var(--mantine-color-teal-4)',
                                    borderWidth: 2,
                                } : undefined}
                            >
                                <Stack gap="xs">
                                    <Group justify="space-between" wrap="nowrap">
                                        <Group gap={6}>
                                            {r.success
                                                ? <IconCircleCheck size={16} color="var(--mantine-color-teal-6)" />
                                                : <IconCircleX size={16} color="var(--mantine-color-red-6)" />}
                                            <Text fw={700}>{meta?.emoji} {meta?.label || r.engine}</Text>
                                            {isFastest && <Badge size="xs" color="teal" variant="filled">⚡ 가장 빠름</Badge>}
                                        </Group>
                                        <Group gap={4}>
                                            <IconClock size={11} color="var(--mantine-color-dimmed)" />
                                            <Text size="11px" c="dimmed">{r.latencyMs}ms</Text>
                                        </Group>
                                    </Group>

                                    {r.success ? (
                                        <>
                                            <Box style={{
                                                padding: 12,
                                                background: 'var(--mantine-color-default-hover)',
                                                borderRadius: 6,
                                                fontSize: 13,
                                                lineHeight: 1.6,
                                                whiteSpace: 'pre-wrap',
                                                minHeight: 100,
                                                maxHeight: 300,
                                                overflowY: 'auto',
                                            }}>
                                                {r.text}
                                            </Box>
                                            <Group gap="xs">
                                                <CopyButton value={r.text || ''}>
                                                    {({ copied, copy }) => (
                                                        <Tooltip label={copied ? '복사됨' : '복사'} withArrow>
                                                            <ActionIcon variant="light" color={copied ? 'teal' : 'gray'} onClick={copy}>
                                                                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    )}
                                                </CopyButton>
                                                <Button
                                                    size="compact-xs"
                                                    variant="light"
                                                    color={meta?.color || 'violet'}
                                                    rightSection={<IconArrowRight size={12} />}
                                                    onClick={() => handleUseAsCampaign(r.text!)}
                                                    style={{ flex: 1 }}
                                                >
                                                    이 결과로 캠페인 작성
                                                </Button>
                                            </Group>
                                        </>
                                    ) : (
                                        <Alert color="red" variant="light" p="xs">
                                            <Text size="xs">{r.error}</Text>
                                            <Text size="11px" c="dimmed" mt={4}>
                                                AI 설정에서 {meta?.label} API 키를 등록해주세요.
                                            </Text>
                                        </Alert>
                                    )}
                                </Stack>
                            </Paper>
                        );
                    })}
                </SimpleGrid>
            )}
        </>
    );
}
