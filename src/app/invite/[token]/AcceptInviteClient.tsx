'use client';

import { Button, Stack, Text } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import { acceptInvitation } from '@/app/actions/invitationActions';

export default function AcceptInviteClient({ token, workspaceName }: { token: string; workspaceName: string }) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);

    const handleAccept = async () => {
        setBusy(true);
        try {
            const r = await acceptInvitation(token);
            if (!r.ok) {
                notifications.show({ color: 'red', title: '수락 실패', message: r.error || '실패' });
                setBusy(false);
                return;
            }
            notifications.show({
                color: 'teal',
                title: `🎉 ${workspaceName} 합류 완료`,
                message: '활성 워크스페이스로 전환합니다',
            });
            router.push(`/dashboard/workspace/${r.workspaceId}`);
            router.refresh();
        } catch (e: any) {
            notifications.show({ color: 'red', title: '실패', message: e?.message || '실패' });
            setBusy(false);
        }
    };

    return (
        <Stack gap="xs" w="100%" align="center">
            <Button
                color="violet"
                size="md"
                leftSection={<IconCheck size={16} />}
                onClick={handleAccept}
                loading={busy}
                fullWidth
            >
                ✅ 초대 수락하고 합류하기
            </Button>
            <Text size="11px" c="dimmed">버튼 클릭 시 즉시 워크스페이스 멤버로 추가됩니다.</Text>
        </Stack>
    );
}
