import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { listWorkspaceMembers } from '@/app/actions/workspaceActions';
import { listPendingInvitations } from '@/app/actions/invitationActions';
import WorkspaceDetailClient from './WorkspaceDetailClient';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function WorkspaceDetailPage({ params }: PageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const { id } = await params;

    let data;
    try {
        data = await listWorkspaceMembers(id);
    } catch {
        notFound();
    }

    const pendingInvites = await listPendingInvitations(id).catch(() => []);

    return (
        <WorkspaceDetailClient
            data={{
                ...data,
                members: data.members.map(m => ({
                    ...m,
                    joinedAt: m.joinedAt.toISOString(),
                })),
                pendingInvitations: pendingInvites.map(i => ({
                    id: i.id,
                    email: i.email,
                    role: i.role,
                    expiresAt: i.expiresAt.toISOString(),
                    createdAt: i.createdAt.toISOString(),
                })),
                recentActivity: data.recentActivity || [],
            }}
        />
    );
}
