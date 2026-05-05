import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { listWorkspaceActivities } from '@/app/actions/activityActions';
import ActivityClient from './ActivityClient';

export const dynamic = 'force-dynamic';

export default async function ActivityPage() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const activities = await listWorkspaceActivities(200);
    return (
        <ActivityClient
            activities={activities.map(a => ({
                id: a.id,
                kind: a.kind,
                title: a.title,
                body: a.body,
                link: a.link,
                createdAt: a.createdAt.toISOString(),
                user: { id: a.user.id, email: a.user.email, name: a.user.name },
            }))}
        />
    );
}
