import { auth } from '@/auth';
import { getInvitationByToken } from '@/app/actions/invitationActions';
import { Container, Stack, Paper, Title, Text, Group, Badge, Button, Box, ThemeIcon, Anchor, Alert } from '@mantine/core';
import { IconUsersGroup, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';
import AcceptInviteClient from './AcceptInviteClient';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ token: string }>;
}

const ROLE_LABELS: Record<string, string> = {
    ADMIN: '관리자',
    MEMBER: '멤버',
    VIEWER: '뷰어 (읽기 전용)',
};

export default async function InvitePage({ params }: PageProps) {
    const { token } = await params;
    const session = await auth();

    const inv = await getInvitationByToken(token);

    return (
        <Box style={{ background: '#faf5ff', minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
            <Container size="sm">
                <Paper withBorder p="xl" radius="md" shadow="sm">
                    <Stack gap="md" align="center">
                        <ThemeIcon size={64} radius="xl" variant="light" color="violet">
                            <IconUsersGroup size={36} />
                        </ThemeIcon>

                        {!inv && (
                            <>
                                <Title order={3} ta="center">초대를 찾을 수 없습니다</Title>
                                <Text c="dimmed" ta="center" size="sm">
                                    링크가 잘못되었거나 이미 처리된 초대일 수 있어요.
                                </Text>
                                <Button component={Link} href="/dashboard" variant="light">
                                    대시보드로
                                </Button>
                            </>
                        )}

                        {inv && !inv.isValid && inv.reason === 'expired' && (
                            <>
                                <Title order={3} ta="center">⏰ 초대가 만료되었습니다</Title>
                                <Text c="dimmed" ta="center" size="sm">
                                    이 초대 링크는 더 이상 유효하지 않습니다. 초대한 분께 새 링크를 요청해주세요.
                                </Text>
                                <Button component={Link} href="/dashboard" variant="light">대시보드로</Button>
                            </>
                        )}

                        {inv && !inv.isValid && inv.reason === 'already_processed' && (
                            <>
                                <Title order={3} ta="center">이미 처리된 초대입니다</Title>
                                <Text c="dimmed" ta="center" size="sm">
                                    상태: {inv.status === 'ACCEPTED' ? '이미 수락됨' : inv.status === 'REVOKED' ? '취소됨' : inv.status}
                                </Text>
                                <Button component={Link} href="/dashboard" variant="light">대시보드로</Button>
                            </>
                        )}

                        {inv && inv.isValid && (
                            <>
                                <Stack gap={2} align="center">
                                    <Text size="xs" c="dimmed" fw={600}>워크스페이스 초대</Text>
                                    <Box
                                        style={{
                                            width: 56, height: 56, borderRadius: 12,
                                            background: inv.workspace.brandColor || '#7C3AED',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'white', fontWeight: 700, fontSize: 20,
                                            margin: '8px auto',
                                        }}
                                    >
                                        {inv.workspace.name.slice(0, 2).toUpperCase()}
                                    </Box>
                                    <Title order={3}>{inv.workspace.name}</Title>
                                    <Group gap={6} mt={4}>
                                        <Badge color="violet" variant="light">{ROLE_LABELS[inv.role] || inv.role}</Badge>
                                        <Text size="xs" c="dimmed">{inv.email} 으로 초대됨</Text>
                                    </Group>
                                </Stack>

                                {inv.message && (
                                    <Alert color="blue" variant="light" style={{ width: '100%' }}>
                                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{inv.message}</Text>
                                    </Alert>
                                )}

                                <Text size="xs" c="dimmed">만료: {dayjs(inv.expiresAt).format('YYYY-MM-DD HH:mm')}</Text>

                                {!session?.user && (
                                    <Stack gap="xs" align="center" w="100%">
                                        <Alert color="orange" variant="light" icon={<IconAlertCircle size={16} />} style={{ width: '100%' }}>
                                            <Text size="sm">
                                                먼저 로그인 또는 가입이 필요합니다. 가입은 초대받은 이메일(<strong>{inv.email}</strong>)로 진행해주세요.
                                            </Text>
                                        </Alert>
                                        <Group>
                                            <Button component={Link} href={`/login?callbackUrl=/invite/${token}`} variant="filled" color="violet">
                                                로그인
                                            </Button>
                                            <Anchor component={Link} href={`/register?callbackUrl=/invite/${token}`} size="sm">
                                                계정 만들기 →
                                            </Anchor>
                                        </Group>
                                    </Stack>
                                )}

                                {session?.user && session.user.email?.toLowerCase() !== inv.email.toLowerCase() && (
                                    <Stack gap="xs" align="center" w="100%">
                                        <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />} style={{ width: '100%' }}>
                                            <Text size="sm">
                                                현재 로그인 계정({session.user.email})이 초대받은 이메일({inv.email})과 일치하지 않습니다.
                                                다른 계정으로 다시 로그인해주세요.
                                            </Text>
                                        </Alert>
                                        <Button component={Link} href={`/api/auth/signout?callbackUrl=/invite/${token}`} variant="light">
                                            로그아웃하고 다시 로그인
                                        </Button>
                                    </Stack>
                                )}

                                {session?.user && session.user.email?.toLowerCase() === inv.email.toLowerCase() && (
                                    <AcceptInviteClient token={token} workspaceName={inv.workspace.name} />
                                )}
                            </>
                        )}
                    </Stack>
                </Paper>

                <Text size="xs" c="dimmed" ta="center" mt="md">
                    문제가 있으면 help@amakers.co.kr 로 문의해주세요.
                </Text>
            </Container>
        </Box>
    );
}
