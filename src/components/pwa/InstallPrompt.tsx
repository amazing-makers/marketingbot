'use client';

import { useEffect, useState } from 'react';
import { Notification, Group, Text, Button, ActionIcon } from '@mantine/core';
import { IconDownload, IconX, IconDeviceMobile } from '@tabler/icons-react';

/**
 * PWA 설치 프롬프트 — beforeinstallprompt 이벤트 캐치 후 사용자에게 알림.
 * 한번 닫으면 localStorage 에 기록 — 7일 후 다시 노출.
 */
export default function InstallPrompt() {
    const [event, setEvent] = useState<any>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // localStorage 체크 — 7일 내 닫았으면 표시 안 함
        try {
            const dismissedAt = Number(localStorage.getItem('pwa_dismissed_at') || 0);
            if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) {
                setDismissed(true);
                return;
            }
        } catch { /* SSR */ }

        const handler = (e: Event) => {
            e.preventDefault();
            setEvent(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!event) return;
        event.prompt();
        await event.userChoice;
        setEvent(null);
    };

    const handleDismiss = () => {
        try { localStorage.setItem('pwa_dismissed_at', String(Date.now())); } catch { /* ignore */ }
        setDismissed(true);
    };

    if (!event || dismissed) return null;

    return (
        <div style={{
            position: 'fixed', bottom: 16, right: 16, zIndex: 1000,
            maxWidth: 320, boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            borderRadius: 12, overflow: 'hidden',
        }}>
            <Notification
                icon={<IconDeviceMobile size={18} />}
                color="violet"
                title="앱으로 설치하기"
                onClose={handleDismiss}
                withCloseButton
                withBorder
            >
                <Text size="xs" mb="xs">홈 화면에 마케팅봇을 추가하면 바로 접속 가능해요.</Text>
                <Group gap="xs">
                    <Button size="compact-xs" leftSection={<IconDownload size={12} />} onClick={handleInstall}>
                        설치
                    </Button>
                    <ActionIcon size="sm" variant="subtle" onClick={handleDismiss}><IconX size={12} /></ActionIcon>
                </Group>
            </Notification>
        </div>
    );
}
