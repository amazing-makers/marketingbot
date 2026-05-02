'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
        const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
        if (!key || posthog.__loaded) return;
        posthog.init(key, {
            api_host: host,
            capture_pageview: 'history_change',
            capture_pageleave: true,
            session_recording: {
                maskAllInputs: true, // 비밀번호·라이센스 키 보호
                maskTextSelector: '.ph-mask',
            },
            autocapture: {
                dom_event_allowlist: ['click', 'submit'],
            },
            loaded: (ph) => {
                if (process.env.NODE_ENV === 'development') ph.debug();
            },
        });
    }, []);
    return <PHProvider client={posthog}>{children}</PHProvider>;
}
