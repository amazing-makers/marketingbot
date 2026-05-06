'use client';

import {
    Paper, Stack, Group, Text, Badge, Box, SimpleGrid, ThemeIcon, CopyButton, ActionIcon, Tooltip,
    Code, Button, Table, Anchor,
} from '@mantine/core';
import {
    IconUsers, IconCash, IconLink, IconCopy, IconCheck, IconBrandKakoTalk, IconBrandThreads, IconShare3, IconGift,
} from '@tabler/icons-react';
import dayjs from 'dayjs';

interface Info {
    code: string;
    referralUrl: string;
    referredCount: number;
    paidReferredCount: number;
}

interface Referral {
    id: string;
    emailMasked: string;
    name: string | null;
    plan: string;
    status: string;
    referredAt: string | null;
    isPaid: boolean;
}

export default function ReferClient({ info, referrals }: { info: Info; referrals: Referral[] }) {
    const shareText = `마케팅봇으로 SNS 자동 발행을 시작해보세요! 14일 무료 체험. 제 추천 링크: ${info.referralUrl}`;

    const handleKakao = () => {
        // 카카오톡 공유 — 실제로는 SDK 필요. 여기선 텍스트 복사 + 안내
        navigator.clipboard?.writeText(shareText);
        alert('공유 메시지가 복사되었어요! 카카오톡에 붙여넣기 하세요.');
    };

    const handleNativeShare = async () => {
        if (typeof navigator !== 'undefined' && (navigator as any).share) {
            try {
                await (navigator as any).share({
                    title: '마케팅봇',
                    text: shareText,
                    url: info.referralUrl,
                });
            } catch { /* user cancelled */ }
        } else {
            navigator.clipboard?.writeText(shareText);
            alert('공유 메시지가 복사되었어요!');
        }
    };

    return (
        <>
            {/* 핵심 카드 — 추천 링크 */}
            <Paper withBorder p="lg" radius="md" style={{
                background: 'linear-gradient(135deg, var(--mantine-color-violet-0), var(--mantine-color-pink-0))',
                borderColor: 'var(--mantine-color-violet-3)',
            }}>
                <Stack gap="md">
                    <Group gap={6}>
                        <IconGift size={20} color="var(--mantine-color-violet-6)" />
                        <Text fw={700}>내 추천 링크</Text>
                    </Group>
                    <Paper p="sm" radius="md" withBorder bg="var(--mantine-color-body)">
                        <Group gap="xs" wrap="wrap">
                            <Code style={{ flex: 1, fontSize: 13, padding: 8, wordBreak: 'break-all' }}>
                                {info.referralUrl}
                            </Code>
                            <CopyButton value={info.referralUrl}>
                                {({ copied, copy }) => (
                                    <Tooltip label={copied ? '복사됨' : '링크 복사'} withArrow>
                                        <Button
                                            color={copied ? 'teal' : 'violet'}
                                            leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                            onClick={copy}
                                        >
                                            {copied ? '복사됨' : '복사'}
                                        </Button>
                                    </Tooltip>
                                )}
                            </CopyButton>
                        </Group>
                    </Paper>
                    <Group gap="xs" wrap="wrap">
                        <Button
                            variant="light"
                            color="yellow"
                            leftSection={<IconBrandKakoTalk size={14} />}
                            onClick={handleKakao}
                        >
                            카톡으로 공유
                        </Button>
                        <Button
                            variant="light"
                            color="violet"
                            leftSection={<IconShare3 size={14} />}
                            onClick={handleNativeShare}
                        >
                            다른 앱으로 공유
                        </Button>
                        <Group gap={4}>
                            <Text size="xs" c="dimmed">또는 코드 직접 공유:</Text>
                            <CopyButton value={info.code}>
                                {({ copied, copy }) => (
                                    <Anchor onClick={copy} size="xs" fw={700}>
                                        {info.code} {copied && <IconCheck size={11} />}
                                    </Anchor>
                                )}
                            </CopyButton>
                        </Group>
                    </Group>
                </Stack>
            </Paper>

            {/* 통계 */}
            <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md">
                <Paper withBorder p="md" radius="md">
                    <Group gap={6} mb={4}>
                        <ThemeIcon size={28} radius="md" variant="light" color="violet">
                            <IconUsers size={16} />
                        </ThemeIcon>
                        <Text size="xs" c="dimmed" fw={600}>총 추천 가입</Text>
                    </Group>
                    <Text fw={800} size="20px">{info.referredCount}명</Text>
                </Paper>
                <Paper withBorder p="md" radius="md">
                    <Group gap={6} mb={4}>
                        <ThemeIcon size={28} radius="md" variant="light" color="teal">
                            <IconCash size={16} />
                        </ThemeIcon>
                        <Text size="xs" c="dimmed" fw={600}>유료 전환</Text>
                    </Group>
                    <Text fw={800} size="20px" c="teal.7">{info.paidReferredCount}명</Text>
                </Paper>
                <Paper withBorder p="md" radius="md">
                    <Group gap={6} mb={4}>
                        <ThemeIcon size={28} radius="md" variant="light" color="orange">
                            <IconGift size={16} />
                        </ThemeIcon>
                        <Text size="xs" c="dimmed" fw={600}>받은 트라이얼 보너스</Text>
                    </Group>
                    <Text fw={800} size="20px">{info.paidReferredCount * 7}일</Text>
                </Paper>
            </SimpleGrid>

            {/* 보상 안내 */}
            <Paper withBorder p="md" radius="md" bg="var(--mantine-color-default-hover)">
                <Group gap={6} mb={4}>
                    <IconGift size={16} color="var(--mantine-color-violet-6)" />
                    <Text fw={700} size="sm">보상 안내</Text>
                </Group>
                <Stack gap={4}>
                    <Text size="xs">• 친구가 내 링크로 가입하면 → 자동으로 추천 연결</Text>
                    <Text size="xs">• 친구가 <strong>유료 결제 시</strong> → 내 트라이얼 라이센스 7일 추가</Text>
                    <Text size="xs">• 추천 받은 친구도 14일 무료 체험으로 시작</Text>
                    <Text size="xs" c="dimmed" mt={4}>
                        ※ 사업자 파트너 (수수료 receive) 는 별도. <Anchor href="/dashboard/partner" size="xs">파트너 가입</Anchor> 참고.
                    </Text>
                </Stack>
            </Paper>

            {/* 추천 목록 */}
            <Paper withBorder p="md" radius="md">
                <Text fw={700} size="sm" mb="sm">추천 받은 친구 ({referrals.length})</Text>
                {referrals.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center" py="md">
                        아직 추천 가입자가 없어요. 위 링크를 공유해보세요!
                    </Text>
                ) : (
                    <Table.ScrollContainer minWidth={520}>
                        <Table>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>이메일</Table.Th>
                                    <Table.Th>이름</Table.Th>
                                    <Table.Th>플랜</Table.Th>
                                    <Table.Th>가입일</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {referrals.map(r => (
                                    <Table.Tr key={r.id}>
                                        <Table.Td><Text size="sm">{r.emailMasked}</Text></Table.Td>
                                        <Table.Td><Text size="sm">{r.name || '-'}</Text></Table.Td>
                                        <Table.Td>
                                            <Badge
                                                size="sm"
                                                variant="light"
                                                color={r.isPaid ? 'teal' : 'gray'}
                                            >
                                                {r.plan}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="xs" c="dimmed">
                                                {r.referredAt ? dayjs(r.referredAt).format('YYYY-MM-DD') : '-'}
                                            </Text>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>
                )}
            </Paper>
        </>
    );
}
