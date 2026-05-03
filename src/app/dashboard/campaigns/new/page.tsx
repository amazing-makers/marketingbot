"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import {
  TextInput, Textarea, Button, Paper, Title, Container,
  Stack, MultiSelect, Group, Text, Badge, ActionIcon, Tooltip, Box, Divider, SimpleGrid,
  Modal, Card, Image, Loader, Anchor
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { IconBulb, IconX, IconSparkles, IconPhoto, IconCopy, IconCheck, IconDownload } from '@tabler/icons-react';
import { listChannels } from '@/app/actions/channelActions';
import { createCampaign, loadCampaignDraft, saveCampaignDraft, clearCampaignDraft, suggestPrimeTimeForChannels } from '@/app/actions/campaignActions';
import { generateCampaignCaption, generateCampaignImage } from '@/app/actions/aiContentActions';
import { MarketingChannel } from '@prisma/client';
import { getTemplateById, applyTemplateVariables } from '@/lib/campaign-templates';
import dayjs from 'dayjs';

function NewCampaignPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('template');
  const template = useMemo(() => (templateId ? getTemplateById(templateId) : null), [templateId]);

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
  const [imgBusy, setImgBusy] = useState(false);
  const [imgPreview, setImgPreview] = useState<{ dataUrl: string; engine: string; sizeKb: number } | null>(null);

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
      scheduledAt: new Date(Date.now() + 10 * 60 * 1000),
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
      const r = await generateCampaignCaption({
        userHint,
        channelIds: form.values.channelIds,
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

  // ════ AI 이미지 생성 ════
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      notifications.show({ color: 'orange', title: '프롬프트 필요', message: '이미지 설명을 입력하세요.' });
      return;
    }
    setImgBusy(true);
    setImgPreview(null);
    try {
      const r = await generateCampaignImage({ prompt: imagePrompt, aspect: imageAspect });
      if (r.success && r.dataUrl) {
        setImgPreview({ dataUrl: r.dataUrl, engine: r.engine!, sizeKb: r.sizeKb! });
        notifications.show({ color: 'green', title: `${r.engine} 생성`, message: `${r.sizeKb}KB · 미리보기 가능` });
      } else {
        notifications.show({ color: 'red', title: '생성 실패', message: r.error || '엔진 모두 실패' });
      }
    } finally {
      setImgBusy(false);
    }
  };

  const downloadImage = () => {
    if (!imgPreview) return;
    const a = document.createElement('a');
    a.href = imgPreview.dataUrl;
    a.download = `marketingbot-${Date.now()}.png`;
    a.click();
  };

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      await createCampaign({
        name: values.name,
        description: values.description,
        channelIds: values.channelIds,
        content: values.content,
        sourceLanguage: values.sourceLanguage,
        autoTranslate: values.autoTranslate,
        scheduledAt: values.scheduledAt,
      });
      // 성공 → 드래프트 삭제 (사용 끝났으므로)
      await clearCampaignDraft().catch(() => {});
      notifications.show({ title: '성공', message: '캠페인이 예약되었습니다.', color: 'green' });
      router.push('/dashboard/campaigns');
    } catch (error) {
      notifications.show({ title: '오류', message: '캠페인 생성 중 실패했습니다.', color: 'red' });
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
    <Container size="md">
      <Group justify="space-between" align="flex-end" mb="xl">
        <Stack gap={0}>
          <Title order={2}>새 캠페인 작성</Title>
          <Text c="dimmed">채널을 선택하고 콘텐츠를 작성하여 멀티 채널 발행을 예약하세요.</Text>
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

      <Paper withBorder shadow="md" p={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="lg">
            <TextInput
              label="캠페인 이름"
              placeholder="2026 봄 시즌 프로모션"
              required
              {...form.getInputProps('name')}
            />

            <Textarea
              label="캠페인 설명 (선택)"
              placeholder="캠페인에 대한 메모를 남겨주세요."
              {...form.getInputProps('description')}
            />

            <MultiSelect
              label="발행 대상 채널"
              placeholder="채널을 선택하세요"
              data={channels.map(c => ({
                value: c.id,
                label: `[${c.type}] ${c.accountName} · ${((c as any).region || 'korea')} · ${((c as any).language || 'ko').toUpperCase()}`,
              }))}
              required
              searchable
              {...form.getInputProps('channelIds')}
            />

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

            <Box>
              <Group justify="space-between" mb={6}>
                <Text size="sm" fw={500}>{template ? '발행 콘텐츠 본문 (변수 입력 시 자동 갱신)' : '발행 콘텐츠 본문'}</Text>
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
                  <Button
                    size="compact-sm"
                    variant="light"
                    color="teal"
                    leftSection={<IconPhoto size={14} />}
                    onClick={() => imageModalCtl.open()}
                  >
                    AI 이미지 생성
                  </Button>
                </Group>
              </Group>
              <Textarea
                placeholder="인스타그램이나 블로그에 게시될 실제 텍스트를 입력하세요."
                minRows={8}
                required
                {...form.getInputProps('content')}
              />
              <Text size="xs" c="dimmed" mt={4}>
                AI 키 없으면 무료 엔진(Gemini/Groq) 자동 시도. 키 등록은 <Anchor component={Link} href="/dashboard/settings/ai" size="xs">환경설정 → AI 엔진</Anchor>.
              </Text>
            </Box>

            {imgPreview && (
              <Paper withBorder p="sm" radius="md">
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <Badge color="teal" variant="light">{imgPreview.engine}</Badge>
                    <Text size="xs" c="dimmed">{imgPreview.sizeKb}KB</Text>
                  </Group>
                  <Group gap={4}>
                    <ActionIcon variant="subtle" onClick={downloadImage} title="다운로드">
                      <IconDownload size={14} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => setImgPreview(null)} title="제거">
                      <IconX size={14} />
                    </ActionIcon>
                  </Group>
                </Group>
                <Image src={imgPreview.dataUrl} radius="sm" alt="AI 생성 이미지" />
                <Text size="xs" c="dimmed" mt={4}>
                  ⚠️ 이미지는 미리보기 단계 — 캠페인 저장 시 자동 업로드는 미구현 (R2 통합 예정). 다운로드 후 채널별 미디어로 재업로드 필요.
                </Text>
              </Paper>
            )}

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
        onClose={imageModalCtl.close}
        title={<Group gap={6}><IconPhoto size={18} /><Text fw={700}>AI 이미지 생성</Text></Group>}
        size="md"
      >
        <Stack gap="md">
          <Textarea
            label="이미지 프롬프트"
            placeholder="예: 봄 시즌 카페 신메뉴 라떼와 케이크, 따뜻한 햇빛, 미니멀 스타일"
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.currentTarget.value)}
            minRows={3}
            autosize
          />
          <Group gap="xs">
            <Text size="sm" fw={500}>비율:</Text>
            {(['square', 'vertical', 'horizontal'] as const).map(a => (
              <Badge
                key={a}
                size="md"
                variant={imageAspect === a ? 'filled' : 'outline'}
                style={{ cursor: 'pointer' }}
                onClick={() => setImageAspect(a)}
              >
                {a === 'square' ? '1:1 정사각' : a === 'vertical' ? '9:16 세로' : '16:9 가로'}
              </Badge>
            ))}
          </Group>
          <Text size="xs" c="dimmed">
            엔진 폴백: Pollinations (무료) → DALL-E 3 → Gemini Imagen. 키 미등록 시 Pollinations 만 시도.
          </Text>
          <Button
            onClick={handleGenerateImage}
            loading={imgBusy}
            leftSection={<IconSparkles size={16} />}
          >
            생성
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
