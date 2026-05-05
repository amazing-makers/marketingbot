// Phase 22 — Service Worker for Web Push notifications
// 마케팅봇 알림 수신 + 클릭 시 이동 처리

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data;
    try {
        data = event.data.json();
    } catch {
        data = { title: '마케팅봇', body: event.data.text() };
    }

    const title = data.title || '마케팅봇 알림';
    const options = {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { link: data.link || '/dashboard' },
        tag: data.kind || 'default',
        renotify: true,
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const link = event.notification.data?.link || '/dashboard';
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((clientList) => {
            // 이미 열린 탭 있으면 focus + 이동
            for (const client of clientList) {
                if ('focus' in client) {
                    client.focus();
                    if ('navigate' in client) {
                        client.navigate(link);
                    }
                    return;
                }
            }
            // 없으면 새 창
            if (self.clients.openWindow) {
                return self.clients.openWindow(link);
            }
        }),
    );
});
