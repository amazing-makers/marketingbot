import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { listMyNotifications } from '@/app/actions/notificationActions';
import NotificationsClient from './NotificationsClient';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const data = await listMyNotifications();
    return <NotificationsClient initialItems={data.items} initialUnread={data.unreadCount} />;
}
