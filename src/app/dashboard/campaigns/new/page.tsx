"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import {
  TextInput, Textarea, Button, Paper, Title, Container,
  Stack, MultiSelect, Group, Text, Badge, ActionIcon, Tooltip, Box, Divider, SimpleGrid
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { IconBulb, IconX } from '@tabler/icons-react';
import { listChannels } from '@/app/actions/channelActions';
import { createCampaign } from '@/app/actions/campaignActions';
import { MarketingChannel } from '@prisma/client';
import { getTemplateById, applyTemplateVariables } from '@/lib/campaign-templates';

function NewCampaignPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('template');
  const template = useMemo(() => (templateId ? getTemplateById(templateId) : null), [templateId]);

  const [channels, setChannels] = useState<MarketingChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

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
      scheduledAt: new Date(Date.now() + 10 * 60 * 1000),
    },
    validate: {
      name: (value) => (value.length < 2 ? '캠페인 이름을 입력하세요.' : null),
      channelIds: (value) => (value.length === 0 ? '발행할 채널을 하나 이상 선택하세요.' : null),
      content: (value) => (value.length === 0 ? '발행할 콘텐츠 내용을 입력하세요.' : null),
    },
  });

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

  const handleVariableChange = (name: string, value: string) => {
    setVariableValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      await createCampaign({
        name: values.name,
        description: values.description,
        channelIds: values.channelIds,
        content: values.content,
        scheduledAt: values.scheduledAt,
      });
      notifications.show({ title: '성공', message: '캠페인이 예약되었습니다.', color: 'green' });
      router.push('/dashboard/campaigns');
    } catch (error) {
      notifications.show({ title: '오류', message: '캠페인 생성 중 실패했습니다.', color: 'red' });
    } finally {
      setLoading(false);
    }
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
              data={channels.map(c => ({ value: c.id, label: `[${c.type}] ${c.accountName}` }))}
              required
              searchable
              {...form.getInputProps('channelIds')}
            />

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

            <Textarea
              label={template ? '발행 콘텐츠 본문 (변수 입력 시 자동 갱신)' : '발행 콘텐츠 본문'}
              placeholder="인스타그램이나 블로그에 게시될 실제 텍스트를 입력하세요."
              minRows={8}
              required
              {...form.getInputProps('content')}
            />

            <DateTimePicker
              label="예약 발행 시각"
              placeholder="날짜와 시간을 선택하세요"
              required
              minDate={new Date()}
              {...form.getInputProps('scheduledAt')}
            />

            <Group justify="flex-end" mt="xl">
              <Button variant="subtle" onClick={() => router.back()}>취소</Button>
              <Button type="submit" loading={loading} size="md">캠페인 생성 및 예약</Button>
            </Group>
          </Stack>
        </form>
      </Paper>
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
