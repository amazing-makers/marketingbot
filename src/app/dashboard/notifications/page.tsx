import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { listMyNotificationsPaged } from '@/app/actions/notificationActions';
import NotificationsClient from './NotificationsClient';

export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: Promise<{ kind?: string; q?: string; unread?: string; page?: string }>;
}

export default async function NotificationsPage({ searchParams }: PageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const sp = await searchParams;
    const data = await listMyNotificationsPaged({
        kind: sp.kind,
        q: sp.q,
        unreadOnly: sp.unread === '1',
        page: parseInt(sp.page || '1', 10),
    });

    return (
        <NotificationsClient
            initial={data}
            initialFilter={{
                kind: sp.kind || null,
                q: sp.q || '',
                unreadOnly: sp.unread === '1',
            }}
        />
    );
}
