'use client';

import {
    Stack, Text, Group, Box, Paper, Avatar, Image, Badge, ScrollArea, Divider
} from '@mantine/core';
import {
    IconBrandInstagram, IconBrandFacebook, IconBrandX, IconBrandTiktok,
    IconBrandYoutube, IconBrandThreads, IconBrandLinkedin, IconBrandTelegram,
    IconBrandWordpress, IconBrandDiscord, IconHeart, IconMessageCircle, IconShare3
} from '@tabler/icons-react';

// 채널 한도 (caption.ts PLATFORM_FORMATS 와 1:1 동기)
const CHANNEL_LIMITS: Record<string, { maxChars: number; recommendedHashtags: number; brand: string }> = {
    INSTAGRAM:  { maxChars: 2200, recommendedHashtags: 20, brand: 'pink' },
    FACEBOOK:   { maxChars: 5000, recommendedHashtags: 5, brand: 'blue' },
    X:          { maxChars: 280,  recommendedHashtags: 3, brand: 'dark' },
    TIKTOK:     { maxChars: 2200, recommendedHashtags: 10, brand: 'dark' },
    YOUTUBE:    { maxChars: 5000, recommendedHashtags: 15, brand: 'red' },
    THREADS:    { maxChars: 500,  recommendedHashtags: 5, brand: 'dark' },
    LINKEDIN:   { maxChars: 3000, recommendedHashtags: 5, brand: 'blue' },
    TELEGRAM:   { maxChars: 4096, recommendedHashtags: 5, brand: 'cyan' },
    DISCORD:    { maxChars: 2000, recommendedHashtags: 0, brand: 'indigo' },
    WORDPRESS:  { maxChars: 50000, recommendedHashtags: 10, brand: 'gray' },
    NAVER_BLOG: { maxChars: 50000, recommendedHashtags: 15, brand: 'green' },
    NAVER_CAFE: { maxChars: 5000, recommendedHashtags: 5, brand: 'green' },
    KAKAO:      { maxChars: 1000, recommendedHashtags: 3, brand: 'yellow' },
    PINTEREST:  { maxChars: 500,  recommendedHashtags: 8, brand: 'red' },
    LINE:       { maxChars: 1000, recommendedHashtags: 3, brand: 'green' },
    WHATSAPP:   { maxChars: 1024, recommendedHashtags: 3, brand: 'green' },
};

const CHANNEL_ICONS: Record<string, any> = {
    INSTAGRAM: IconBrandInstagram, FACEBOOK: IconBrandFacebook, X: IconBrandX,
    TIKTOK: IconBrandTiktok, YOUTUBE: IconBrandYoutube, THREADS: IconBrandThreads,
    LINKEDIN: IconBrandLinkedin, TELEGRAM: IconBrandTelegram,
    WORDPRESS: IconBrandWordpress, DISCORD: IconBrandDiscord,
};

const CHANNEL_LABELS: Record<string, string> = {
    INSTAGRAM: '인스타그램', FACEBOOK: '페이스북', X: 'X (트위터)',
    TIKTOK: '틱톡', YOUTUBE: '유튜브', THREADS: '스레드',
    LINKEDIN: '링크드인', TELEGRAM: '텔레그램', DISCORD: '디스코드',
    WORDPRESS: '워드프레스', NAVER_BLOG: '네이버 블로그',
    NAVER_CAFE: '네이버 카페', KAKAO: '카카오톡',
};

interface PreviewChannel {
    id: string;
    type: string;
    accountName: string;
    region?: string | null;
    language?: string | null;
}

interface MediaItem {
    type: 'image' | 'video';
    url?: string;
    dataUrl?: string;
}

interface Props {
    channels: PreviewChannel[];
    content: string;
    media: MediaItem[];
    /** 번역 미리보기 (channelId → translated text). 없으면 content 그대로 표시. */
    translations?: Record<string, { language: string; translated: string; sameAsSource: boolean }>;
    /** 번역 진행 중 여부 */
    translating?: boolean;
}

export default function ChannelPreview({ channels, content, media, translations, translating }: Props) {
    if (channels.length === 0) {
        return (
            <Paper withBorder p="lg" radius="md" bg="var(--mantine-color-default-hover)">
                <Stack gap={4} align="center" py="xl">
                    <div style={{ fontSize: 36, opacity: 0.5 }}>👀</div>
                    <Text size="sm" fw={600} c="dimmed">채널을 선택하면</Text>
                    <Text size="xs" c="dimmed">실시간 미리보기가 여기에 표시됩니다</Text>
                </Stack>
            </Paper>
        );
    }

    return (
        <Stack gap="md">
            <Group gap={6}>
                <Text size="sm" fw={700}>📱 실시간 미리보기</Text>
                <Badge size="xs" color="brand" variant="light">{channels.length}개 채널</Badge>
            </Group>

            {channels.map(channel => {
                const limit = CHANNEL_LIMITS[channel.type] || { maxChars: 5000, recommendedHashtags: 5, brand: 'gray' };
                const Icon = CHANNEL_ICONS[channel.type];
                const label = CHANNEL_LABELS[channel.type] || channel.type;
                // 번역된 본문 사용 (있으면). 없으면 원본 content
                const tr = translations?.[channel.id];
                const displayContent = tr ? tr.translated : content;
                const isTranslated = tr && !tr.sameAsSource;
                const exceeds = displayContent.length > limit.maxChars;
                const ratio = Math.min(100, (displayContent.length / limit.maxChars) * 100);

                return (
                    <Paper key={channel.id} withBorder radius="md" p={0} style={{
                        overflow: 'hidden',
                        borderTop: `3px solid var(--mantine-color-${limit.brand}-${limit.brand === 'dark' ? '7' : '6'})`,
                    }}>
                        {/* 채널 헤더 */}
                        <Group justify="space-between" p="xs" style={{
                            background: `var(--mantine-color-${limit.brand}-0)`,
                        }}>
                            <Group gap={6}>
                                {Icon ? <Icon size={16} stroke={2} /> : null}
                                <Text size="xs" fw={700}>{label}</Text>
                                <Text size="10px" c="dimmed">@{channel.accountName}</Text>
                                {isTranslated && (
                                    <Badge size="xs" color="violet" variant="light">
                                        🌐 {tr.language.toUpperCase()} 번역
                                    </Badge>
                                )}
                                {translating && tr && !tr.sameAsSource && (
                                    <Badge size="xs" color="gray" variant="dot">번역 중...</Badge>
                                )}
                            </Group>
                            <Badge size="xs" color={exceeds ? 'red' : ratio > 80 ? 'orange' : 'gray'} variant="light">
                                {displayContent.length} / {limit.maxChars.toLocaleString()}
                            </Badge>
                        </Group>

                        {/* 모의 게시물 */}
                        <PreviewByType
                            channelType={channel.type}
                            accountName={channel.accountName}
                            content={displayContent}
                            media={media}
                            exceeds={exceeds}
                            limit={limit.maxChars}
                        />

                        {/* 한도 progress bar */}
                        <Box style={{ height: 3, background: 'var(--mantine-color-default-border)' }}>
                            <Box style={{
                                width: `${ratio}%`,
                                height: '100%',
                                background: exceeds ? 'var(--mantine-color-red-6)' : ratio > 80 ? 'var(--mantine-color-orange-5)' : 'var(--mantine-color-teal-5)',
                                transition: 'width 0.2s',
                            }} />
                        </Box>
                        {exceeds && (
                            <Text size="10px" c="red.7" p={6} fw={600}>
                                ⚠️ {content.length - limit.maxChars}자 초과 — 발행 시 잘림
                            </Text>
                        )}
                    </Paper>
                );
            })}
        </Stack>
    );
}

function PreviewByType({ channelType, accountName, content, media, exceeds, limit }: {
    channelType: string;
    accountName: string;
    content: string;
    media: MediaItem[];
    exceeds: boolean;
    limit: number;
}) {
    const truncated = exceeds ? content.slice(0, limit) + '...' : content;
    const firstImage = media.find(m => m.type === 'image');
    const firstVideo = media.find(m => m.type === 'video');

    // ── Instagram 스타일 ──
    if (channelType === 'INSTAGRAM' || channelType === 'TIKTOK' || channelType === 'THREADS') {
        return (
            <Box>
                <Group p="xs" gap="xs">
                    <Avatar size="xs" radius="xl" color="pink">{accountName.charAt(0).toUpperCase()}</Avatar>
                    <Text size="11px" fw={700}>{accountName}</Text>
                </Group>
                {firstImage ? (
                    <Box style={{ aspectRatio: '1', background: '#000', overflow: 'hidden' }}>
                        <Image src={firstImage.url || firstImage.dataUrl} alt="" h="100%" fit="cover" />
                    </Box>
                ) : firstVideo ? (
                    <Box style={{ aspectRatio: '1', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                        <Text size="xs">▶ 동영상</Text>
                    </Box>
                ) : (
                    <Box style={{ aspectRatio: '1', background: 'linear-gradient(135deg, #f3e7ff, #ffd6e0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Text size="11px" c="dimmed">미디어 없음</Text>
                    </Box>
                )}
                <Group p="xs" gap="md">
                    <IconHeart size={18} stroke={2} />
                    <IconMessageCircle size={18} stroke={2} />
                    <IconShare3 size={18} stroke={2} />
                </Group>
                <Box px="xs" pb="xs">
                    <Text size="10px" style={{ whiteSpace: 'pre-wrap' }} lineClamp={6}>
                        <Text span fw={700}>{accountName}</Text> {truncated || <Text span c="dimmed">본문이 비어있습니다</Text>}
                    </Text>
                </Box>
            </Box>
        );
    }

    // ── X / Twitter 스타일 ──
    if (channelType === 'X') {
        return (
            <Box p="sm">
                <Group gap="xs" align="flex-start">
                    <Avatar size="md" radius="xl" color="dark">{accountName.charAt(0).toUpperCase()}</Avatar>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                        <Group gap={4}>
                            <Text size="sm" fw={700}>{accountName}</Text>
                            <Text size="xs" c="dimmed">@{accountName.toLowerCase()} · 1m</Text>
                        </Group>
                        <Text size="xs" mt={2} style={{ whiteSpace: 'pre-wrap' }}>
                            {truncated || <Text span c="dimmed">본문이 비어있습니다</Text>}
                        </Text>
                        {firstImage && (
                            <Image src={firstImage.url || firstImage.dataUrl} alt="" radius="md" mt="xs" mah={200} fit="cover" />
                        )}
                    </Box>
                </Group>
            </Box>
        );
    }

    // ── LinkedIn 스타일 ──
    if (channelType === 'LINKEDIN') {
        return (
            <Box p="sm">
                <Group gap="xs" mb="xs">
                    <Avatar size="md" radius="xl" color="blue">{accountName.charAt(0).toUpperCase()}</Avatar>
                    <Box>
                        <Text size="sm" fw={700}>{accountName}</Text>
                        <Text size="10px" c="dimmed">방금 전 · 🌐</Text>
                    </Box>
                </Group>
                <Text size="xs" style={{ whiteSpace: 'pre-wrap' }} lineClamp={8}>
                    {truncated || <Text span c="dimmed">본문이 비어있습니다</Text>}
                </Text>
                {firstImage && (
                    <Image src={firstImage.url || firstImage.dataUrl} alt="" radius="sm" mt="xs" mah={200} fit="cover" />
                )}
                <Group gap="md" mt="xs" pt="xs" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
                    <Text size="10px" c="dimmed">👍 좋아요</Text>
                    <Text size="10px" c="dimmed">💬 댓글</Text>
                    <Text size="10px" c="dimmed">🔄 다시 게시</Text>
                </Group>
            </Box>
        );
    }

    // ── Discord 스타일 ──
    if (channelType === 'DISCORD') {
        return (
            <Box p="sm" style={{ background: '#36393f', color: 'white', fontFamily: 'sans-serif' }}>
                <Group gap="xs" align="flex-start" wrap="nowrap">
                    <Avatar size="sm" radius="xl" color="indigo">B</Avatar>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                        <Group gap={6}>
                            <Text size="xs" fw={700} c="white">{accountName}</Text>
                            <Badge size="xs" color="indigo" variant="filled" radius="sm">BOT</Badge>
                            <Text size="9px" c="gray.5">오늘 오전 9:00</Text>
                        </Group>
                        {firstImage ? (
                            <Box mt={4} p="xs" style={{ borderLeft: '4px solid #5865F2', background: '#2f3136', borderRadius: 4 }}>
                                <Text size="xs" c="white" style={{ whiteSpace: 'pre-wrap' }} lineClamp={5}>{truncated}</Text>
                                <Image src={firstImage.url || firstImage.dataUrl} alt="" radius="sm" mt={6} mah={180} fit="cover" />
                            </Box>
                        ) : (
                            <Text size="xs" c="white" mt={2} style={{ whiteSpace: 'pre-wrap' }} lineClamp={5}>
                                {truncated || <Text span c="gray.5">본문이 비어있습니다</Text>}
                            </Text>
                        )}
                    </Box>
                </Group>
            </Box>
        );
    }

    // ── Telegram 스타일 ──
    if (channelType === 'TELEGRAM') {
        return (
            <Box p="sm" style={{ background: '#dbe6f3' }}>
                <Box p="xs" style={{
                    background: 'white',
                    borderRadius: '0 12px 12px 12px',
                    maxWidth: '85%',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}>
                    {firstImage && (
                        <Image src={firstImage.url || firstImage.dataUrl} alt="" radius="sm" mb={6} mah={160} fit="cover" />
                    )}
                    <Text size="xs" c="dark" style={{ whiteSpace: 'pre-wrap' }} lineClamp={8}>
                        {truncated || <Text span c="dimmed">본문이 비어있습니다</Text>}
                    </Text>
                    <Text size="9px" c="dimmed" ta="right" mt={4}>9:00</Text>
                </Box>
            </Box>
        );
    }

    // ── 기본 (블로그/이메일/SMS 등) ──
    return (
        <Box p="sm">
            {firstImage && (
                <Image src={firstImage.url || firstImage.dataUrl} alt="" radius="sm" mb="xs" mah={140} fit="cover" />
            )}
            <Text size="xs" style={{ whiteSpace: 'pre-wrap' }} lineClamp={10}>
                {truncated || <Text span c="dimmed">본문이 비어있습니다</Text>}
            </Text>
        </Box>
    );
}
