import { PostHog } from 'posthog-node';

let client: PostHog | null = null;

function getClient(): PostHog | null {
    const key = process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return null;
    if (!client) {
        client = new PostHog(key, {
            host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
            flushAt: 1, // 서버 사이드는 즉시 flush (lambda 환경)
            flushInterval: 0,
        });
    }
    return client;
}

/**
 * 서버 사이드 이벤트 캡처 (action / cron / api route 에서 사용)
 */
export async function captureEvent(opts: {
    distinctId: string;
    event: string;
    properties?: Record<string, any>;
}): Promise<void> {
    const ph = getClient();
    if (!ph) return;
    try {
        ph.capture({
            distinctId: opts.distinctId,
            event: opts.event,
            properties: opts.properties,
        });
        // serverless 환경 — 응답 전 flush 보장
        await ph.flush();
    } catch (err) {
        console.warn('[PostHog] capture failed:', err);
    }
}

export async function shutdownPostHog(): Promise<void> {
    if (client) {
        await client.shutdown();
        client = null;
    }
}
