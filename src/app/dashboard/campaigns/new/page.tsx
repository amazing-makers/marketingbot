"use client";

import { useState, useEffect } from 'react';
import { 
  TextInput, Textarea, Button, Paper, Title, Container, 
  Stack, MultiSelect, Group, Card, Text
} from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { listChannels } from '@/app/actions/channelActions';
import { createCampaign } from '@/app/actions/campaignActions';
import { MarketingChannel } from '@prisma/client';

export default function NewCampaignPage() {
  const router = useRouter();
  const [channels, setChannels] = useState<MarketingChannel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listChannels().then(setChannels);
  }, []);

  const form = useForm({
    initialValues: {
      name: '',
      description: '',
      channelIds: [] as string[],
      content: '',
      scheduledAt: new Date(Date.now() + 10 * 60 * 1000), // 10분 뒤 기본값
    },
    validate: {
      name: (value) => (value.length < 2 ? '캠페인 이름을 입력하세요.' : null),
      channelIds: (value) => (value.length === 0 ? '발행할 채널을 하나 이상 선택하세요.' : null),
      content: (value) => (value.length === 0 ? '발행할 콘텐츠 내용을 입력하세요.' : null),
    },
  });

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
      <Stack mb="xl">
        <Title order={2}>새 캠페인 작성</Title>
        <Text c="dimmed">채널을 선택하고 콘텐츠를 작성하여 멀티 채널 발행을 예약하세요.</Text>
      </Stack>

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

            <Textarea 
              label="발행 콘텐츠 본문" 
              placeholder="인스타그램이나 블로그에 게시될 실제 텍스트를 입력하세요." 
              minRows={5}
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
