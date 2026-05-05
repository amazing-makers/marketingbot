'use client';

import { Switch, Group, Text, Stack, Alert, Box } from '@mantine/core';
import { IconBellRinging, IconAlertCircle } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';
import { savePushSubscription, deletePushSubscription, getVapidPublicKey } from '@/app/actions/pushActions';

/**
 * Phase 22 — Web Push 구독 토글 (환경설정 페이지에 배치).
 *
 * 흐름:
 *   1. service worker (sw.js) 등록
 *   2. Notification.requestPermission()
 *   3. registration.pushManager.subscribe(applicationServerKey: vapidPublicKey)
 *   4. 받은 PushSubscription 을 DB 에 저장
 *
 * VAPID 키가 환경변수에 없으면 비활성 — 이메일·인앱 알림으로 대체.
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

function bufferToBase64(buf: ArrayBuffer | null): string {
    if (!buf) return '';
    const bytes = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export default function PushNotificationToggle() {
    const [supported, setSupported] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [busy, setBusy] = useState(false);
    const [vapidKey, setVapidKey] = useState<string | null>(null);
    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
        setSupported(ok);
        if (ok) setPermission(Notification.permission);
        getVapidPublicKey().then(setVapidKey).catch(() => setVapidKey(null));

        // 현재 구독 상태 확인
        if (ok) {
            navigator.serviceWorker.ready.then(reg => reg.pushManager.getSubscription())
                .then(sub => setEnabled(!!sub))
                .catch(() => setEnabled(false));
        }
    }, []);

    const handleToggle = async (checked: boolean) => {
        setBusy(true);
        try {
            if (checked) {
                if (!vapidKey) {
                    notifications.show({ color: 'orange', title: '미설정', message: 'VAPID 키 미등록 — 관리자에 문의' });
                    return;
                }
                const perm = await Notification.requestPermission();
                setPermission(perm);
                if (perm !== 'granted') {
                    notifications.show({ color: 'orange', title: '권한 거부', message: '브라우저 설정에서 알림 허용 후 다시 시도' });
                    return;
                }
                const reg = await navigator.serviceWorker.register('/sw.js');
                const sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
                });
                const json = sub.toJSON() as any;
                await savePushSubscription({
                    endpoint: sub.endpoint,
                    p256dh: json.keys?.p256dh || bufferToBase64(sub.getKey('p256dh')),
                    authKey: json.keys?.auth || bufferToBase64(sub.getKey('auth')),
                    userAgent: navigator.userAgent,
                });
                setEnabled(true);
                notifications.show({ color: 'teal', title: '🔔 푸시 알림 켜짐', message: '브라우저 닫혀도 중요 알림이 옵니다' });
            } else {
                const reg = await navigator.serviceWorker.ready;
                const sub = await reg.pushManager.getSubscription();
                if (sub) {
                    await sub.unsubscribe();
                    await deletePushSubscription(sub.endpoint);
                }
                setEnabled(false);
                notifications.show({ color: 'gray', title: '푸시 알림 꺼짐', message: '인앱·이메일 알림은 계속 받아요' });
            }
        } catch (e: any) {
            notifications.show({ color: 'red', title: '실패', message: e?.message || '실패' });
        } finally {
            setBusy(false);
        }
    };

    if (!supported) {
        return (
            <Alert color="gray" variant="light" icon={<IconAlertCircle size={16} />}>
                <Text size="sm" fw={600}>이 브라우저는 푸시 알림 미지원</Text>
                <Text size="xs" c="dimmed">Chrome / Edge / Safari (최신) 사용을 권장합니다. 인앱·이메일 알림은 계속 작동합니다.</Text>
            </Alert>
        );
    }

    if (!vapidKey) {
        return (
            <Alert color="gray" variant="light" icon={<IconAlertCircle size={16} />}>
                <Text size="sm" fw={600}>푸시 알림 (관리자 설정 필요)</Text>
                <Text size="xs" c="dimmed">VAPID 키 미등록 — 관리자가 환경변수 NEXT_PUBLIC_VAPID_PUBLIC_KEY 설정 후 활성화됩니다.</Text>
            </Alert>
        );
    }

    return (
        <Box>
            <Group justify="space-between">
                <Group gap="sm">
                    <IconBellRinging size={20} color="var(--mantine-color-violet-6)" />
                    <Stack gap={0}>
                        <Text fw={600} size="sm">🔔 브라우저 푸시 알림</Text>
                        <Text size="xs" c="dimmed">탭이 닫혀도 중요한 알림이 즉시 도착합니다</Text>
                    </Stack>
                </Group>
                <Switch
                    checked={enabled}
                    onChange={(e) => handleToggle(e.currentTarget.checked)}
                    disabled={busy || permission === 'denied'}
                    color="violet"
                />
            </Group>
            {permission === 'denied' && (
                <Alert color="orange" variant="light" mt="xs" icon={<IconAlertCircle size={14} />}>
                    <Text size="xs">브라우저 설정에서 이 사이트의 알림을 차단해뒀어요. 주소창 자물쇠 → 알림 → 허용으로 변경 후 다시 시도하세요.</Text>
                </Alert>
            )}
        </Box>
    );
}
