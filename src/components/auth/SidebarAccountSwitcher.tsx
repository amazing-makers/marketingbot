'use client';

import {
    Box, UnstyledButton, Group, Avatar, Text, ActionIcon, Tooltip, Stack, Divider,
} from '@mantine/core';
import {
    IconChevronDown, IconChevronUp, IconUserPlus, IconCheck, IconX, IconLogout,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';

const STORAGE_KEY = 'amakers_saved_accounts';

interface SavedAccount {
    email: string;
    name: string | null;
    lastLoginAt: string;
}

interface CurrentUser {
    email: string;
    name?: string | null;
}

/**
 * Phase 39 — 사이드바 하단 다중 계정 관리 위젯.
 *
 * 헤더 AccountSwitcher 와 같은 localStorage 를 공유 — 어느 쪽에서 추가/제거해도 동기화.
 * 사이드바라 더 큰 공간이 있어 항상 펼쳐진 형태로 표시.
 */
export default function SidebarAccountSwitcher({ currentUser }: { currentUser: CurrentUser }) {
    const [accounts, setAccounts] = useState<SavedAccount[]>([]);
    const [expanded, setExpanded] = useState(false);

    // 마운트 + storage 변경 감지 (다른 탭에서 변경 시 동기화)
    useEffect(() => {
        const load = () => {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                const list: SavedAccount[] = raw ? JSON.parse(raw) : [];
                // 현재 계정을 목록에 upsert
                const withoutCurrent = list.filter(a => a.email.toLowerCase() !== currentUser.email.toLowerCase());
                const updated: SavedAccount[] = [
                    { email: currentUser.email, name: currentUser.name || null, lastLoginAt: new Date().toISOString() },
                    ...withoutCurrent,
                ].slice(0, 8);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                setAccounts(updated);
            } catch { /* ignore */ }
        };
        load();

        const onStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) load();
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, [currentUser.email, currentUser.name]);

    const handleSwitchTo = async (email: string) => {
        if (email.toLowerCase() === currentUser.email.toLowerCase()) return;
        await signOut({ redirect: false });
        window.location.href = `/login?email=${encodeURIComponent(email)}`;
    };

    const handleAddAccount = async () => {
        await signOut({ redirect: false });
        window.location.href = '/login?add=1';
    };

    const handleRemove = (email: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (email.toLowerCase() === currentUser.email.toLowerCase()) return;
        try {
            const filtered = accounts.filter(a => a.email !== email);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
            setAccounts(filtered);
        } catch { /* ignore */ }
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
                                return (
                                    <UnstyledButton
                                        key={acc.email}
                                        onClick={() => handleSwitchTo(acc.email)}
                                        style={{ width: '100%', padding: 4, borderRadius: 6 }}
                                    >
                                        <Group gap={6} wrap="nowrap">
                                            <Avatar radius="xl" size="sm" color="gray">{accInitial}</Avatar>
                                            <Box style={{ flex: 1, minWidth: 0 }}>
                                                <Text size="xs" fw={500} truncate>
                                                    {acc.name || acc.email.split('@')[0]}
                                                </Text>
                                                <Text size="10px" c="dimmed" truncate>{acc.email}</Text>
                                            </Box>
                                            <Tooltip label="목록에서 제거" withArrow>
                                                <ActionIcon
                                                    size="xs"
                                                    variant="subtle"
                                                    color="gray"
                                                    onClick={(e) => handleRemove(acc.email, e)}
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
                        onClick={handleAddAccount}
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
                            <Text size="xs" fw={600} c="violet.7">+ 다른 계정 추가</Text>
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
