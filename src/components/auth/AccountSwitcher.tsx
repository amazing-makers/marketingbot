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
    const [accounts, setAccounts] = useState<SwitchableAccount[]>([]);
    const [switching, setSwitching] = useState<string | null>(null);

    // Phase 50 — server-fetched: cookie 의 trusted device token 으로 검증된 계정만.
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

    // 기존 계정으로 로그인 — 성공 시 자동으로 trusted device 등록.
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
                            const isSwitching = switching === acc.id;
                            return (
                                <Menu.Item
                                    key={acc.id}
                                    onClick={() => handleSwitchTo(acc)}
                                    closeMenuOnClick={false}
                                    disabled={isSwitching}
                                >
                                    <Group gap={8} wrap="nowrap">
                                        <Avatar radius="xl" size="sm" color="gray">{accInitial}</Avatar>
                                        <Box style={{ flex: 1, minWidth: 0 }}>
                                            <Text size="sm" truncate>{acc.name || acc.email.split('@')[0]}</Text>
                                            <Text size="11px" c="dimmed" truncate>
                                                {isSwitching ? '전환 중...' : acc.email}
                                            </Text>
                                        </Box>
                                        <Tooltip label="이 PC 에서 빠른 전환 끄기" withArrow>
                                            <ActionIcon
                                                size="sm"
                                                variant="subtle"
                                                color="gray"
                                                onClick={(e) => handleRemove(acc, e)}
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
                <Menu.Item leftSection={<IconUserPlus size={14} />} onClick={handleLoginAnother}>
                    + 다른 계정 로그인
                </Menu.Item>
                <Menu.Item leftSection={<IconUserPlus size={14} />} onClick={handleRegisterNew} color="teal">
                    + 새 계정 만들기
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
