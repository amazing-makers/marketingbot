"use client";

import { useState } from 'react';
import { 
  SimpleGrid, Card, Text, Group, Badge, Button, Modal, 
  Select, TextInput, Stack, ActionIcon, Menu, Title 
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { 
  IconPlus, IconDotsVertical, IconEdit, IconTrash, 
  IconBrandInstagram, IconBrandFacebook, IconBrandX, IconBrandTiktok, 
  IconBrandYoutube, IconMail, IconMessage, IconBrandThreads, 
  IconSettings
} from '@tabler/icons-react';
import { createChannel, deleteChannel } from '@/app/actions/channelActions';
import { ChannelType, MarketingChannel } from '@prisma/client';

const CHANNEL_ICONS: Record<string, any> = {
  INSTAGRAM: IconBrandInstagram,
  FACEBOOK: IconBrandFacebook,
  X: IconBrandX,
  TIKTOK: IconBrandTiktok,
  YOUTUBE: IconBrandYoutube,
  THREADS: IconBrandThreads,
  EMAIL: IconMail,
  SMS: IconMessage,
  NAVER_BLOG: IconSettings, // 적절한 아이콘이 없으면 기본 설정 아이콘 사용
  NAVER_CAFE: IconSettings,
};

export default function ChannelsClient({ initialChannels }: { initialChannels: MarketingChannel[] }) {
  const [channels, setChannels] = useState(initialChannels);
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      type: 'INSTAGRAM' as ChannelType,
      accountName: '',
      username: '',
      password: '',
      apiKey: '',
      apiSecret: '',
      smtpHost: '',
      smtpPort: '',
      cafeId: '',
      menuId: '',
    },
  });

  const handleAddChannel = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const credentials: any = {};
      if (['EMAIL'].includes(values.type)) {
        credentials.host = values.smtpHost;
        credentials.port = values.smtpPort;
        credentials.user = values.username;
        credentials.password = values.password;
      } else if (['SMS'].includes(values.type)) {
        credentials.apiKey = values.apiKey;
        credentials.apiSecret = values.apiSecret;
      } else if (values.type === 'NAVER_CAFE') {
        credentials.username = values.username;
        credentials.password = values.password;
        credentials.cafeId = values.cafeId;
        credentials.menuId = values.menuId;
      } else {
        credentials.username = values.username;
        credentials.password = values.password;
      }

      const newChannel = await createChannel({
        type: values.type,
        accountName: values.accountName,
        credentials,
      });

      setChannels([newChannel, ...channels]);
      setOpened(false);
      form.reset();
      notifications.show({ title: '성공', message: '채널이 추가되었습니다.', color: 'green' });
    } catch (error) {
      notifications.show({ title: '오류', message: '채널 추가 중 실패했습니다.', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteChannel(id);
      setChannels(channels.filter(c => c.id !== id));
      notifications.show({ message: '채널이 삭제되었습니다.', color: 'blue' });
    } catch (error) {
      notifications.show({ message: '삭제 실패', color: 'red' });
    }
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>마케팅 채널 관리</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => setOpened(true)}>
          채널 추가
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {channels.map((channel) => {
          const Icon = CHANNEL_ICONS[channel.type] || IconSettings;
          return (
            <Card key={channel.id} withBorder padding="lg" radius="md">
              <Group justify="space-between" mb="xs">
                <Icon size={30} stroke={1.5} color="var(--mantine-color-blue-filled)" />
                <Menu position="bottom-end" shadow="md">
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray">
                      <IconDotsVertical size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<IconEdit size={14} />}>편집</Menu.Item>
                    <Menu.Item 
                      leftSection={<IconTrash size={14} />} 
                      color="red"
                      onClick={() => handleDelete(channel.id)}
                    >
                      삭제
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>

              <Text fw={700} size="lg">{channel.accountName}</Text>
              <Group mt="xs">
                <Badge variant="light" color={channel.status === 'ACTIVE' ? 'green' : 'orange'}>
                  {channel.type}
                </Badge>
                <Badge variant="dot" color={channel.status === 'ACTIVE' ? 'green' : 'yellow'}>
                  {channel.status}
                </Badge>
              </Group>
            </Card>
          );
        })}
      </SimpleGrid>

      <Modal opened={opened} onClose={() => setOpened(false)} title="새 마케팅 채널 추가" size="md">
        <form onSubmit={form.onSubmit(handleAddChannel)}>
          <Stack>
            <Select 
              label="채널 유형" 
              data={Object.keys(CHANNEL_ICONS).map(k => ({ value: k, label: k }))} 
              {...form.getInputProps('type')}
            />
            <TextInput label="계정 별명" placeholder="내 인스타 계정 1" required {...form.getInputProps('accountName')} />
            
            {form.values.type === 'EMAIL' ? (
              <>
                <TextInput label="SMTP 호스트" placeholder="smtp.gmail.com" {...form.getInputProps('smtpHost')} />
                <TextInput label="포트" placeholder="587" {...form.getInputProps('smtpPort')} />
                <TextInput label="사용자 (Email)" placeholder="user@gmail.com" {...form.getInputProps('username')} />
                <TextInput label="비밀번호" type="password" {...form.getInputProps('password')} />
              </>
            ) : form.values.type === 'SMS' ? (
              <>
                <TextInput label="API Key" {...form.getInputProps('apiKey')} />
                <TextInput label="API Secret" type="password" {...form.getInputProps('apiSecret')} />
              </>
            ) : (
              <>
                <TextInput label="아이디 / 이메일" placeholder="username" {...form.getInputProps('username')} />
                <TextInput label="비밀번호" type="password" placeholder="password" {...form.getInputProps('password')} />
                {form.values.type === 'NAVER_CAFE' && (
                  <>
                    <TextInput label="카페 ID (숫자)" placeholder="12345678" {...form.getInputProps('cafeId')} />
                    <TextInput label="게시판 ID (숫자)" placeholder="25" {...form.getInputProps('menuId')} />
                  </>
                )}
              </>
            )}

            <Button type="submit" loading={loading} fullWidth mt="md">추가하기</Button>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
