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
  IconSettings, IconBrandLinkedin, IconBrandPinterest, IconBrandTelegram,
  IconBrandWhatsapp, IconBrandWordpress, IconExternalLink
} from '@tabler/icons-react';
import { Anchor } from '@mantine/core';
import { createChannel, deleteChannel } from '@/app/actions/channelActions';
import { ChannelType, MarketingChannel } from '@prisma/client';

const CHANNEL_ICONS: Record<string, any> = {
  // 한국·기존
  INSTAGRAM: IconBrandInstagram,
  FACEBOOK: IconBrandFacebook,
  X: IconBrandX,
  TIKTOK: IconBrandTiktok,
  YOUTUBE: IconBrandYoutube,
  THREADS: IconBrandThreads,
  KAKAO: IconMessage,
  EMAIL: IconMail,
  SMS: IconMessage,
  NAVER_BLOG: IconSettings,
  NAVER_CAFE: IconSettings,
  // 글로벌 SNS (P3-a 추가)
  WEIBO: IconSettings,
  XIAOHONGSHU: IconSettings,
  VK: IconSettings,
  LINE: IconMessage,
  WHATSAPP: IconBrandWhatsapp,
  PINTEREST: IconBrandPinterest,
  DOUYIN: IconBrandTiktok,
  LINKEDIN: IconBrandLinkedin,
  // 블로그
  TISTORY: IconSettings,
  WORDPRESS: IconBrandWordpress,
  // HTTP-only API 채널 (P3-g 추가)
  TELEGRAM: IconBrandTelegram,
  // Discord (Phase 5 — webhook URL 만으로 발행)
  DISCORD: IconSettings,
};

const REGION_OPTIONS = [
  { value: 'korea',          label: '🇰🇷 한국 (Korea)' },
  { value: 'usa',            label: '🇺🇸 미국 (USA)' },
  { value: 'japan',          label: '🇯🇵 일본 (Japan)' },
  { value: 'china',          label: '🇨🇳 중국 (China)' },
  { value: 'europe',         label: '🇪🇺 유럽 (Europe)' },
  { value: 'latam',          label: '🌎 중남미 (LATAM)' },
  { value: 'middle_east',    label: '🌍 중동 (Middle East)' },
  { value: 'africa',         label: '🌍 아프리카' },
  { value: 'india',          label: '🇮🇳 인도' },
  { value: 'southeast_asia', label: '🌏 동남아' },
  { value: 'russia',         label: '🇷🇺 러시아' },
  { value: 'oceania',        label: '🇦🇺 오세아니아' },
];

const LANGUAGE_OPTIONS = [
  { value: 'ko', label: '한국어' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'zh', label: '中文' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'ru', label: 'Русский' },
  { value: 'ar', label: 'العربية' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'id', label: 'Indonesia' },
  { value: 'th', label: 'ไทย' },
  { value: 'vi', label: 'Tiếng Việt' },
];

// region 선택 시 자동 추천 언어 (translator.ts REGION_LANGUAGES 와 1:1)
const REGION_DEFAULT_LANG: Record<string, string> = {
  korea: 'ko', usa: 'en', japan: 'ja', china: 'zh',
  europe: 'en', latam: 'es', middle_east: 'ar', africa: 'en',
  india: 'hi', southeast_asia: 'id', russia: 'ru', oceania: 'en',
};

export default function ChannelsClient({ initialChannels }: { initialChannels: MarketingChannel[] }) {
  const [channels, setChannels] = useState(initialChannels);
  const [opened, setOpened] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      type: 'INSTAGRAM' as ChannelType,
      accountName: '',
      region: 'korea',
      language: 'ko',
      username: '',
      password: '',
      apiKey: '',
      apiSecret: '',
      smtpHost: '',
      smtpPort: '',
      cafeId: '',
      menuId: '',
      pageId: '',
      // Telegram (P3-g)
      botToken: '',
      chatId: '',
      // WordPress (P4-a)
      siteUrl: '',
      appPassword: '',
      // Discord (Phase 5 — webhook URL only)
      webhookUrl: '',
      discordUsername: '',
      // LinkedIn (Phase 6 — access token + optional URN)
      linkedinAccessToken: '',
      linkedinAuthorUrn: '',
      // X / Twitter (Phase 6 — OAuth 2.0 user access token)
      xAccessToken: '',
      xRefreshToken: '',
      xClientId: '',
    },
  });

  // region 변경 시 추천 언어로 자동 설정 (사용자가 명시적으로 다른 언어 선택 안 했으면)
  const handleRegionChange = (v: string | null) => {
    if (!v) return;
    form.setFieldValue('region', v);
    const recommended = REGION_DEFAULT_LANG[v];
    if (recommended) form.setFieldValue('language', recommended);
  };

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
      } else if (values.type === 'FACEBOOK') {
        credentials.username = values.username;
        credentials.password = values.password;
        credentials.pageId = values.pageId;
      } else if (values.type === 'TELEGRAM') {
        credentials.botToken = values.botToken;
        credentials.chatId = values.chatId;
      } else if (values.type === 'WORDPRESS') {
        credentials.siteUrl = values.siteUrl;
        credentials.username = values.username;
        credentials.appPassword = values.appPassword;
      } else if (values.type === 'DISCORD') {
        credentials.webhookUrl = values.webhookUrl;
        if (values.discordUsername) credentials.username = values.discordUsername;
      } else if (values.type === 'LINKEDIN') {
        credentials.accessToken = values.linkedinAccessToken;
        if (values.linkedinAuthorUrn) credentials.authorUrn = values.linkedinAuthorUrn;
      } else if (values.type === 'X') {
        credentials.accessToken = values.xAccessToken;
        if (values.xRefreshToken) credentials.refreshToken = values.xRefreshToken;
        if (values.xClientId) credentials.clientId = values.xClientId;
      } else {
        credentials.username = values.username;
        credentials.password = values.password;
      }

      const newChannel = await createChannel({
        type: values.type,
        accountName: values.accountName,
        region: values.region,
        language: values.language,
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
              <Group mt="xs" gap="xs">
                <Badge variant="light" color={channel.status === 'ACTIVE' ? 'green' : 'orange'}>
                  {channel.type}
                </Badge>
                <Badge variant="dot" color={channel.status === 'ACTIVE' ? 'green' : 'yellow'}>
                  {channel.status}
                </Badge>
                {(channel as any).region && (
                  <Badge variant="outline" color="blue" size="sm">
                    {REGION_OPTIONS.find(r => r.value === (channel as any).region)?.label.split(' ')[0] || (channel as any).region}
                    {' · '}
                    {(channel as any).language?.toUpperCase()}
                  </Badge>
                )}
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
              searchable
              {...form.getInputProps('type')}
            />
            <TextInput label="계정 별명" placeholder="내 인스타 계정 1" required {...form.getInputProps('accountName')} />
            <Group grow>
              <Select
                label="지역"
                description="발행 시간대 + 자동 언어 매핑"
                data={REGION_OPTIONS}
                searchable
                value={form.values.region}
                onChange={handleRegionChange}
              />
              <Select
                label="발행 언어"
                description="이 채널에 게시될 본문 언어 (자동 번역됨)"
                data={LANGUAGE_OPTIONS}
                searchable
                {...form.getInputProps('language')}
              />
            </Group>
            
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
            ) : form.values.type === 'TELEGRAM' ? (
              <>
                <TextInput
                  label="Bot Token"
                  type="password"
                  description={<>BotFather (<Anchor href="https://t.me/BotFather" target="_blank" rel="noreferrer" size="xs">@BotFather <IconExternalLink size={10} /></Anchor>) → /newbot → Bot Token 받기</>}
                  placeholder="123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                  {...form.getInputProps('botToken')}
                />
                <TextInput
                  label="Channel/Chat ID"
                  description="공개 채널: @my_channel · 비공개 채널/그룹: -100xxx (api.telegram.org/bot<TOKEN>/getUpdates 로 확인)"
                  placeholder="@my_channel 또는 -1001234567890"
                  {...form.getInputProps('chatId')}
                />
              </>
            ) : form.values.type === 'WORDPRESS' ? (
              <>
                <TextInput
                  label="사이트 URL"
                  description="wp-json REST API 가 활성화된 워드프레스 사이트 (5.6+). https:// 자동 보정"
                  placeholder="https://myblog.com 또는 https://myblog.wordpress.com"
                  {...form.getInputProps('siteUrl')}
                />
                <TextInput
                  label="사용자 이름"
                  placeholder="admin"
                  {...form.getInputProps('username')}
                />
                <TextInput
                  label="Application Password"
                  type="password"
                  description={<>관리자 → 사용자 → 프로필 → "Application Passwords" → 24자 토큰 (예: <code>abcd 1234 efgh 5678 ijkl 9012</code>). <Anchor href="https://wordpress.org/documentation/article/application-passwords/" target="_blank" rel="noreferrer" size="xs">발급 가이드 <IconExternalLink size={10} /></Anchor></>}
                  placeholder="abcd 1234 efgh 5678 ijkl 9012"
                  {...form.getInputProps('appPassword')}
                />
              </>
            ) : form.values.type === 'DISCORD' ? (
              <>
                <TextInput
                  label="Webhook URL"
                  type="password"
                  description={<>서버 → 채널 설정 → 연동 → 웹후크 → 새 웹후크 → "웹후크 URL 복사". <Anchor href="https://support.discord.com/hc/ko/articles/228383668" target="_blank" rel="noreferrer" size="xs">발급 가이드 <IconExternalLink size={10} /></Anchor></>}
                  placeholder="https://discord.com/api/webhooks/123.../abc..."
                  {...form.getInputProps('webhookUrl')}
                />
                <TextInput
                  label="발신자명 (선택)"
                  description="비워두면 Discord 웹후크 기본 이름 사용"
                  placeholder="마케팅봇"
                  {...form.getInputProps('discordUsername')}
                />
              </>
            ) : form.values.type === 'LINKEDIN' ? (
              <>
                <TextInput
                  label="Access Token"
                  type="password"
                  description={<>LinkedIn Developer Portal → 앱 생성 → OAuth 2.0 → Token Generator (60일 유효). <Anchor href="https://www.linkedin.com/developers/tools/oauth/token-generator" target="_blank" rel="noreferrer" size="xs">발급 가이드 <IconExternalLink size={10} /></Anchor>. r_liteprofile + w_member_social scope 필수.</>}
                  placeholder="AQXa..."
                  {...form.getInputProps('linkedinAccessToken')}
                />
                <TextInput
                  label="Author URN (선택)"
                  description={<>비워두면 자동 추출 (개인 계정). 회사 페이지 발행 시 <code>urn:li:organization:1234567</code> 형식으로 입력.</>}
                  placeholder="urn:li:person:abc123 또는 urn:li:organization:1234567"
                  {...form.getInputProps('linkedinAuthorUrn')}
                />
              </>
            ) : form.values.type === 'X' ? (
              <>
                <TextInput
                  label="Access Token"
                  type="password"
                  description={<>X Developer Portal → 앱 생성 → User authentication settings → OAuth 2.0 → Token Generator. scope: tweet.write users.read offline.access. <Anchor href="https://developer.x.com" target="_blank" rel="noreferrer" size="xs">발급 가이드 <IconExternalLink size={10} /></Anchor>. ⚠️ Free tier 월 1500 tweet 한도</>}
                  placeholder="b2QwS..."
                  {...form.getInputProps('xAccessToken')}
                />
                <TextInput
                  label="Refresh Token (선택, 자동 갱신용)"
                  type="password"
                  description="offline.access scope 로 발급 시 함께 받음. 만료 시 자동 갱신 가능."
                  placeholder=""
                  {...form.getInputProps('xRefreshToken')}
                />
                <TextInput
                  label="Client ID (선택, 자동 갱신용)"
                  description="OAuth 2.0 Client ID. refresh token 갱신 시 필수."
                  placeholder=""
                  {...form.getInputProps('xClientId')}
                />
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
                {form.values.type === 'FACEBOOK' && (
                  <TextInput 
                    label="페이지 ID (옵션)" 
                    placeholder="비워두면 개인 타임라인" 
                    description="페이지 URL의 facebook.com/<pageId> 부분"
                    {...form.getInputProps('pageId')} 
                  />
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
