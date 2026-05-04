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
  IconBrandWhatsapp, IconBrandWordpress, IconExternalLink, IconBrandDiscord,
  IconBrandLine, IconBrandWeibo, IconBrandVk, IconBrandKakoTalk,
  IconCheck, IconAlertCircle, IconRefresh, IconLoader, IconClock
} from '@tabler/icons-react';
import { Anchor } from '@mantine/core';
import { createChannel, deleteChannel, verifyChannelConnection } from '@/app/actions/channelActions';
import { ChannelType, MarketingChannel } from '@prisma/client';

const CHANNEL_ICONS: Record<string, any> = {
  // 한국·기존
  INSTAGRAM: IconBrandInstagram,
  FACEBOOK: IconBrandFacebook,
  X: IconBrandX,
  TIKTOK: IconBrandTiktok,
  YOUTUBE: IconBrandYoutube,
  THREADS: IconBrandThreads,
  KAKAO: IconBrandKakoTalk,
  EMAIL: IconMail,
  SMS: IconMessage,
  NAVER_BLOG: IconSettings, // tabler 에 네이버 브랜드 아이콘 없음
  NAVER_CAFE: IconSettings,
  // 글로벌 SNS
  WEIBO: IconBrandWeibo,
  XIAOHONGSHU: IconSettings, // 샤오훙슈 아이콘 없음
  VK: IconBrandVk,
  LINE: IconBrandLine,
  WHATSAPP: IconBrandWhatsapp,
  PINTEREST: IconBrandPinterest,
  DOUYIN: IconBrandTiktok,
  LINKEDIN: IconBrandLinkedin,
  // 블로그
  TISTORY: IconSettings, // tabler 에 티스토리 브랜드 아이콘 없음

  WORDPRESS: IconBrandWordpress,
  // HTTP-only API
  TELEGRAM: IconBrandTelegram,
  DISCORD: IconBrandDiscord,
};

// 채널별 브랜드 컬러 (카드 좌측 보더 + 아이콘 배경)
const CHANNEL_BRAND_COLORS: Record<string, string> = {
  INSTAGRAM: 'pink', FACEBOOK: 'blue', X: 'dark', TIKTOK: 'dark',
  YOUTUBE: 'red', THREADS: 'dark', KAKAO: 'yellow', EMAIL: 'gray',
  SMS: 'gray', NAVER_BLOG: 'green', NAVER_CAFE: 'green',
  WEIBO: 'red', XIAOHONGSHU: 'red', VK: 'blue', LINE: 'green',
  WHATSAPP: 'green', PINTEREST: 'red', DOUYIN: 'pink',
  LINKEDIN: 'blue', TISTORY: 'orange', WORDPRESS: 'gray',
  TELEGRAM: 'cyan', DISCORD: 'indigo',
};

// 채널별 한국어 라벨 (UI 노출용)
const CHANNEL_LABELS: Record<string, string> = {
  INSTAGRAM: '인스타그램', FACEBOOK: '페이스북', X: 'X (트위터)',
  TIKTOK: '틱톡', YOUTUBE: '유튜브', THREADS: '스레드',
  KAKAO: '카카오톡', EMAIL: '이메일', SMS: '문자',
  NAVER_BLOG: '네이버 블로그', NAVER_CAFE: '네이버 카페',
  WEIBO: '웨이보', XIAOHONGSHU: '샤오훙슈', VK: 'VK',
  LINE: '라인', WHATSAPP: '왓츠앱', PINTEREST: '핀터레스트',
  DOUYIN: '도우인', LINKEDIN: '링크드인', TISTORY: '티스토리',
  WORDPRESS: '워드프레스', TELEGRAM: '텔레그램', DISCORD: '디스코드',
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
  // 채널별 검증 진행 상태 (UI loading spinner)
  const [verifying, setVerifying] = useState<Record<string, boolean>>({});

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

      // 1차 알림: 추가 완료
      const channelLabel = CHANNEL_LABELS[newChannel.type] || newChannel.type;
      notifications.show({
        id: `add-${newChannel.id}`,
        title: `✅ ${channelLabel} 채널 추가됨`,
        message: '연동 상태 확인 중...',
        color: 'blue',
        loading: true,
        autoClose: false,
        withCloseButton: false,
      });

      // 2차: 백그라운드 verify 호출 → 결과 반영
      runVerify(newChannel.id, true);
    } catch (error: any) {
      notifications.show({
        title: '오류',
        message: error?.message || '채널 추가 중 실패했습니다.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * 채널 연동 검증 (수동 재검증 + 추가 직후 자동).
   * fromAdd=true 면 위에서 띄운 loading notification 을 update 로 마무리.
   */
  const runVerify = async (channelId: string, fromAdd = false) => {
    setVerifying((s) => ({ ...s, [channelId]: true }));
    try {
      const r = await verifyChannelConnection(channelId);
      const ch = channels.find((c) => c.id === channelId);
      const label = ch ? (CHANNEL_LABELS[ch.type] || ch.type) : '채널';

      // 카드 status 즉시 갱신 (서버는 이미 갱신됨, UI만 sync)
      if (r.newStatus) {
        setChannels((prev) => prev.map((c) =>
          c.id === channelId ? { ...c, status: r.newStatus as any } : c
        ));
      }

      const notifId = fromAdd ? `add-${channelId}` : `verify-${channelId}`;
      if (r.ok && r.newStatus === 'ACTIVE') {
        notifications.update({
          id: notifId,
          title: `✅ ${label} 연동 완료`,
          message: r.detail || '연동이 정상 확인되었습니다.',
          color: 'teal',
          icon: <IconCheck size={18} />,
          loading: false,
          autoClose: 5000,
          withCloseButton: true,
        });
      } else if (r.newStatus === 'PENDING_AUTH') {
        notifications.update({
          id: notifId,
          title: `⏳ ${label} 에이전트 대기`,
          message: r.detail || '데스크톱 에이전트가 첫 발행 시 검증합니다.',
          color: 'orange',
          icon: <IconClock size={18} />,
          loading: false,
          autoClose: 7000,
          withCloseButton: true,
        });
      } else {
        notifications.update({
          id: notifId,
          title: `⚠️ ${label} 연동 실패`,
          message: r.error || '자격증명을 다시 확인하세요.',
          color: 'red',
          icon: <IconAlertCircle size={18} />,
          loading: false,
          autoClose: 8000,
          withCloseButton: true,
        });
      }
    } catch (e: any) {
      notifications.show({
        title: '연동 검증 오류',
        message: e?.message || '검증 중 오류 발생',
        color: 'red',
      });
    } finally {
      setVerifying((s) => ({ ...s, [channelId]: false }));
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

      {channels.length === 0 && (
        <Card withBorder p="xl" radius="md" bg="var(--mantine-color-default-hover)">
          <Stack gap="md" align="center" py="xl">
            <div style={{ fontSize: 48 }}>🚀</div>
            <div style={{ textAlign: 'center' }}>
              <Text fw={800} size="lg">아직 연결된 마케팅 채널이 없어요</Text>
              <Text size="sm" c="dimmed" mt={4}>
                가장 인기 있는 <strong>인스타그램</strong>이나 <strong>틱톡</strong>으로 시작해보세요. 5분이면 완료!
              </Text>
            </div>
            <Group gap="xs">
              <Button
                leftSection={<IconBrandInstagram size={18} />}
                onClick={() => { form.setFieldValue('type', 'INSTAGRAM' as any); setOpened(true); }}
                color="pink"
                variant="gradient"
                gradient={{ from: 'pink', to: 'orange', deg: 45 }}
              >
                인스타그램 추가
              </Button>
              <Button
                leftSection={<IconBrandTiktok size={18} />}
                onClick={() => { form.setFieldValue('type', 'TIKTOK' as any); setOpened(true); }}
                color="dark"
              >
                틱톡 추가
              </Button>
              <Button
                leftSection={<IconPlus size={16} />}
                onClick={() => setOpened(true)}
                variant="light"
              >
                다른 채널 보기
              </Button>
            </Group>
            <Text size="xs" c="dimmed" mt="sm">
              인스타·틱톡·페이스북·유튜브·X 등 <strong>22개 채널</strong> 지원
            </Text>
          </Stack>
        </Card>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        {channels.map((channel) => {
          const Icon = CHANNEL_ICONS[channel.type] || IconSettings;
          const brandColor = CHANNEL_BRAND_COLORS[channel.type] || 'gray';
          const label = CHANNEL_LABELS[channel.type] || channel.type;
          const isVerifying = !!verifying[channel.id];
          // 상태 라벨/색
          const statusInfo: Record<string, { label: string; color: string; icon: any }> = {
            ACTIVE: { label: '연동 완료', color: 'teal', icon: IconCheck },
            PENDING_AUTH: { label: '에이전트 대기', color: 'orange', icon: IconClock },
            ERROR: { label: '연동 실패', color: 'red', icon: IconAlertCircle },
            PAUSED: { label: '일시정지', color: 'gray', icon: IconClock },
          };
          const s = statusInfo[channel.status] || { label: channel.status, color: 'gray', icon: IconClock };
          const StatusIcon = s.icon;

          return (
            <Card
              key={channel.id}
              withBorder
              padding="lg"
              radius="md"
              style={{ borderLeft: `4px solid var(--mantine-color-${brandColor}-${brandColor === 'dark' ? '7' : '6'})` }}
            >
              <Group justify="space-between" mb="xs" wrap="nowrap">
                <Group gap="sm" wrap="nowrap">
                  {/* 컬러 박스 안에 흰색 아이콘 */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: `var(--mantine-color-${brandColor}-${brandColor === 'dark' ? '8' : '6'})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={24} stroke={1.7} color="white" />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Text size="xs" c="dimmed" fw={600} truncate>{label}</Text>
                    <Text fw={700} size="md" truncate>{channel.accountName}</Text>
                  </div>
                </Group>
                <Menu position="bottom-end" shadow="md" withinPortal>
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray">
                      <IconDotsVertical size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={isVerifying ? <IconLoader size={14} /> : <IconRefresh size={14} />}
                      onClick={() => runVerify(channel.id)}
                      disabled={isVerifying}
                    >
                      {isVerifying ? '검증 중...' : '연동 다시 확인'}
                    </Menu.Item>
                    <Menu.Item leftSection={<IconEdit size={14} />}>편집</Menu.Item>
                    <Menu.Divider />
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

              <Group mt="md" gap="xs">
                <Badge
                  variant={channel.status === 'ACTIVE' ? 'filled' : 'light'}
                  color={s.color}
                  leftSection={<StatusIcon size={10} />}
                >
                  {s.label}
                </Badge>
                {(channel as any).region && (
                  <Badge variant="dot" color="gray" size="sm">
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
                label="이 채널에 게시될 언어 (자동번역)"
                description="원본과 다르면 DeepL/AI가 자동으로 번역해서 발행합니다"
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
