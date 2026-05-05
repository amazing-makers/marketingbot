'use client';

import { Menu, UnstyledButton, Group, Text, Box, Badge, Loader, Anchor, Divider } from '@mantine/core';
import { IconChevronDown, IconBuildingStore, IconPlus, IconUser } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import { listMyWorkspaces, switchWorkspace, getCurrentWorkspace } from '@/app/actions/workspaceActions';

interface Workspace {
    id: string;
    name: string;
    slug: string;
    role: string;
    memberCount: number;
    plan: string;
    brandColor: string | null;
    logoUrl: string | null;
    isOwner: boolean;
}

interface CurrentWs {
    id: string;
    name: string;
    slug: string;
    plan: string;
    brandColor: string | null;
    memberCount: number;
    isOwner: boolean;
}

export default function WorkspaceSwitcher() {
    const router = useRouter();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [current, setCurrent] = useState<CurrentWs | null>(null);
    const [loading, setLoading] = useState(true);
    const [switching, setSwitching] = useState(false);

    useEffect(() => {
        Promise.all([listMyWorkspaces(), getCurrentWorkspace()])
            .then(([ws, c]) => {
                setWorkspaces(ws);
                setCurrent(c);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleSwitch = async (workspaceId: string | null) => {
        setSwitching(true);
        try {
            await switchWorkspace(workspaceId);
            const ws = workspaceId ? workspaces.find(w => w.id === workspaceId) : null;
            notifications.show({
                color: 'violet',
                title: ws ? `🏪 ${ws.name} 으로 전환됨` : '👤 개인 모드로 전환됨',
                message: '이후 채널·캠페인 작업은 이 컨텍스트에서 진행됩니다',
                autoClose: 3000,
            });
            router.refresh();
            // 전환 즉시 페이지 새로고침 — current workspace 가 모든 server component 에 영향
            setTimeout(() => window.location.reload(), 200);
        } catch (e: any) {
            notifications.show({ color: 'red', title: '실패', message: e?.message || '실패' });
        } finally {
            setSwitching(false);
        }
    };

    if (loading) {
        return <Loader size="xs" />;
    }

    // 워크스페이스가 0개면 표시 안 함 (개인 모드 only)
    if (workspaces.length === 0) return null;

    const display = current
        ? { name: current.name, color: current.brandColor || '#7C3AED' }
        : { name: '개인 작업', color: '#999' };

    return (
        <Menu shadow="md" width={280} position="bottom-start">
            <Menu.Target>
                <UnstyledButton style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: 'var(--mantine-color-default-hover)',
                    border: '1px solid var(--mantine-color-default-border)',
                }}>
                    <Group gap={6} wrap="nowrap">
                        <Box
                            style={{
                                width: 22, height: 22, borderRadius: 5,
                                background: display.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontWeight: 700, fontSize: 11,
                            }}
                        >
                            {display.name.slice(0, 2).toUpperCase()}
                        </Box>
                        <Text size="sm" fw={600} style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {display.name}
                        </Text>
                        <IconChevronDown size={12} />
                    </Group>
                </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
                <Menu.Label>워크스페이스 전환</Menu.Label>

                {/* 개인 모드 */}
                <Menu.Item
                    leftSection={<IconUser size={14} />}
                    onClick={() => handleSwitch(null)}
                    disabled={switching}
                    color={!current ? 'violet' : undefined}
                >
                    <Group gap={6} justify="space-between">
                        <Text size="sm" fw={!current ? 700 : 400}>개인 작업</Text>
                        {!current && <Badge size="xs" color="violet" variant="light">활성</Badge>}
                    </Group>
                </Menu.Item>

                <Divider />
                <Menu.Label>내 워크스페이스 ({workspaces.length})</Menu.Label>

                {workspaces.map(ws => {
                    const isActive = current?.id === ws.id;
                    return (
                        <Menu.Item
                            key={ws.id}
                            onClick={() => handleSwitch(ws.id)}
                            disabled={switching || isActive}
                            color={isActive ? 'violet' : undefined}
                        >
                            <Group gap={6} wrap="nowrap" justify="space-between">
                                <Group gap={6} wrap="nowrap">
                                    <Box
                                        style={{
                                            width: 22, height: 22, borderRadius: 5,
                                            background: ws.brandColor || '#7C3AED',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'white', fontWeight: 700, fontSize: 10,
                                            flexShrink: 0,
                                        }}
                                    >
                                        {ws.name.slice(0, 2).toUpperCase()}
                                    </Box>
                                    <Box>
                                        <Text size="sm" fw={isActive ? 700 : 500} truncate>{ws.name}</Text>
                                        <Text size="10px" c="dimmed">멤버 {ws.memberCount} · {ws.role}</Text>
                                    </Box>
                                </Group>
                                {isActive && <Badge size="xs" color="violet" variant="light">활성</Badge>}
                            </Group>
                        </Menu.Item>
                    );
                })}

                <Divider />
                <Menu.Item leftSection={<IconBuildingStore size={14} />} component={Link} href="/dashboard/workspace">
                    <Text size="sm">워크스페이스 관리</Text>
                </Menu.Item>
                <Menu.Item leftSection={<IconPlus size={14} />} component={Link} href="/dashboard/workspace">
                    <Text size="sm">+ 새 워크스페이스</Text>
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
}
