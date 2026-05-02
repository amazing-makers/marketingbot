'use client';

import { useEffect } from 'react';
import posthog from 'posthog-js';
import { useSession } from 'next-auth/react';

export function PostHogIdentify() {
    const { data: session } = useSession();
    useEffect(() => {
        if (!session?.user?.id || !posthog.__loaded) return;
        posthog.identify(session.user.id, {
            email: session.user.email,
            name: session.user.name,
            role: (session.user as any).role,
        });
    }, [session]);
    return null;
}
