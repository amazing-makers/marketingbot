import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { listImportableData } from '@/app/actions/dataImportActions';
import { listWorkspaceMembers } from '@/app/actions/workspaceActions';
import ImportClient from './ImportClient';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ImportPage({ params }: PageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const { id } = await params;

    let workspace;
    try {
        const data = await listWorkspaceMembers(id);
        workspace = data.workspace;
        if (data.myRole !== 'OWNER' && data.myRole !== 'ADMIN') {
            redirect(`/dashboard/workspace/${id}`);
        }
    } catch {
        notFound();
    }

    const data = await listImportableData();

    return <ImportClient workspaceId={id} workspaceName={workspace.name} brandColor={workspace.brandColor} data={data} />;
}
