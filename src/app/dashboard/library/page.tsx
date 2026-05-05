import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { listMyTemplates } from '@/app/actions/templateActions';
import LibraryClient from './LibraryClient';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const templates = await listMyTemplates();
    return (
        <LibraryClient
            initialTemplates={templates.map(t => ({
                ...t,
                lastUsedAt: t.lastUsedAt?.toISOString() || null,
                createdAt: t.createdAt.toISOString(),
                updatedAt: t.updatedAt.toISOString(),
            }))}
        />
    );
}
