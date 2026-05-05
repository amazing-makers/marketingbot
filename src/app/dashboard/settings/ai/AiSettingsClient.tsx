'use client';

import {
    Container, Title, Text, Stack, Paper, Group, Button, TextInput, NumberInput,
    Select, Switch, Badge, Anchor, Alert, Tabs, Divider, ActionIcon, Tooltip,
    PasswordInput, SimpleGrid, Loader,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconKey, IconBolt, IconLanguage, IconPhoto, IconCoin, IconChartBar,
    IconExternalLink, IconCheck, IconX, IconRefresh, IconInfoCircle,
    IconChartHistogram,
} from '@tabler/icons-react';
import { Table } from '@mantine/core';
import { useState, useTransition } from 'react';
import { saveMyAiConfig, testEngine, getUsageStats } from '@/app/actions/aiSettingsActions';
import { useEffect } from 'react';

// engine-config.ts 와 동일한 메타 (UI 전용 복제 — 서버 전용 import 불가)
const AVAILABLE_MODELS = {
    gemini: [
        { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (무료)', tier: 'free' },
        { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', tier: 'paid' },
        { id: 'gemini-2.5-pro',   label: 'Gemini 2.5 Pro (최고)', tier: 'paid' },
        { id: 'gemini-1.5-pro',   label: 'Gemini 1.5 Pro', tier: 'paid' },
    ],
    groq: [
        { id: 'llama-3.3-70b-versatile',  label: 'Llama 3.3 70B (무료)', tier: 'free' },
        { id: 'llama-3.1-405b-reasoning', label: 'Llama 3.1 405B 추론',  tier: 'free' },
        { id: 'mixtral-8x7b-32768',       label: 'Mixtral 8x7B',         tier: 'free' },
    ],
    openai: [
        { id: 'gpt-4o-mini', label: 'GPT-4o mini (저렴)',    tier: 'paid' },
        { id: 'gpt-4o',      label: 'GPT-4o (고품질)',        tier: 'paid' },
        { id: 'o1-mini',     label: 'o1-mini (추론)',         tier: 'paid' },
        { id: 'o1',          label: 'o1 (최고 추론)',          tier: 'paid' },
    ],
    claude: [
        { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (빠름)',  tier: 'paid' },
        { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6 (균형)', tier: 'paid' },
        { id: 'claude-opus-4-7',           label: 'Claude Opus 4.7 (최고)',    tier: 'paid' },
    ],
    ollama: [
        { id: 'llama3.2:3b',  label: 'Llama 3.2 3B (2GB RAM)',  tier: 'local' },
        { id: 'llama3.3:70b', label: 'Llama 3.3 70B (느림)',     tier: 'local' },
        { id: 'qwen2.5:14b',  label: 'Qwen 2.5 14B',             tier: 'local' },
        { id: 'mistral:7b',   label: 'Mistral 7B',               tier: 'local' },
        { id: 'llava:7b',     label: 'LLaVA 7B (vision)',         tier: 'local' },
    ],
} as const;

const ENGINE_GUIDES = {
    gemini:       { url: 'https://aistudio.google.com/app/apikey', note: '무료 1,500/일 + 이미지 분석 지원' },
    groq:         { url: 'https://console.groq.com/keys',          note: '무료 14,400/일, 매우 빠름' },
    deepl:        { url: 'https://www.deepl.com/pro-api',           note: '번역 50만자/월 무료. ":fx" 접미사 = Free' },
    openai:       { url: 'https://platform.openai.com/api-keys',   note: '유료. GPT-4o + DALL-E 3' },
    claude:       { url: 'https://console.anthropic.com',          note: '유료. 한국어 품질 최상' },
    ollama:       { url: 'https://ollama.com/download',             note: '로컬 PC 무료 무제한. ollama pull llama3.2:3b' },
    pollinations: { url: 'https://image.pollinations.ai',           note: '이미지 생성 무료, 키 불필요 (자동 사용)' },
} as const;

type EngineName = 'gemini' | 'groq' | 'openai' | 'claude' | 'ollama';
type TierBadgeProps = { tier: 'free' | 'paid' | 'local' };

function TierBadge({ tier }: TierBadgeProps) {
    const map = {
        free:  { color: 'green',  label: '무료' },
        paid:  { color: 'orange', label: '유료' },
        local: { color: 'blue',   label: '로컬' },
    } as const;
    const m = map[tier];
    return <Badge size="xs" color={m.color} variant="light">{m.label}</Badge>;
}

function EngineKeyRow({
    engine, label, hasKey, lastFour, dirtyKey, onKeyChange, onTest, testResult,
}: {
    engine: keyof typeof ENGINE_GUIDES;
    label: string;
    hasKey: boolean;
    lastFour: string;
    dirtyKey: string;
    onKeyChange: (v: string) => void;
    onTest?: () => void;
    testResult?: { ok: boolean; latencyMs?: number; error?: string };
}) {
    const guide = ENGINE_GUIDES[engine];
    return (
        <Stack gap={6}>
            <Group justify="space-between">
                <Group gap={6}>
                    <Text fw={600} size="sm">{label}</Text>
                    {hasKey && <Badge size="xs" color="green" variant="dot">등록됨 (…{lastFour})</Badge>}
                </Group>
                <Anchor href={guide.url} target="_blank" rel="noreferrer" size="xs">
                    발급 가이드 <IconExternalLink size={10} />
                </Anchor>
            </Group>
            <Text size="xs" c="dimmed">{guide.note}</Text>
            <Group gap="xs">
                <PasswordInput
                    flex={1}
                    placeholder={hasKey ? '변경 시에만 입력 (비워두면 기존 키 유지)' : 'API 키 입력'}
                    value={dirtyKey}
                    onChange={(e) => onKeyChange(e.currentTarget.value)}
                />
                {onTest && (
                    <Tooltip label="등록된 키로 짧은 핑 테스트">
                        <ActionIcon variant="default" onClick={onTest} disabled={!hasKey && !dirtyKey}>
                            <IconBolt size={16} />
                        </ActionIcon>
                    </Tooltip>
                )}
            </Group>
            {testResult && (
                <Group gap={6}>
                    {testResult.ok ? (
                        <>
                            <IconCheck size={14} color="var(--mantine-color-green-6)" />
                            <Text size="xs" c="green">OK ({testResult.latencyMs}ms)</Text>
                        </>
                    ) : (
                        <>
                            <IconX size={14} color="var(--mantine-color-red-6)" />
                            <Text size="xs" c="red">{testResult.error}</Text>
                        </>
                    )}
                </Group>
            )}
        </Stack>
    );
}

interface AiSettingsClientProps {
    initialConfig: any | null;
    loadError?: string;
}

export default function AiSettingsClient({ initialConfig, loadError }: AiSettingsClientProps) {
    const cfg = initialConfig || {
        aiPriority: ['gemini', 'groq', 'ollama', 'claude'],
        aiModels: {},
        aiKeys: {},
        translationPriority: ['deepl', 'libretranslate', 'ai'],
        deeplPro: false,
        utm: {},
        monthlyBudgetUsd: 0,
    };

    const [pending, startTransition] = useTransition();
    const [aiPriority, setAiPriority] = useState<EngineName[]>(cfg.aiPriority);
    const [aiModels, setAiModels] = useState<Record<string, string>>(cfg.aiModels || {});
    const [keysPatch, setKeysPatch] = useState<Record<string, string>>({}); // 입력 중인 새 키
    const [translationPriority, setTranslationPriority] = useState<string[]>(cfg.translationPriority);
    const [deeplPro, setDeeplPro] = useState<boolean>(!!cfg.deeplPro);
    const [utm, setUtm] = useState<{ [k: string]: string }>(cfg.utm || {});
    const [budget, setBudget] = useState<number>(cfg.monthlyBudgetUsd || 0);
    const [testResults, setTestResults] = useState<Record<string, { ok: boolean; latencyMs?: number; error?: string }>>({});
    const [usage, setUsage] = useState<any[] | null>(null);
    const [planLimits, setPlanLimits] = useState<any>(null);
    const [usageBusy, setUsageBusy] = useState(false);

    async function loadUsage() {
        setUsageBusy(true);
        const r = await getUsageStats();
        setUsage(r.success ? r.months || [] : []);
        setPlanLimits(r.success ? r.planLimits : null);
        setUsageBusy(false);
    }

    useEffect(() => {
        // 페이지 진입 시 한 번 사전 로드 (탭 열기 전이라도 빠르게 표시)
        loadUsage();
    }, []);

    function handleSave() {
        startTransition(async () => {
            const r = await saveMyAiConfig({
                aiPriority,
                aiModels,
                aiKeysPatch: Object.fromEntries(
                    Object.entries(keysPatch).map(([k, v]) => [k, v.trim() === '' ? undefined : v.trim()])
                ),
                translationPriority: translationPriority as any,
                deeplPro,
                utm,
                monthlyBudgetUsd: budget,
            });
            if (r.success) {
                notifications.show({ color: 'green', title: '저장됨', message: 'AI 엔진 설정이 적용됐어요.' });
                setKeysPatch({});  // 입력값 클리어 (등록 표시는 새로고침 후 반영)
            } else {
                notifications.show({ color: 'red', title: '저장 실패', message: r.error || '' });
            }
        });
    }

    async function handleTest(engine: EngineName) {
        setTestResults(prev => ({ ...prev, [engine]: { ok: false, error: '테스트 중...' } }));
        const r = await testEngine(engine);
        setTestResults(prev => ({
            ...prev,
            [engine]: { ok: r.success, latencyMs: r.latencyMs, error: r.error },
        }));
    }

    function setKey(engine: string, val: string) {
        setKeysPatch(prev => ({ ...prev, [engine]: val }));
    }

    return (
        <Container size="lg" py="xl">
            <Stack gap="lg">
                <div>
                    <Title order={2}>AI 엔진 설정</Title>
                    <Text c="dimmed" size="sm" mt={4}>
                        API 키를 등록하면 캡션·번역·이미지 생성에 자동으로 사용됩니다. 무료 엔진 우선·유료는 옵션, 예산 초과 시 자동 차단.
                    </Text>
                </div>

                {loadError && (
                    <Alert color="red" icon={<IconInfoCircle size={16} />}>
                        설정 로드 실패: {loadError} — 기본값으로 표시 중입니다.
                    </Alert>
                )}

                <Tabs defaultValue="keys">
                    <Tabs.List>
                        <Tabs.Tab value="keys" leftSection={<IconKey size={14} />}>API 키</Tabs.Tab>
                        <Tabs.Tab value="models" leftSection={<IconBolt size={14} />}>엔진/모델</Tabs.Tab>
                        <Tabs.Tab value="translation" leftSection={<IconLanguage size={14} />}>번역</Tabs.Tab>
                        <Tabs.Tab value="budget" leftSection={<IconCoin size={14} />}>예산·UTM</Tabs.Tab>
                        <Tabs.Tab value="usage" leftSection={<IconChartHistogram size={14} />}>사용량</Tabs.Tab>
                    </Tabs.List>

                    {/* ════════ API 키 탭 ════════ */}
                    <Tabs.Panel value="keys" pt="md">
                        <Stack gap="lg">
                            <Paper withBorder p="md" radius="md">
                                <Stack gap="md">
                                    <Group justify="space-between">
                                        <Text fw={700}>1순위 추천 — 무료로 시작</Text>
                                        <TierBadge tier="free" />
                                    </Group>
                                    <Text size="xs" c="dimmed">
                                        세 키만 등록해도 캡션 + 번역 + 이미지 생성 모두 무료로 동작합니다.
                                    </Text>

                                    <EngineKeyRow
                                        engine="gemini" label="Google Gemini"
                                        hasKey={!!cfg.aiKeys?.gemini?.hasKey}
                                        lastFour={cfg.aiKeys?.gemini?.lastFour || ''}
                                        dirtyKey={keysPatch.gemini || ''}
                                        onKeyChange={(v) => setKey('gemini', v)}
                                        onTest={() => handleTest('gemini')}
                                        testResult={testResults.gemini}
                                    />
                                    <Divider />
                                    <EngineKeyRow
                                        engine="groq" label="Groq (Llama)"
                                        hasKey={!!cfg.aiKeys?.groq?.hasKey}
                                        lastFour={cfg.aiKeys?.groq?.lastFour || ''}
                                        dirtyKey={keysPatch.groq || ''}
                                        onKeyChange={(v) => setKey('groq', v)}
                                        onTest={() => handleTest('groq')}
                                        testResult={testResults.groq}
                                    />
                                    <Divider />
                                    <EngineKeyRow
                                        engine="deepl" label="DeepL 번역"
                                        hasKey={!!cfg.aiKeys?.deepl?.hasKey}
                                        lastFour={cfg.aiKeys?.deepl?.lastFour || ''}
                                        dirtyKey={keysPatch.deepl || ''}
                                        onKeyChange={(v) => setKey('deepl', v)}
                                    />
                                </Stack>
                            </Paper>

                            <Paper withBorder p="md" radius="md">
                                <Stack gap="md">
                                    <Group justify="space-between">
                                        <Text fw={700}>2순위 — 품질 업그레이드</Text>
                                        <TierBadge tier="paid" />
                                    </Group>
                                    <Text size="xs" c="dimmed">
                                        OpenAI / Anthropic 키를 등록하면 GPT-4o · Claude · DALL-E 3 가 자동으로 폴백 체인에 합류합니다.
                                    </Text>

                                    <EngineKeyRow
                                        engine="openai" label="OpenAI (GPT + DALL-E)"
                                        hasKey={!!cfg.aiKeys?.openai?.hasKey}
                                        lastFour={cfg.aiKeys?.openai?.lastFour || ''}
                                        dirtyKey={keysPatch.openai || ''}
                                        onKeyChange={(v) => setKey('openai', v)}
                                        onTest={() => handleTest('openai')}
                                        testResult={testResults.openai}
                                    />
                                    <Divider />
                                    <EngineKeyRow
                                        engine="claude" label="Anthropic Claude"
                                        hasKey={!!cfg.aiKeys?.claude?.hasKey}
                                        lastFour={cfg.aiKeys?.claude?.lastFour || ''}
                                        dirtyKey={keysPatch.claude || ''}
                                        onKeyChange={(v) => setKey('claude', v)}
                                        onTest={() => handleTest('claude')}
                                        testResult={testResults.claude}
                                    />
                                </Stack>
                            </Paper>

                            <Paper withBorder p="md" radius="md">
                                <Stack gap="xs">
                                    <Group justify="space-between">
                                        <Text fw={700}>로컬 무료 무제한 — Ollama</Text>
                                        <TierBadge tier="local" />
                                    </Group>
                                    <Text size="xs" c="dimmed">
                                        본인 PC 에 Ollama 설치 시 키 불필요. <Anchor href={ENGINE_GUIDES.ollama.url} target="_blank">설치 안내</Anchor> 후{' '}
                                        <code>ollama pull llama3.2:3b</code> 한 번이면 무제한 폴백.
                                    </Text>
                                </Stack>
                            </Paper>

                            <Paper withBorder p="md" radius="md" bg="green.0">
                                <Stack gap="xs">
                                    <Text fw={700}>이미지 생성 — Pollinations.ai</Text>
                                    <Text size="xs" c="dimmed">
                                        키 불필요·완전 무료. 첫 시도로 자동 사용됨. DALL-E / Imagen 키 등록 시 폴백 체인에 합류.
                                    </Text>
                                </Stack>
                            </Paper>
                        </Stack>
                    </Tabs.Panel>

                    {/* ════════ 엔진/모델 탭 ════════ */}
                    <Tabs.Panel value="models" pt="md">
                        <Stack gap="lg">
                            <Paper withBorder p="md" radius="md">
                                <Stack gap="md">
                                    <Text fw={700}>엔진별 사용 모델</Text>
                                    <Text size="xs" c="dimmed">
                                        각 엔진에서 어떤 모델을 사용할지 선택. 기본은 무료 / 빠른 모델로 설정됨.
                                    </Text>
                                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                                        {(['gemini', 'groq', 'openai', 'claude', 'ollama'] as const).map((eng) => (
                                            <Select
                                                key={eng}
                                                label={eng.toUpperCase()}
                                                data={AVAILABLE_MODELS[eng].map(m => ({
                                                    value: m.id,
                                                    label: `${m.label}`,
                                                }))}
                                                value={aiModels[eng] || ''}
                                                onChange={(v) => v && setAiModels(prev => ({ ...prev, [eng]: v }))}
                                                placeholder="모델 선택"
                                                comboboxProps={{ withinPortal: true }}
                                            />
                                        ))}
                                    </SimpleGrid>
                                </Stack>
                            </Paper>

                            <Paper withBorder p="md" radius="md">
                                <Stack gap="md">
                                    <Group justify="space-between">
                                        <Text fw={700}>전역 폴백 우선순위</Text>
                                        <Tooltip label="순서대로 시도. 키 미등록·실패 시 다음 엔진 자동 시도.">
                                            <ActionIcon variant="subtle"><IconInfoCircle size={14} /></ActionIcon>
                                        </Tooltip>
                                    </Group>
                                    <Text size="xs" c="dimmed">
                                        현재 순서: {aiPriority.join(' → ')}
                                    </Text>
                                    <Group gap="xs">
                                        {aiPriority.map((eng, idx) => (
                                            <Group key={eng} gap={4} wrap="nowrap">
                                                <Badge variant="filled" size="md">{idx + 1}. {eng}</Badge>
                                                <ActionIcon
                                                    size="xs"
                                                    variant="subtle"
                                                    disabled={idx === 0}
                                                    onClick={() => {
                                                        const next = [...aiPriority];
                                                        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                                        setAiPriority(next);
                                                    }}
                                                >↑</ActionIcon>
                                                <ActionIcon
                                                    size="xs"
                                                    variant="subtle"
                                                    disabled={idx === aiPriority.length - 1}
                                                    onClick={() => {
                                                        const next = [...aiPriority];
                                                        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                                                        setAiPriority(next);
                                                    }}
                                                >↓</ActionIcon>
                                            </Group>
                                        ))}
                                    </Group>
                                </Stack>
                            </Paper>
                        </Stack>
                    </Tabs.Panel>

                    {/* ════════ 번역 탭 ════════ */}
                    <Tabs.Panel value="translation" pt="md">
                        <Paper withBorder p="md" radius="md">
                            <Stack gap="md">
                                <Text fw={700}>번역 엔진 우선순위</Text>
                                <Text size="xs" c="dimmed">
                                    DeepL (50만자/월 무료) → LibreTranslate (셀프호스트, 옵션) → AI 번역 (Groq/Ollama/Claude). 미지원 언어는 자동으로 다음 엔진.
                                </Text>
                                <Group gap="xs">
                                    {translationPriority.map((eng, idx) => (
                                        <Group key={eng} gap={4} wrap="nowrap">
                                            <Badge variant="filled" size="md">{idx + 1}. {eng}</Badge>
                                            <ActionIcon
                                                size="xs"
                                                variant="subtle"
                                                disabled={idx === 0}
                                                onClick={() => {
                                                    const next = [...translationPriority];
                                                    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                                    setTranslationPriority(next);
                                                }}
                                            >↑</ActionIcon>
                                            <ActionIcon
                                                size="xs"
                                                variant="subtle"
                                                disabled={idx === translationPriority.length - 1}
                                                onClick={() => {
                                                    const next = [...translationPriority];
                                                    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                                                    setTranslationPriority(next);
                                                }}
                                            >↓</ActionIcon>
                                        </Group>
                                    ))}
                                </Group>
                                <Switch
                                    label="DeepL Pro 사용 (자동 감지: 키 끝이 ':fx' 면 Free)"
                                    checked={deeplPro}
                                    onChange={(e) => setDeeplPro(e.currentTarget.checked)}
                                />
                            </Stack>
                        </Paper>
                    </Tabs.Panel>

                    {/* ════════ 예산·UTM 탭 ════════ */}
                    <Tabs.Panel value="budget" pt="md">
                        <Stack gap="lg">
                            <Paper withBorder p="md" radius="md">
                                <Stack gap="md">
                                    <Group justify="space-between">
                                        <Text fw={700}>월간 예산 한도 ($)</Text>
                                        <IconCoin size={16} />
                                    </Group>
                                    <Text size="xs" c="dimmed">
                                        0 = 한도 없음. 0 초과 설정 시 추정 비용이 한도 도달하면 OpenAI / Claude / DALL-E 자동 skip → 무료 엔진 폴백.
                                    </Text>
                                    <NumberInput
                                        value={budget}
                                        onChange={(v) => setBudget(typeof v === 'number' ? v : 0)}
                                        min={0}
                                        step={5}
                                        prefix="$"
                                        decimalScale={2}
                                    />
                                </Stack>
                            </Paper>

                            <Paper withBorder p="md" radius="md">
                                <Stack gap="md">
                                    <Group justify="space-between">
                                        <Text fw={700}>UTM 자동 추가</Text>
                                        <IconChartBar size={16} />
                                    </Group>
                                    <Text size="xs" c="dimmed">
                                        발행 시 본문 내 URL 에 자동 append (예: ?utm_source=instagram&utm_medium=social…). 비워두면 추가 안 함.
                                    </Text>
                                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                                        {[
                                            ['source', 'utm_source (예: marketingbot)'],
                                            ['medium', 'utm_medium (예: social)'],
                                            ['campaign', 'utm_campaign (예: spring_sale)'],
                                            ['term', 'utm_term'],
                                            ['content', 'utm_content'],
                                        ].map(([key, label]) => (
                                            <TextInput
                                                key={key}
                                                label={label}
                                                value={utm[key] || ''}
                                                onChange={(e) => setUtm(prev => ({ ...prev, [key]: e.currentTarget.value }))}
                                            />
                                        ))}
                                    </SimpleGrid>
                                </Stack>
                            </Paper>
                        </Stack>
                    </Tabs.Panel>
                    {/* ════════ 사용량 탭 ════════ */}
                    <Tabs.Panel value="usage" pt="md">
                        <Stack gap="lg">
                            <Group justify="space-between">
                                <div>
                                    <Text fw={700}>월별 AI 호출 사용량</Text>
                                    <Text size="xs" c="dimmed">
                                        최근 6개월 — kind/engine 별 호출 수 + 추정 비용 (DALL-E $0.04/장, Imagen $0.02/장).
                                        무료 엔진 (Pollinations / Gemini Flash 무료tier / Groq / Ollama) 은 비용 0.
                                    </Text>
                                </div>
                                <Button
                                    variant="subtle"
                                    leftSection={<IconRefresh size={14} />}
                                    onClick={loadUsage}
                                    loading={usageBusy}
                                >
                                    새로고침
                                </Button>
                            </Group>

                            {/* Phase 34 — 플랜 한도 vs 이번 달 사용량 */}
                            {planLimits && (
                                <Paper withBorder p="md" radius="md" style={{ background: 'var(--mantine-color-violet-0)' }}>
                                    <Group justify="space-between" mb="md">
                                        <Group gap={6}>
                                            <Text fw={700} size="sm">📊 이번 달 한도 사용률</Text>
                                            <Badge color="violet" variant="light" size="sm">{planLimits.label}</Badge>
                                        </Group>
                                        <Anchor href="/dashboard/settings/billing" size="xs" c="violet" fw={600}>
                                            플랜 업그레이드 →
                                        </Anchor>
                                    </Group>
                                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                                        <div>
                                            <Group justify="space-between" mb={4}>
                                                <Text size="xs" fw={600}>📝 캡션 생성</Text>
                                                <Text size="xs" c={planLimits.captionPctUsed >= 90 ? 'red' : 'dimmed'}>
                                                    {planLimits.thisMonthCaption} / {planLimits.captionMonthEstimate} (월간 추정)
                                                </Text>
                                            </Group>
                                            <Group gap={4} mb={2}>
                                                <Text size="11px" c="dimmed">일일 한도: {planLimits.captionDaily}건</Text>
                                            </Group>
                                            <div style={{
                                                height: 6,
                                                background: 'var(--mantine-color-default-border)',
                                                borderRadius: 3,
                                                overflow: 'hidden',
                                            }}>
                                                <div style={{
                                                    width: `${planLimits.captionPctUsed}%`,
                                                    height: '100%',
                                                    background: planLimits.captionPctUsed >= 90 ? 'var(--mantine-color-red-6)'
                                                        : planLimits.captionPctUsed >= 70 ? 'var(--mantine-color-orange-6)'
                                                            : 'var(--mantine-color-teal-6)',
                                                }} />
                                            </div>
                                        </div>
                                        <div>
                                            <Group justify="space-between" mb={4}>
                                                <Text size="xs" fw={600}>🎨 이미지 생성</Text>
                                                <Text size="xs" c={planLimits.imagePctUsed >= 90 ? 'red' : 'dimmed'}>
                                                    {planLimits.thisMonthImage} / {planLimits.imageMonthEstimate} (월간 추정)
                                                </Text>
                                            </Group>
                                            <Group gap={4} mb={2}>
                                                <Text size="11px" c="dimmed">일일 한도: {planLimits.imageDaily}건</Text>
                                            </Group>
                                            <div style={{
                                                height: 6,
                                                background: 'var(--mantine-color-default-border)',
                                                borderRadius: 3,
                                                overflow: 'hidden',
                                            }}>
                                                <div style={{
                                                    width: `${planLimits.imagePctUsed}%`,
                                                    height: '100%',
                                                    background: planLimits.imagePctUsed >= 90 ? 'var(--mantine-color-red-6)'
                                                        : planLimits.imagePctUsed >= 70 ? 'var(--mantine-color-orange-6)'
                                                            : 'var(--mantine-color-teal-6)',
                                                }} />
                                            </div>
                                        </div>
                                    </SimpleGrid>
                                </Paper>
                            )}

                            {!usage && <Loader />}
                            {usage && usage.every((m) => m.totalCalls === 0) && (
                                <Alert color="gray" icon={<IconInfoCircle size={16} />}>
                                    아직 사용 기록이 없어요. 캠페인 생성 시 AI 캡션·이미지를 사용하면 여기 카운터가 누적됩니다.
                                </Alert>
                            )}
                            {usage && usage.some((m) => m.totalCalls > 0) && (
                                <Stack gap="md">
                                    {usage.map((m: any) => (
                                        <Paper key={m.monthKey} withBorder p="md" radius="md">
                                            <Group justify="space-between" mb="xs">
                                                <Text fw={700}>{m.monthKey}</Text>
                                                <Group gap="md">
                                                    <Badge variant="light">호출 {m.totalCalls.toLocaleString()}회</Badge>
                                                    <Badge variant="light" color={m.totalCostUsd > 0 ? 'orange' : 'green'}>
                                                        예상 비용 ${m.totalCostUsd.toFixed(2)}
                                                    </Badge>
                                                </Group>
                                            </Group>
                                            {m.rows.length === 0 ? (
                                                <Text size="xs" c="dimmed">호출 없음</Text>
                                            ) : (
                                                <Table verticalSpacing={4} fz="sm">
                                                    <Table.Thead>
                                                        <Table.Tr>
                                                            <Table.Th>종류</Table.Th>
                                                            <Table.Th>엔진</Table.Th>
                                                            <Table.Th ta="right">호출수</Table.Th>
                                                            <Table.Th ta="right">예상 비용</Table.Th>
                                                        </Table.Tr>
                                                    </Table.Thead>
                                                    <Table.Tbody>
                                                        {m.rows.map((r: any, idx: number) => (
                                                            <Table.Tr key={`${m.monthKey}-${idx}`}>
                                                                <Table.Td>
                                                                    <Badge size="sm" variant="dot" color={
                                                                        r.kind === 'image_gen' ? 'teal' :
                                                                        r.kind === 'translate' ? 'cyan' :
                                                                        r.kind === 'caption' ? 'violet' : 'gray'
                                                                    }>
                                                                        {r.kind}
                                                                    </Badge>
                                                                </Table.Td>
                                                                <Table.Td><Text size="sm">{r.engine}</Text></Table.Td>
                                                                <Table.Td ta="right">{r.count.toLocaleString()}</Table.Td>
                                                                <Table.Td ta="right">
                                                                    {r.estimatedCostUsd > 0
                                                                        ? <Text size="sm" c="orange">${r.estimatedCostUsd.toFixed(2)}</Text>
                                                                        : <Text size="sm" c="dimmed">$0 (무료)</Text>}
                                                                </Table.Td>
                                                            </Table.Tr>
                                                        ))}
                                                    </Table.Tbody>
                                                </Table>
                                            )}
                                        </Paper>
                                    ))}
                                </Stack>
                            )}
                        </Stack>
                    </Tabs.Panel>
                </Tabs>

                <Group justify="flex-end" mt="md">
                    <Button
                        variant="subtle"
                        leftSection={<IconRefresh size={14} />}
                        onClick={() => window.location.reload()}
                    >
                        다시 로드
                    </Button>
                    <Button onClick={handleSave} loading={pending}>
                        저장
                    </Button>
                </Group>
            </Stack>
        </Container>
    );
}
