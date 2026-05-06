'use client';

import {
    Menu, UnstyledButton, Group, Avatar, Text, Box, Divider, ActionIcon, Tooltip,
} from '@mantine/core';
import {
    IconChevronDown, IconLogout, IconUserPlus, IconCheck, IconX, IconSettings, IconShield, IconBriefcase, IconUserCircle, IconBolt,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

const STORAGE_KEY = 'amakers_saved_accounts';

interface SavedAccount {
    email: string;
    name: string | null;
    lastLoginAt: string; // ISO
}

interface CurrentUser {
    email: string;
    name?: string | null;
}

interface Props {
    currentUser: CurrentUser;
    isAdmin?: boolean;
    isPartner?: boolean;
    adminUrl?: string;
}

/**
 * Phase 39 — 다중 계정 로그인 + 스위처.
 *
 * 로컬 스토리지에 로그인했던 계정 목록 저장 (이메일·이름만, 비밀번호 X).
 * 클릭 → 현재 세션 로그아웃 + /login?email=X 로 이동 (이메일 미리 채워진 상태).
 * "다른 계정 추가" → 로그아웃 + /login (빈 폼).
 *
 * 기존 NextAuth jwt 단일 세션 방식 그대로 — 여러 세션을 동시에 유지하는 게 아니라,
 * 사용자가 자주 쓰는 계정을 빠르게 전환할 수 있게 하는 것이 목적.
 */
export default function AccountSwitcher({ currentUser, isAdmin, isPartner, adminUrl }: Props) {
    const [accounts, setAccounts] = useState<SavedAccount[]>([]);

    // 마운트 시: 로컬 저장 계정 로드 + 현재 사용자 자동 등록
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const list: SavedAccount[] = raw ? JSON.parse(raw) : [];
            // 현재 계정을 목록에 upsert (lastLoginAt 갱신)
            const withoutCurrent = list.filter(a => a.email.toLowerCase() !== currentUser.email.toLowerCase());
            const updated: SavedAccount[] = [
                { email: currentUser.email, name: currentUser.name || null, lastLoginAt: new Date().toISOString() },
                ...withoutCurrent,
            ].slice(0, 8); // 최대 8개
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            setAccounts(updated);
        } catch { /* ignore */ }
    }, [currentUser.email, currentUser.name]);

    const handleSwitchTo = async (email: string) => {
        // 현재 세션 로그아웃 + 로그인 페이지로 (이메일 미리 채움)
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

    const initial = (currentUser.name || currentUser.email).charAt(0).toUpperCase();
    const otherAccounts = accounts.filter(a => a.email.toLowerCase() !== currentUser.email.toLowerCase());

    return (
        <Menu shadow="md" width={280} position="bottom-end" closeOnItemClick={false}>
            <Menu.Target>
                <UnstyledButton style={{ padding: 4, borderRadius: 8 }}>
                    <Group gap={6} wrap="nowrap">
                        <Avatar radius="xl" size="sm" color="brand">{initial}</Avatar>
                        <Box visibleFrom="md" style={{ minWidth: 0 }}>
                            <Text size="xs" fw={600} truncate style={{ maxWidth: 140 }}>
                                {currentUser.name || currentUser.email}
                            </Text>
                            {currentUser.name && (
                                <Text size="10px" c="dimmed" truncate style={{ maxWidth: 140 }}>
                                    {currentUser.email}
                                </Text>
                            )}
                        </Box>
                        <IconChevronDown size={12} stroke={2} color="var(--mantine-color-dimmed)" />
                    </Group>
                </UnstyledButton>
            </Menu.Target>

            <Menu.Dropdown>
                {/* 현재 계정 */}
                <Menu.Label>현재 로그인</Menu.Label>
                <Menu.Item closeMenuOnClick={false} disabled style={{ opacity: 1 }}>
                    <Group gap={8} wrap="nowrap">
                        <Avatar radius="xl" size="sm" color="brand">{initial}</Avatar>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                            <Text size="sm" fw={700} truncate>{currentUser.name || currentUser.email.split('@')[0]}</Text>
                            <Text size="11px" c="dimmed" truncate>{currentUser.email}</Text>
                        </Box>
                        <IconCheck size={14} color="var(--mantine-color-teal-6)" />
                    </Group>
                </Menu.Item>

                {/* 다른 계정 — 빠른 전환 */}
                {otherAccounts.length > 0 && (
                    <>
                        <Menu.Divider />
                        <Menu.Label>다른 계정으로 전환</Menu.Label>
                        {otherAccounts.map(acc => {
                            const accInitial = (acc.name || acc.email).charAt(0).toUpperCase();
                            return (
                                <Menu.Item
                                    key={acc.email}
                                    onClick={() => handleSwitchTo(acc.email)}
                                    closeMenuOnClick={false}
                                >
                                    <Group gap={8} wrap="nowrap">
                                        <Avatar radius="xl" size="sm" color="gray">{accInitial}</Avatar>
                                        <Box style={{ flex: 1, minWidth: 0 }}>
                                            <Text size="sm" truncate>{acc.name || acc.email.split('@')[0]}</Text>
                                            <Text size="11px" c="dimmed" truncate>{acc.email}</Text>
                                        </Box>
                                        <Tooltip label="목록에서 제거" withArrow>
                                            <ActionIcon
                                                size="sm"
                                                variant="subtle"
                                                color="gray"
                                                onClick={(e) => handleRemove(acc.email, e)}
                                                aria-label={`${acc.email} 제거`}
                                            >
                                                <IconX size={12} />
                                            </ActionIcon>
                                        </Tooltip>
                                    </Group>
                                </Menu.Item>
                            );
                        })}
                    </>
                )}

                <Menu.Divider />
                <Menu.Item leftSection={<IconUserPlus size={14} />} onClick={handleAddAccount}>
                    + 다른 계정 추가
                </Menu.Item>

                <Menu.Divider />
                <Menu.Label>내 계정</Menu.Label>
                <Menu.Item leftSection={<IconUserCircle size={14} />} component={Link} href="/dashboard/settings/profile">
                    프로필
                </Menu.Item>
                <Menu.Item leftSection={<IconSettings size={14} />} component={Link} href="/dashboard/settings">
                    환경 설정
                </Menu.Item>
                <Menu.Item leftSection={<IconBolt size={14} />} onClick={() => (window as any).__startAmakersTour?.()}>
                    🎓 투어 다시 보기
                </Menu.Item>

                <Menu.Divider />
                <Menu.Item leftSection={<IconUserPlus size={14} />} component={Link} href="/dashboard/refer">
                    🎁 친구 초대 (트라이얼 7일 보너스)
                </Menu.Item>

                {isPartner && (
                    <>
                        <Menu.Divider />
                        <Menu.Label>파트너</Menu.Label>
                        <Menu.Item leftSection={<IconBriefcase size={14} />} component={Link} href="/dashboard/partner" color="violet">
                            🤝 파트너 접속
                        </Menu.Item>
                    </>
                )}
                {!isPartner && (
                    <>
                        <Menu.Divider />
                        <Menu.Item leftSection={<IconBriefcase size={14} />} component={Link} href="/dashboard/partner" color="violet">
                            🤝 파트너 가입
                        </Menu.Item>
                    </>
                )}

                {isAdmin && adminUrl && (
                    <>
                        <Menu.Divider />
                        <Menu.Label>관리자</Menu.Label>
                        <Menu.Item
                            leftSection={<IconShield size={14} />}
                            component="a"
                            href={adminUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            color="red"
                        >
                            🛠 관리자 페이지 ↗
                        </Menu.Item>
                    </>
                )}

                <Menu.Divider />
                <Menu.Item
                    color="red"
                    leftSection={<IconLogout size={14} />}
                    onClick={() => signOut({ callbackUrl: '/login' })}
                >
                    로그아웃
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
}
