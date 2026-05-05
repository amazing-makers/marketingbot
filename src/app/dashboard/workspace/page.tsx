import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { listMyWorkspaces } from '@/app/actions/workspaceActions';
import WorkspaceListClient from './WorkspaceListClient';

export const dynamic = 'force-dynamic';

export default async function WorkspacePage() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const workspaces = await listMyWorkspaces();
    return <WorkspaceListClient workspaces={workspaces} />;
}
