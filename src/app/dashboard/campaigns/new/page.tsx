"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import {
  TextInput, Textarea, Button, Paper, Title, Container,
  Stack, MultiSelect, Group, Text, Badge, ActionIcon, Tooltip, Box, Divider, SimpleGrid,
  Modal, Card, Loader, Anchor, Grid, ThemeIcon, Accordion, Select
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  IconBulb, IconX, IconSparkles, IconPhoto, IconCopy, IconCheck,
  IconWorld, IconPencil, IconCalendar, IconCloudUpload, IconWand
} from '@tabler/icons-react';
import { listChannels } from '@/app/actions/channelActions';
import { createCampaign, createSplitCampaign, loadCampaignDraft, saveCampaignDraft, clearCampaignDraft, suggestPrimeTimeForChannels } from '@/app/actions/campaignActions';
import { generateCampaignCaption, generateCampaignImage } from '@/app/actions/aiContentActions';
import { MarketingChannel } from '@prisma/client';
import { getTemplateById, applyTemplateVariables } from '@/lib/campaign-templates';
import dayjs from 'dayjs';
import MediaUploader, { type MediaItem } from './MediaUploader';
import ChannelPreview from './ChannelPreview';

// 섹션 헤더 헬퍼 (시각 구분)
function SectionHeader({ step, icon: Icon, title, desc }: { step: number; icon: any; title: string; desc?: string }) {
  return (
    <Group gap="sm" mb="xs">
      <ThemeIcon size={32} radius="md" variant="light" color="blue">
        <Icon size={18} stroke={1.7} />
      </ThemeIcon>
      <Stack gap={0}>
        <Group gap={4}>
          <Text size="10px" fw={700} c="blue.6">STEP {step}</Text>
        </Group>
        <Text fw={700} size="md">{title}</Text>
        {desc && <Text size="11px" c="dimmed">{desc}</Text>}
      </Stack>
    </Group>
  );
}

function NewCampaignPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('template');
  const template = useMemo(() => (templateId ? getTemplateById(templateId) : null), [templateId]);

  // 캘린더에서 "+" 클릭 시 ?date=YYYY-MM-DD 로 진입 — 그 날짜 9시 prefill
  const dateParam = searchParams.get('date');
  const initialScheduledAt = useMemo(() => {
    if (dateParam) {
      const d = new Date(`${dateParam}T09:00:00`);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date(Date.now() + 10 * 60 * 1000);
  }, [dateParam]);

  const [channels, setChannels] = useState<MarketingChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  // AI 캡션 모달 state
  const [captionModal, captionModalCtl] = useDisclosure(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [captions, setCaptions] = useState<Record<string, {
    text: string; hashtags: string[]; format: string; channelType: string; accountName: string;
  }> | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // AI 이미지 state
  const [imageModal, imageModalCtl] = useDisclosure(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageAspect, setImageAspect] = useState<'square' | 'vertical' | 'horizontal'>('square');
  const [imageBatchCount, setImageBatchCount] = useState<1 | 3 | 5 | 10>(1);
  const [imgBusy, setImgBusy] = useState(false);
  const [imgBatchProgress, setImgBatchProgress] = useState<{ done: number; total: number } | null>(null);

  // 첨부 미디어 — Dropzone + AI 이미지 모두 동일 배열에 들어옴
  const [media, setMedia] = useState<MediaItem[]>([]);

  // 드래프트 자동 저장 state
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [draftLastSaved, setDraftLastSaved] = useState<Date | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  useEffect(() => {
    listChannels().then(setChannels);
  }, []);

  useEffect(() => {
    if (template) {
      const init: Record<string, string> = {};
      for (const v of template.variables) init[v.name] = '';
      setVariableValues(init);
    }
  }, [template]);

  const form = useForm({
    initialValues: {
      name: '',
      description: '',
      channelIds: [] as string[],
      content: '',
      sourceLanguage: 'ko',
      autoTranslate: true,
      scheduledAt: initialScheduledAt,
      // 분할 발행 모드 (Phase 6)
      splitMode: false,
      splitCount: 3,
      // 콘텐츠 브리프 (Phase 8-1) — AI 캡션 생성 품질 강화
      briefPurpose: '' as '' | 'review' | 'info' | 'promo' | 'story' | 'comparison' | 'insight',
      briefTone: '' as '' | 'casual' | 'professional' | 'humorous' | 'trendy' | 'warm' | 'serious',
      briefLength: '' as '' | 'short' | 'medium' | 'long' | 'extra_long',
      briefAudience: '' as '' | 'mz_2030' | 'mid_3040' | 'senior_5060' | 'b2b' | 'general',
      briefIndustry: '',
      briefCta: '' as '' | 'purchase' | 'visit' | 'follow' | 'share' | 'inquire' | 'aware',
      briefKeywords: '',
      briefBrandName: '',
      briefBrandUrl: '',
    },
    validate: {
      name: (value) => (value.length < 2 ? '캠페인 이름을 입력하세요.' : null),
      channelIds: (value) => (value.length === 0 ? '발행할 채널을 하나 이상 선택하세요.' : null),
      content: (value) => (value.length === 0 ? '발행할 콘텐츠 내용을 입력하세요.' : null),
    },
  });

  // 선택된 채널 정보 (region/language 표시용 — form 이후 선언)
  const selectedChannels = useMemo(
    () => channels.filter(c => form.values.channelIds.includes(c.id)),
    [channels, form.values.channelIds],
  );
  const targetLanguages = useMemo(
    () => Array.from(new Set(selectedChannels.map(c => (c as any).language || 'ko'))),
    [selectedChannels],
  );

  // 템플릿 적용 (template + channels 로딩 후 1회)
  useEffect(() => {
    if (template && channels.length > 0) {
      form.setValues({
        name: template.title,
        description: template.description,
        channelIds: channels.filter(c => template.suggestedChannels.includes(c.type)).map(c => c.id),
        content: template.contentTemplate,
        scheduledAt: form.values.scheduledAt,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, channels.length]);

  // 변수 값 변경 시 본문 자동 갱신
  useEffect(() => {
    if (template) {
      const filled = applyTemplateVariables(template.contentTemplate, variableValues);
      form.setFieldValue('content', filled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variableValues, template]);

  // ════ 드래프트 자동 복원 (페이지 진입 시 1회) ════
  useEffect(() => {
    // 템플릿 모드는 복원 skip (템플릿이 우선)
    if (template) { setDraftLoaded(true); return; }
    let cancelled = false;
    loadCampaignDraft().then((r) => {
      if (cancelled) return;
      if (r.exists && r.payload) {
        const p = r.payload;
        form.setValues({
          name: p.name || '',
          description: p.description || '',
          channelIds: p.channelIds || [],
          content: p.content || '',
          sourceLanguage: p.sourceLanguage || 'ko',
          autoTranslate: p.autoTranslate !== false,
          scheduledAt: p.scheduledAt ? new Date(p.scheduledAt) : new Date(Date.now() + 10 * 60 * 1000),
        });
        notifications.show({
          color: 'blue',
          title: '드래프트 복원',
          message: `${dayjs(r.updatedAt).format('MM-DD HH:mm')} 작업 이어서 진행`,
        });
      }
      setDraftLoaded(true);
    }).catch(() => setDraftLoaded(true));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template]);

  // ════ 30초 idle 자동 저장 ════
  useEffect(() => {
    if (!draftLoaded) return;
    if (template) return;  // 템플릿 모드는 자동 저장 안 함

    // 빈 상태 (모든 필드 비어있음) 도 저장 안 함
    const isEmpty = !form.values.name && !form.values.content && form.values.channelIds.length === 0;
    if (isEmpty) return;

    const timer = setTimeout(async () => {
      setDraftStatus('saving');
      const r = await saveCampaignDraft(form.values);
      if (r.success) {
        setDraftStatus('saved');
        setDraftLastSaved(r.updatedAt ? new Date(r.updatedAt) : new Date());
        setTimeout(() => setDraftStatus('idle'), 2000);
      } else {
        setDraftStatus('idle');
      }
    }, 30000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.values, draftLoaded, template]);

  const handleVariableChange = (name: string, value: string) => {
    setVariableValues(prev => ({ ...prev, [name]: value }));
  };

  // ════ AI 캡션 생성 ════
  const handleGenerateCaption = async () => {
    if (form.values.channelIds.length === 0) {
      notifications.show({ color: 'orange', title: '채널 선택 필요', message: '먼저 발행할 채널을 선택하세요.' });
      return;
    }
    const userHint = (form.values.description || form.values.content || form.values.name).trim();
    if (!userHint) {
      notifications.show({ color: 'orange', title: '주제 필요', message: '캠페인 이름·설명·본문 중 하나에 주제를 입력하세요.' });
      return;
    }
    setAiBusy(true);
    setCaptions(null);
    captionModalCtl.open();
    try {
      // brief 빌드 — 빈 값은 undefined 로 전달
      const v = form.values;
      const brief = {
        ...(v.briefPurpose ? { purpose: v.briefPurpose as any } : {}),
        ...(v.briefTone ? { tone: v.briefTone as any } : {}),
        ...(v.briefLength ? { length: v.briefLength as any } : {}),
        ...(v.briefAudience ? { audience: v.briefAudience as any } : {}),
        ...(v.briefIndustry?.trim() ? { industry: v.briefIndustry.trim() } : {}),
        ...(v.briefCta ? { cta: v.briefCta as any } : {}),
        ...(v.briefBrandName?.trim() ? { brandName: v.briefBrandName.trim() } : {}),
        ...(v.briefBrandUrl?.trim() ? { brandUrl: v.briefBrandUrl.trim() } : {}),
        ...(v.briefKeywords?.trim() ? { seedKeywords: v.briefKeywords.split(/[,\s]+/).filter(Boolean) } : {}),
      };
      // 첫 번째 첨부 이미지 dataUrl (vision 분석용)
      const firstImage = media.find(m => m.type === 'image');
      const r = await generateCampaignCaption({
        userHint,
        channelIds: form.values.channelIds,
        brief: Object.keys(brief).length > 0 ? brief : undefined,
        imageDataUrl: firstImage?.dataUrl,
      });
      if (r.success && r.captions) {
        setCaptions(r.captions);
        notifications.show({ color: 'green', title: '생성 완료', message: '채널별 캡션이 준비됐어요. 원하는 걸 선택하세요.' });
      } else {
        notifications.show({ color: 'red', title: '생성 실패', message: r.error || 'AI 응답 없음' });
        captionModalCtl.close();
      }
    } finally {
      setAiBusy(false);
    }
  };

  const formatCaption = (text: string, hashtags: string[]) => {
    const tagLine = hashtags?.length ? '\n\n' + hashtags.map(t => `#${t}`).join(' ') : '';
    return text + tagLine;
  };

  const applyCaption = (channelId: string) => {
    if (!captions?.[channelId]) return;
    const cap = captions[channelId];
    form.setFieldValue('content', formatCaption(cap.text, cap.hashtags));
    notifications.show({ color: 'green', title: '본문 적용', message: `${cap.accountName} 캡션을 본문에 채웠어요.` });
    captionModalCtl.close();
  };

  const copyCaption = async (channelId: string) => {
    if (!captions?.[channelId]) return;
    const cap = captions[channelId];
    await navigator.clipboard.writeText(formatCaption(cap.text, cap.hashtags));
    setCopiedKey(channelId);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // ════ AI 이미지 생성 (1장 또는 N장 일괄) → media 배열 자동 추가 ════
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      notifications.show({ color: 'orange', title: '프롬프트 필요', message: '이미지 설명을 입력하세요.' });
      return;
    }
    setImgBusy(true);
    setImgBatchProgress({ done: 0, total: imageBatchCount });
    let succeeded = 0;
    let lastEngine: string | undefined;
    let lastStorage: 'r2' | 'inline' = 'inline';

    try {
      // 직렬 호출 (병렬 시 무료 엔진 rate limit 위험)
      for (let i = 0; i < imageBatchCount; i++) {
        try {
          // 같은 프롬프트면 비슷한 결과 → 변형 시드 추가
          const variantPrompt = imageBatchCount > 1
            ? `${imagePrompt} (variant ${i + 1}/${imageBatchCount})`
            : imagePrompt;
          const r = await generateCampaignImage({ prompt: variantPrompt, aspect: imageAspect });
          if (r.success && r.dataUrl) {
            const newItem: MediaItem = {
              id: `ai-${Date.now()}-${i}`,
              type: 'image',
              name: `ai-${imageAspect}-${Date.now()}-${i + 1}.png`,
              sizeKb: r.sizeKb!,
              uploading: false,
              dataUrl: r.dataUrl,
              url: r.url,
              storage: r.storage,
            };
            setMedia(prev => [...prev, newItem]);
            succeeded++;
            lastEngine = r.engine;
            lastStorage = r.storage;
          } else if (r.error) {
            console.warn(`[ai-image ${i + 1}/${imageBatchCount}]`, r.error);
          }
        } catch (e: any) {
          console.warn(`[ai-image ${i + 1}/${imageBatchCount}] 예외:`, e?.message);
        }
        setImgBatchProgress({ done: i + 1, total: imageBatchCount });
      }

      if (succeeded === 0) {
        notifications.show({ color: 'red', title: '모두 실패', message: 'AI 이미지 생성 모두 실패. 키/할당량 확인' });
      } else {
        imageModalCtl.close();
        setImagePrompt('');
        notifications.show({
          color: 'teal',
          title: `🎨 AI 이미지 ${succeeded}/${imageBatchCount}장 생성됨 (${lastEngine})`,
          message: lastStorage === 'r2'
            ? `R2 업로드 완료 — 자동 첨부됐어요`
            : `inline 미리보기 (R2 키 등록 시 자동 업로드 활성화)`,
          autoClose: 5000,
        });
      }
    } finally {
      setImgBusy(false);
      setImgBatchProgress(null);
    }
  };

  const handleSubmit = async (values: typeof form.values) => {
    // 업로드 진행 중인 미디어가 있으면 차단
    if (media.some(m => m.uploading)) {
      notifications.show({ color: 'orange', title: '미디어 업로드 중', message: '업로드가 끝난 후 발행해주세요.' });
      return;
    }
    // 외부 URL 만 mediaUrls 로 전달 (Telegram/Discord/WordPress 등이 photoUrl 로 받음).
    // dataUrl 만 있는 항목 (R2 미설정 inline) 도 일단 dataUrl 그대로 전달 — 발행 시 publisher 가
    // 외부 http URL 이 아니면 첨부 skip 하거나 에러. 향후 R2 설정 안내.
    const mediaUrls = media
      .filter(m => !m.failed)
      .map(m => m.url || m.dataUrl)
      .filter((u): u is string => !!u);

    setLoading(true);
    try {
      if (values.splitMode) {
        const result = await createSplitCampaign({
          name: values.name,
          description: values.description,
          channelIds: values.channelIds,
          content: values.content,
          sourceLanguage: values.sourceLanguage,
          autoTranslate: values.autoTranslate,
          splitCount: values.splitCount,
          mediaUrls,
        });
        await clearCampaignDraft().catch(() => {});
        notifications.show({
          title: '🎯 분할 발행 예약',
          message: `${result.region} 황금시간대 ${result.splitCount}회 × ${values.channelIds.length}채널 = ${result.totalTasks}건${mediaUrls.length ? ` · 미디어 ${mediaUrls.length}개 첨부` : ''}`,
          color: 'violet',
          autoClose: 7000,
        });
      } else {
        await createCampaign({
          name: values.name,
          description: values.description,
          channelIds: values.channelIds,
          content: values.content,
          sourceLanguage: values.sourceLanguage,
          autoTranslate: values.autoTranslate,
          scheduledAt: values.scheduledAt,
          mediaUrls,
        });
        await clearCampaignDraft().catch(() => {});
        notifications.show({
          title: '✅ 캠페인 예약 완료',
          message: mediaUrls.length
            ? `${values.channelIds.length}개 채널 · 미디어 ${mediaUrls.length}개 첨부`
            : `${values.channelIds.length}개 채널 발행 예약`,
          color: 'green',
        });
      }
      router.push('/dashboard/campaigns');
    } catch (error: any) {
      notifications.show({ title: '오류', message: error?.message || '캠페인 생성 중 실패했습니다.', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleDiscardDraft = async () => {
    if (!confirm('작성 중인 내용을 모두 버립니다. 계속할까요?')) return;
    await clearCampaignDraft();
    form.reset();
    setDraftLastSaved(null);
    notifications.show({ color: 'gray', title: '드래프트 삭제', message: '빈 폼으로 초기화됐어요.' });
  };

  return (
    <Container size="xl">
      <Group justify="space-between" align="flex-end" mb="xl">
        <Stack gap={0}>
          <Title order={2}>✨ 새 캠페인 작성</Title>
          <Text c="dimmed">채널 → 콘텐츠 → 미디어 → 시간 순서로 작성하면 우측에 실시간 미리보기가 나타납니다.</Text>
        </Stack>
        {!template && (
          <Button
            component={Link}
            href="/dashboard/campaigns/templates"
            variant="light"
            leftSection={<IconBulb size={16} />}
          >
            템플릿 둘러보기
          </Button>
        )}
      </Group>

      {template && (
        <Paper withBorder p="md" radius="md" mb="lg" bg="blue.0" style={{ borderColor: 'var(--mantine-color-blue-3)' }}>
          <Group justify="space-between">
            <Group gap="sm">
              <Text fz={28}>{template.icon}</Text>
              <Stack gap={0}>
                <Group gap={6}>
                  <Badge color="blue" variant="filled" size="sm">템플릿 사용 중</Badge>
                  <Text fw={700}>{template.title}</Text>
                </Group>
                <Text size="xs" c="dimmed">
                  {template.description} · 추천 시간: {template.suggestedTime}
                </Text>
              </Stack>
            </Group>
            <Tooltip label="템플릿 해제 (빈 폼으로 시작)">
              <ActionIcon component={Link} href="/dashboard/campaigns/new" variant="subtle" color="gray">
                <IconX size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Paper>
      )}

      <Grid>
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Paper withBorder shadow="sm" p={{ base: 16, sm: 24 }} radius="md">
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack gap="xl">

                {/* ── STEP 1: 채널 선택 ── */}
                <Box>
                  <SectionHeader step={1} icon={IconWorld} title="발행 대상 채널" desc="멀티 선택 가능 — 선택한 채널 모두에 자동 발행됩니다" />
                  <Stack gap="sm">
                    <TextInput
                      label="캠페인 이름"
                      placeholder="2026 봄 시즌 프로모션"
                      required
                      {...form.getInputProps('name')}
                    />
                    <Textarea
                      label="캠페인 설명 (선택, 본인 메모용)"
                      placeholder="이 캠페인의 목적이나 메모를 남겨주세요."
                      autosize
                      minRows={1}
                      maxRows={3}
                      {...form.getInputProps('description')}
                    />
                    <MultiSelect
                      label="발행 채널"
                      placeholder={channels.length === 0 ? '먼저 /dashboard/channels 에서 채널을 추가하세요' : '채널을 선택하세요'}
                      data={channels.map(c => ({
                        value: c.id,
                        label: `[${c.type}] ${c.accountName} · ${((c as any).region || 'korea')} · ${((c as any).language || 'ko').toUpperCase()}`,
                      }))}
                      required
                      searchable
                      disabled={channels.length === 0}
                      {...form.getInputProps('channelIds')}
                    />
                  </Stack>
                </Box>

            {targetLanguages.length > 1 && (
              <Paper withBorder p="sm" radius="md" bg="blue.0">
                <Group justify="space-between">
                  <Stack gap={2}>
                    <Group gap={6}>
                      <IconSparkles size={14} />
                      <Text size="sm" fw={600}>다지역 자동 번역</Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      선택한 채널의 언어가 {targetLanguages.length}종 ({targetLanguages.join(', ')}) — 본문은{' '}
                      <Badge size="xs" variant="light">{form.values.sourceLanguage}</Badge> 로 작성, 다른 언어는 발행 시 자동 번역됩니다.
                    </Text>
                  </Stack>
                </Group>
              </Paper>
            )}

            {template && template.variables.length > 0 && (
              <Box>
                <Group gap={6} mb="xs">
                  <Text size="sm" fw={600}>템플릿 변수</Text>
                  <Badge size="xs" variant="light">아래 입력하면 본문에 자동 반영</Badge>
                </Group>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                  {template.variables.map(v => (
                    <TextInput
                      key={v.name}
                      label={v.name}
                      placeholder={v.placeholder}
                      value={variableValues[v.name] || ''}
                      onChange={(e) => handleVariableChange(v.name, e.currentTarget.value)}
                      size="sm"
                    />
                  ))}
                </SimpleGrid>
                <Divider mt="sm" />
              </Box>
            )}

            {/* ── STEP 2: 콘텐츠 본문 ── */}
            <Box>
              <SectionHeader
                step={2}
                icon={IconPencil}
                title="콘텐츠 본문"
                desc="채널별 한도는 우측 미리보기에 실시간 표시"
              />

              {/* Phase 8-1: AI 콘텐츠 브리프 (접어서) */}
              <Accordion variant="contained" mb="sm" radius="md">
                <Accordion.Item value="brief">
                  <Accordion.Control icon={<IconWand size={16} color="var(--mantine-color-violet-6)" />}>
                    <Group gap="xs" wrap="nowrap">
                      <Text size="sm" fw={700}>🪄 AI 콘텐츠 브리프</Text>
                      <Badge size="xs" color="violet" variant="light">선택</Badge>
                      {(form.values.briefPurpose || form.values.briefTone || form.values.briefAudience || form.values.briefCta) && (
                        <Badge size="xs" color="green" variant="dot">설정됨</Badge>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed" mt={2}>
                      AI 가 캠페인 의도를 정확히 파악하도록 정보를 주세요 — 캡션 품질이 크게 향상됩니다
                    </Text>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                      <Select
                        label="콘텐츠 목적"
                        placeholder="선택 (자유)"
                        clearable
                        data={[
                          { value: 'review', label: '✍️ 후기·리뷰 (사용 경험)' },
                          { value: 'info', label: '📚 정보·교육 (How-to·노하우)' },
                          { value: 'promo', label: '🎉 홍보·할인 (이벤트·프로모션)' },
                          { value: 'story', label: '💝 스토리텔링 (감성·서사)' },
                          { value: 'comparison', label: '⚖️ 비교·추천 (랭킹·분석)' },
                          { value: 'insight', label: '💡 인사이트·생각 (트렌드·의견)' },
                        ]}
                        {...form.getInputProps('briefPurpose')}
                      />
                      <Select
                        label="톤·스타일"
                        placeholder="선택"
                        clearable
                        data={[
                          { value: 'casual', label: '😊 친근·캐주얼 (구어체)' },
                          { value: 'professional', label: '👔 전문·격식' },
                          { value: 'humorous', label: '🤣 유머·재치 (밈 OK)' },
                          { value: 'trendy', label: '🔥 MZ 트렌디 (이모지·신조어)' },
                          { value: 'warm', label: '💕 따뜻·감성' },
                          { value: 'serious', label: '🧐 진지·중요한 발표' },
                        ]}
                        {...form.getInputProps('briefTone')}
                      />
                      <Select
                        label="글 길이"
                        placeholder="선택"
                        clearable
                        data={[
                          { value: 'short', label: '⚡ 짧게 (1-2문장)' },
                          { value: 'medium', label: '📝 중간 (3-5문장)' },
                          { value: 'long', label: '📖 길게 (1-2단락)' },
                          { value: 'extra_long', label: '📜 매우 길게 (스토리텔링)' },
                        ]}
                        {...form.getInputProps('briefLength')}
                      />
                      <Select
                        label="타겟 독자"
                        placeholder="선택"
                        clearable
                        data={[
                          { value: 'mz_2030', label: '20-30 MZ (디지털·가성비)' },
                          { value: 'mid_3040', label: '30-40 (가족·실용)' },
                          { value: 'senior_5060', label: '50-60 시니어 (안정·신뢰)' },
                          { value: 'b2b', label: 'B2B 의사결정자 (ROI)' },
                          { value: 'general', label: '일반 소비자 (다양 연령)' },
                        ]}
                        {...form.getInputProps('briefAudience')}
                      />
                      <TextInput
                        label="업종/카테고리"
                        placeholder="예: 카페, IT 솔루션, 부동산"
                        {...form.getInputProps('briefIndustry')}
                      />
                      <Select
                        label="행동 유도 (CTA)"
                        placeholder="선택"
                        clearable
                        data={[
                          { value: 'purchase', label: '🛒 구매·예약' },
                          { value: 'visit', label: '🔗 클릭·방문' },
                          { value: 'follow', label: '👥 팔로우·구독' },
                          { value: 'share', label: '🔄 공유·태그' },
                          { value: 'inquire', label: '💬 문의·DM' },
                          { value: 'aware', label: '👁️ 인지·각인 (구매 압박 X)' },
                        ]}
                        {...form.getInputProps('briefCta')}
                      />
                      <TextInput
                        label="브랜드명 (선택)"
                        placeholder="자연스럽게 본문에 1-2회 언급"
                        {...form.getInputProps('briefBrandName')}
                      />
                      <TextInput
                        label="CTA 링크 (선택)"
                        placeholder="https://..."
                        {...form.getInputProps('briefBrandUrl')}
                      />
                    </SimpleGrid>
                    <TextInput
                      label="핵심 키워드 (쉼표 또는 띄어쓰기 구분)"
                      description="해시태그·본문에 강조 적용"
                      placeholder="예: 봄세일 신메뉴 라떼"
                      mt="sm"
                      {...form.getInputProps('briefKeywords')}
                    />
                    <Text size="xs" c="dimmed" mt="sm">
                      💡 첨부한 첫 이미지가 있으면 AI 가 이미지를 분석해서 더 정확한 캡션을 만듭니다 (vision)
                    </Text>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>

              <Group justify="flex-end" mb={6}>
                <Group gap="xs">
                  <Button
                    size="compact-sm"
                    variant="light"
                    color="violet"
                    leftSection={<IconSparkles size={14} />}
                    onClick={handleGenerateCaption}
                  >
                    AI 캡션 생성
                  </Button>
                </Group>
              </Group>
              <Textarea
                placeholder="인스타그램·블로그에 게시될 실제 텍스트를 입력하세요. 길게 써도 OK — 채널별 한도는 자동 미리보기에 표시됩니다.&#10;&#10;💡 팁: 첫 줄을 후킹 문장으로, 본문은 가치 → CTA 순서, 마지막에 #해시태그"
                minRows={12}
                autosize
                maxRows={30}
                required
                styles={{ input: { fontSize: 14, lineHeight: 1.6 } }}
                {...form.getInputProps('content')}
              />
              <Group justify="space-between" mt={4}>
                <Text size="xs" c="dimmed">
                  AI 키 없으면 무료 엔진(Gemini/Groq) 자동 시도. <Anchor component={Link} href="/dashboard/settings/ai" size="xs">키 등록</Anchor>
                </Text>
                <Text size="xs" c={form.values.content.length > 5000 ? 'orange.7' : 'dimmed'} fw={600}>
                  {form.values.content.length.toLocaleString()}자
                </Text>
              </Group>
            </Box>

            {/* ── STEP 3: 미디어 첨부 ── */}
            <Box>
              <SectionHeader
                step={3}
                icon={IconCloudUpload}
                title="미디어 (사진·영상)"
                desc="드래그앤드롭 또는 AI 생성 — Telegram/Discord/WordPress/X 등은 첨부된 첫 이미지 자동 사용"
              />
              <Group justify="flex-end" mb={6}>
                <Button
                  size="compact-sm"
                  variant="light"
                  color="teal"
                  leftSection={<IconSparkles size={14} />}
                  onClick={() => imageModalCtl.open()}
                >
                  AI 이미지 생성
                </Button>
              </Group>
              <MediaUploader items={media} onChange={setMedia} />
            </Box>

            {/* ── STEP 4: 시간 + 옵션 ── */}
            <Box>
              <SectionHeader
                step={4}
                icon={IconCalendar}
                title="발행 시간"
                desc="단일 시각 또는 황금시간대 자동·분할 모드"
              />
            </Box>

            {/* 분할 발행 토글 (Phase 6) */}
            <Paper withBorder p="sm" radius="md" bg={form.values.splitMode ? 'violet.0' : undefined}>
              <Group justify="space-between" wrap="nowrap" align="center">
                <Box style={{ flex: 1 }}>
                  <Group gap={6}>
                    <Text size="sm" fw={700}>🔀 분할 발행 모드</Text>
                    {form.values.splitMode && <Badge size="xs" color="violet" variant="filled">ON</Badge>}
                  </Group>
                  <Text size="xs" c="dimmed">같은 콘텐츠를 region 의 다음 N개 황금시간대에 자동 분할 예약</Text>
                </Box>
                <Button
                  size="xs"
                  variant={form.values.splitMode ? 'filled' : 'light'}
                  color="violet"
                  onClick={() => form.setFieldValue('splitMode', !form.values.splitMode)}
                >
                  {form.values.splitMode ? '단일 발행으로' : '분할 활성화'}
                </Button>
              </Group>
              {form.values.splitMode && (
                <Group mt="sm" gap="xs" align="flex-end">
                  <Text size="sm">분할 횟수:</Text>
                  <Group gap={4}>
                    {[2, 3, 5, 7, 10].map(n => (
                      <Button
                        key={n}
                        size="compact-xs"
                        variant={form.values.splitCount === n ? 'filled' : 'light'}
                        color="violet"
                        onClick={() => form.setFieldValue('splitCount', n)}
                      >
                        {n}회
                      </Button>
                    ))}
                  </Group>
                  <Text size="xs" c="violet.7" fw={600} ml="auto">
                    채널 {form.values.channelIds.length}개 × {form.values.splitCount}회 = {form.values.channelIds.length * form.values.splitCount}건 예약
                  </Text>
                </Group>
              )}
            </Paper>

            {!form.values.splitMode && (
              <Stack gap={4}>
                <Group justify="space-between" align="flex-end">
                  <Text size="sm" fw={500}>예약 발행 시각 <Text span c="red">*</Text></Text>
                  <Tooltip label="선택한 채널의 region 별 황금 시간대 (다음 출근/점심/저녁 피크)에 자동 예약" withArrow>
                    <Button
                      size="compact-xs"
                      variant="light"
                      color="violet"
                      leftSection={<IconBulb size={12} />}
                      disabled={form.values.channelIds.length === 0}
                      onClick={async () => {
                        try {
                          const res = await suggestPrimeTimeForChannels(form.values.channelIds);
                          form.setFieldValue('scheduledAt', new Date(res.suggested));
                          notifications.show({
                            title: '🎯 황금시간대 적용',
                            message: `${res.region} → ${res.suggestedLocal} (${res.hourLabels.join(' · ')} 중)`,
                            color: 'violet',
                            autoClose: 5000,
                          });
                        } catch (e: any) {
                          notifications.show({ title: '오류', message: e?.message || '추천 실패', color: 'red' });
                        }
                      }}
                    >
                      🎯 최적 시간 자동
                    </Button>
                  </Tooltip>
                </Group>
                <DateTimePicker
                  placeholder="날짜와 시간을 선택하세요"
                  required
                  minDate={new Date()}
                  {...form.getInputProps('scheduledAt')}
                />
              </Stack>
            )}

            <Group justify="space-between" mt="xl">
              <Group gap="xs">
                {draftStatus === 'saving' && (
                  <Group gap={4}>
                    <Loader size={12} />
                    <Text size="xs" c="dimmed">저장 중...</Text>
                  </Group>
                )}
                {draftStatus === 'saved' && (
                  <Text size="xs" c="green">✓ 드래프트 저장됨</Text>
                )}
                {draftStatus === 'idle' && draftLastSaved && (
                  <Text size="xs" c="dimmed">최근 저장: {dayjs(draftLastSaved).format('HH:mm:ss')}</Text>
                )}
                {draftLastSaved && (
                  <Button size="compact-xs" variant="subtle" color="gray" onClick={handleDiscardDraft}>
                    드래프트 삭제
                  </Button>
                )}
              </Group>
              <Group gap="xs">
                <Button variant="subtle" onClick={() => router.back()}>취소</Button>
                <Button type="submit" loading={loading} size="md">캠페인 생성 및 예약</Button>
              </Group>
            </Group>
          </Stack>
        </form>
      </Paper>
        </Grid.Col>

        {/* 우측 — 채널별 실시간 미리보기 (sticky) */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <Box style={{ position: 'sticky', top: 76 }}>
            <ChannelPreview
              channels={selectedChannels.map(c => ({
                id: c.id,
                type: c.type,
                accountName: c.accountName,
                region: (c as any).region,
                language: (c as any).language,
              }))}
              content={form.values.content}
              media={media.map(m => ({
                type: m.type,
                url: m.url,
                dataUrl: m.dataUrl,
              }))}
            />
          </Box>
        </Grid.Col>
      </Grid>

      {/* ════ AI 캡션 결과 모달 ════ */}
      <Modal
        opened={captionModal}
        onClose={captionModalCtl.close}
        title={<Group gap={6}><IconSparkles size={18} /><Text fw={700}>AI 캡션 생성 결과</Text></Group>}
        size="lg"
      >
        {aiBusy && (
          <Stack align="center" py="xl">
            <Loader />
            <Text size="sm" c="dimmed">AI 가 채널별 캡션 작성 중... (Gemini/Groq → Ollama → Claude 폴백)</Text>
          </Stack>
        )}
        {!aiBusy && captions && (
          <Stack gap="md">
            <Text size="xs" c="dimmed">
              각 채널 포맷에 맞춰 따로 작성됐어요. "이 본문 적용" 누르면 본문 입력칸에 채워지고, "복사"는 클립보드로.
            </Text>
            {Object.entries(captions).map(([channelId, cap]) => (
              <Card key={channelId} withBorder padding="md" radius="md">
                <Group justify="space-between" mb="xs">
                  <Group gap={6}>
                    <Badge color="violet" variant="light">{cap.channelType}</Badge>
                    <Text size="sm" fw={600}>{cap.accountName}</Text>
                    <Badge size="xs" variant="dot">{cap.format}</Badge>
                  </Group>
                  <Group gap={4}>
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      leftSection={copiedKey === channelId ? <IconCheck size={12} /> : <IconCopy size={12} />}
                      onClick={() => copyCaption(channelId)}
                    >
                      {copiedKey === channelId ? '복사됨' : '복사'}
                    </Button>
                    <Button size="compact-xs" onClick={() => applyCaption(channelId)}>이 본문 적용</Button>
                  </Group>
                </Group>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{cap.text}</Text>
                {cap.hashtags?.length > 0 && (
                  <Group gap={4} mt="xs">
                    {cap.hashtags.map(t => (
                      <Badge key={t} size="xs" variant="outline">#{t}</Badge>
                    ))}
                  </Group>
                )}
              </Card>
            ))}
          </Stack>
        )}
      </Modal>

      {/* ════ AI 이미지 생성 모달 ════ */}
      <Modal
        opened={imageModal}
        onClose={() => !imgBusy && imageModalCtl.close()}
        title={<Group gap={6}><IconPhoto size={18} /><Text fw={700}>🎨 AI로 이미지 만들기</Text></Group>}
        size="md"
        closeOnClickOutside={!imgBusy}
        withCloseButton={!imgBusy}
      >
        <Stack gap="md">
          <Textarea
            label="어떤 이미지를 원하세요?"
            description="구체적으로 적을수록 더 정확한 이미지가 나와요 (장면·분위기·색상 등)"
            placeholder="예: 봄 카페에서 따뜻한 햇살을 받으며 마시는 라떼와 케이크, 미니멀하고 따뜻한 스타일"
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.currentTarget.value)}
            minRows={3}
            autosize
            disabled={imgBusy}
          />
          <Box>
            <Text size="sm" fw={500} mb={4}>가로세로 비율</Text>
            <Group gap="xs">
              {(['square', 'vertical', 'horizontal'] as const).map(a => (
                <Badge
                  key={a}
                  size="lg"
                  variant={imageAspect === a ? 'filled' : 'outline'}
                  style={{ cursor: imgBusy ? 'not-allowed' : 'pointer' }}
                  onClick={() => !imgBusy && setImageAspect(a)}
                >
                  {a === 'square' ? '⬛ 1:1 (인스타·페북)' : a === 'vertical' ? '📱 9:16 (스토리·릴스)' : '🖥 16:9 (유튜브·X)'}
                </Badge>
              ))}
            </Group>
          </Box>
          <Box>
            <Text size="sm" fw={500} mb={4}>몇 장을 만들까요?</Text>
            <Group gap="xs">
              {([1, 3, 5, 10] as const).map(n => (
                <Button
                  key={n}
                  size="compact-sm"
                  variant={imageBatchCount === n ? 'filled' : 'light'}
                  color="violet"
                  onClick={() => setImageBatchCount(n)}
                  disabled={imgBusy}
                >
                  {n}장{n > 1 ? ' (시도해보고 골라요)' : ''}
                </Button>
              ))}
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              여러 장 선택 시 각 이미지는 약간씩 달라요 — 마음에 드는 것만 남기고 나머지는 X로 지우세요
            </Text>
          </Box>
          {imgBatchProgress && (
            <Box>
              <Text size="xs" c="dimmed" mb={4}>생성 중... {imgBatchProgress.done}/{imgBatchProgress.total}</Text>
              <Box style={{ height: 6, background: 'var(--mantine-color-default-border)', borderRadius: 3 }}>
                <Box style={{
                  width: `${(imgBatchProgress.done / imgBatchProgress.total) * 100}%`,
                  height: '100%',
                  background: 'var(--mantine-color-violet-6)',
                  borderRadius: 3,
                  transition: 'width 0.3s',
                }} />
              </Box>
            </Box>
          )}
          <Box style={{ background: 'var(--mantine-color-default-hover)', borderRadius: 8, padding: 10 }}>
            <Text size="11px" c="dimmed" lineClamp={3}>
              💡 <strong>무료 엔진</strong>(Pollinations) 우선 사용. AI 키 등록 시 DALL-E 3 → Gemini Imagen 도 자동 사용.
              영상 자동 생성은 곧 출시 예정 — 지금은 영상 파일을 직접 업로드해주세요.
            </Text>
          </Box>
          <Button
            onClick={handleGenerateImage}
            loading={imgBusy}
            leftSection={<IconSparkles size={16} />}
            color="violet"
            size="md"
          >
            {imageBatchCount === 1 ? '이미지 만들기' : `${imageBatchCount}장 한 번에 만들기`}
          </Button>
        </Stack>
      </Modal>
    </Container>
  );
}

export default function NewCampaignPage() {
  return (
    <Suspense fallback={<Container size="md"><Text>로딩중...</Text></Container>}>
      <NewCampaignPageInner />
    </Suspense>
  );
}
