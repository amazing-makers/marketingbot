'use client';

import {
    Box, UnstyledButton, Group, Avatar, Text, ActionIcon, Tooltip, Stack, Divider,
} from '@mantine/core';
import {
    IconChevronDown, IconChevronUp, IconUserPlus, IconX, IconLogout,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import {
    listSwitchableAccounts,
    switchToTrustedAccount,
    forgetTrustedAccount,
} from '@/app/actions/trustedDeviceActions';

interface SwitchableAccount {
    id: string;
    email: string;
    name: string | null;
}

interface CurrentUser {
    id?: string;
    email: string;
    name?: string | null;
}

/**
 * Phase 50 — 같은 PC 빠른 계정 전환 위젯.
 *
 * 이전 (Phase 39): localStorage 에 email 만 저장 → 전환 시 비밀번호 입력 필요.
 * 현재: server-side TrustedDevice token (httpOnly cookie + DB hashed) → 비번 없이 전환.
 *
 * cookie 가 없으면 listSwitchableAccounts() 가 빈 배열 반환 → "다른 계정 추가" 만 표시.
 */
export default function SidebarAccountSwitcher({ currentUser }: { currentUser: CurrentUser }) {
    const [accounts, setAccounts] = useState<SwitchableAccount[]>([]);
    const [expanded, setExpanded] = useState(false);
    const [switching, setSwitching] = useState<string | null>(null);

    useEffect(() => {
        listSwitchableAccounts()
            .then(setAccounts)
            .catch(() => setAccounts([]));
    }, [currentUser.email]);

    const handleSwitchTo = async (account: SwitchableAccount) => {
        if (account.email.toLowerCase() === currentUser.email.toLowerCase()) return;
        setSwitching(account.id);
        try {
            const r = await switchToTrustedAccount(account.id);
            if (r.ok) {
                // hard navigation — 새 세션 쿠키 반영 + 모든 RSC fresh fetch
                window.location.href = '/dashboard';
            } else {
                alert(r.error || '전환 실패 — 비밀번호로 다시 로그인해주세요.');
                await signOut({ redirect: false });
                window.location.href = `/login?email=${encodeURIComponent(account.email)}`;
            }
        } finally {
            setSwitching(null);
        }
    };

    // 기존 계정으로 로그인 — 로그인 성공 시 자동으로 trusted device 등록.
    const handleLoginAnother = async () => {
        await signOut({ redirect: false });
        window.location.href = '/login?add=1';
    };
    // 신규 계정 만들기 — 가입 성공 시 자동으로 trusted device 등록.
    const handleRegisterNew = async () => {
        await signOut({ redirect: false });
        window.location.href = '/register';
    };

    const handleRemove = async (account: SwitchableAccount, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (account.email.toLowerCase() === currentUser.email.toLowerCase()) return;
        await forgetTrustedAccount(account.id);
        setAccounts(prev => prev.filter(a => a.id !== account.id));
    };

    const handleLogout = () => {
        signOut({ callbackUrl: '/login' });
    };

    const initial = (currentUser.name || currentUser.email).charAt(0).toUpperCase();
    const otherAccounts = accounts.filter(a => a.email.toLowerCase() !== currentUser.email.toLowerCase());

    return (
        <Box style={{
            border: '1px solid var(--mantine-color-default-border)',
            borderRadius: 8,
            padding: 6,
            background: 'var(--mantine-color-default-hover)',
        }}>
            {/* 현재 계정 — 클릭하면 펼침 */}
            <UnstyledButton
                onClick={() => setExpanded(e => !e)}
                style={{ width: '100%', padding: 4, borderRadius: 6 }}
            >
                <Group gap={6} wrap="nowrap">
                    <Avatar radius="xl" size="sm" color="brand">{initial}</Avatar>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text size="xs" fw={700} truncate>
                            {currentUser.name || currentUser.email.split('@')[0]}
                        </Text>
                        <Text size="10px" c="dimmed" truncate>
                            {currentUser.email}
                        </Text>
                    </Box>
                    {otherAccounts.length > 0 && (
                        <Box style={{
                            background: 'var(--mantine-color-violet-6)',
                            color: 'white',
                            borderRadius: 8,
                            padding: '0 5px',
                            fontSize: 10,
                            fontWeight: 700,
                            minWidth: 16,
                            textAlign: 'center',
                            lineHeight: '14px',
                        }}>
                            +{otherAccounts.length}
                        </Box>
                    )}
                    {expanded
                        ? <IconChevronUp size={12} stroke={2} />
                        : <IconChevronDown size={12} stroke={2} />}
                </Group>
            </UnstyledButton>

            {expanded && (
                <Stack gap={2} mt={6}>
                    <Divider />

                    {/* 다른 계정 목록 */}
                    {otherAccounts.length > 0 && (
                        <>
                            <Text size="10px" c="dimmed" fw={600} px={6} pt={4}>
                                다른 계정으로 전환
                            </Text>
                            {otherAccounts.map(acc => {
                                const accInitial = (acc.name || acc.email).charAt(0).toUpperCase();
                                const isSwitching = switching === acc.id;
                                return (
                                    <UnstyledButton
                                        key={acc.id}
                                        onClick={() => handleSwitchTo(acc)}
                                        disabled={isSwitching}
                                        style={{ width: '100%', padding: 4, borderRadius: 6, opacity: isSwitching ? 0.5 : 1 }}
                                    >
                                        <Group gap={6} wrap="nowrap">
                                            <Avatar radius="xl" size="sm" color="gray">{accInitial}</Avatar>
                                            <Box style={{ flex: 1, minWidth: 0 }}>
                                                <Text size="xs" fw={500} truncate>
                                                    {acc.name || acc.email.split('@')[0]}
                                                </Text>
                                                <Text size="10px" c="dimmed" truncate>
                                                    {isSwitching ? '전환 중...' : acc.email}
                                                </Text>
                                            </Box>
                                            <Tooltip label="이 PC 에서 빠른 전환 끄기" withArrow>
                                                <ActionIcon
                                                    size="xs"
                                                    variant="subtle"
                                                    color="gray"
                                                    onClick={(e) => handleRemove(acc, e)}
                                                    aria-label={`${acc.email} 제거`}
                                                >
                                                    <IconX size={10} />
                                                </ActionIcon>
                                            </Tooltip>
                                        </Group>
                                    </UnstyledButton>
                                );
                            })}
                        </>
                    )}

                    {otherAccounts.length === 0 && (
                        <Text size="10px" c="dimmed" ta="center" py="xs">
                            저장된 다른 계정이 없어요
                        </Text>
                    )}

                    <Divider my={2} />

                    {/* 액션 */}
                    <UnstyledButton
                        onClick={handleLoginAnother}
                        style={{ width: '100%', padding: '6px 4px', borderRadius: 6 }}
                    >
                        <Group gap={6} wrap="nowrap">
                            <Box style={{
                                width: 28, height: 28,
                                borderRadius: '50%',
                                border: '1px dashed var(--mantine-color-violet-5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--mantine-color-violet-6)',
                            }}>
                                <IconUserPlus size={13} />
                            </Box>
                            <Text size="xs" fw={600} c="violet.7">+ 다른 계정 로그인</Text>
                        </Group>
                    </UnstyledButton>

                    <UnstyledButton
                        onClick={handleRegisterNew}
                        style={{ width: '100%', padding: '6px 4px', borderRadius: 6 }}
                    >
                        <Group gap={6} wrap="nowrap">
                            <Box style={{
                                width: 28, height: 28,
                                borderRadius: '50%',
                                border: '1px dashed var(--mantine-color-teal-5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--mantine-color-teal-7)',
                            }}>
                                <IconUserPlus size={13} />
                            </Box>
                            <Text size="xs" fw={600} c="teal.7">+ 새 계정 만들기</Text>
                        </Group>
                    </UnstyledButton>

                    <UnstyledButton
                        onClick={handleLogout}
                        style={{ width: '100%', padding: '6px 4px', borderRadius: 6 }}
                    >
                        <Group gap={6} wrap="nowrap">
                            <Box style={{
                                width: 28, height: 28,
                                borderRadius: '50%',
                                background: 'var(--mantine-color-red-1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--mantine-color-red-7)',
                            }}>
                                <IconLogout size={13} />
                            </Box>
                            <Text size="xs" c="red.7">현재 계정 로그아웃</Text>
                        </Group>
                    </UnstyledButton>
                </Stack>
            )}
        </Box>
    );
}
