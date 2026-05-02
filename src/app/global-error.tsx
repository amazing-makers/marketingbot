'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import NextError from 'next/error';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
    useEffect(() => {
        if (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) {
            Sentry.captureException(error);
        }
    }, [error]);

    return (
        <html lang="ko">
            <body>
                <NextError statusCode={0} />
            </body>
        </html>
    );
}
