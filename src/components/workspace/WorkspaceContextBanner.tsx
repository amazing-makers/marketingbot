'use client';

import { Alert, Group, Text, Badge, Box, Anchor } from '@mantine/core';
import { IconBuildingStore, IconUser } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { getCurrentWorkspace } from '@/app/actions/workspaceActions';
import Link from 'next/link';

/**
 * Phase 18 — 워크스페이스 컨텍스트 배너.
 * 활성 워크스페이스가 있을 때만 표시 (개인 모드면 숨김).
 * 사용자에게 "지금 어느 컨텍스트에서 작업 중인지" 명확히 알림.
 */
export default function WorkspaceContextBanner() {
    const [workspace, setWorkspace] = useState<{ id: string; name: string; brandColor: string | null } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getCurrentWorkspace()
            .then((w) => setWorkspace(w))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading || !workspace) return null;

    return (
        <Alert
            color="violet"
            variant="light"
            mb="md"
            icon={<IconBuildingStore size={16} />}
            style={{ borderLeft: `3px solid ${workspace.brandColor || '#7C3AED'}` }}
        >
            <Group justify="space-between" wrap="wrap" gap="xs">
                <Group gap="xs">
                    <Box
                        style={{
                            width: 22, height: 22, borderRadius: 5,
                            background: workspace.brandColor || '#7C3AED',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: 700, fontSize: 11,
                        }}
                    >
                        {workspace.name.slice(0, 2).toUpperCase()}
                    </Box>
                    <Text size="sm" fw={600}>{workspace.name}</Text>
                    <Badge size="xs" variant="light" color="violet">활성 워크스페이스</Badge>
                    <Text size="xs" c="dimmed">— 이 컨텍스트의 채널·캠페인만 표시됨</Text>
                </Group>
                <Anchor component={Link} href="/dashboard/workspace" size="xs">관리 →</Anchor>
            </Group>
        </Alert>
    );
}
