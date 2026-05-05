import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { listWorkspaceMembers } from '@/app/actions/workspaceActions';
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

    return (
        <WorkspaceDetailClient
            data={{
                ...data,
                members: data.members.map(m => ({
                    ...m,
                    joinedAt: m.joinedAt.toISOString(),
                })),
            }}
        />
    );
}
