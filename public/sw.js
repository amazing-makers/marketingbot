// Phase 22-23 — Service Worker: Web Push + offline fallback
// 마케팅봇 알림 수신 + 클릭 시 이동 + 오프라인 폴백 페이지

const CACHE_VERSION = 'v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then(cache => cache.addAll([OFFLINE_URL])),
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            // 이전 버전 캐시 정리
            caches.keys().then(keys => Promise.all(
                keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)),
            )),
        ]),
    );
});

// fetch — 페이지 네비게이션만 오프라인 폴백 (API/static 은 그대로)
self.addEventListener('fetch', (event) => {
    if (event.request.mode !== 'navigate') return;
    event.respondWith(
        fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
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
