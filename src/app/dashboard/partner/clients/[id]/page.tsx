import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { listMyPartnerClients } from '@/app/actions/partnerActions';
import ClientDetailClient from './ClientDetailClient';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const { id } = await params;
    const all = await listMyPartnerClients().catch(() => []);
    const client = all.find(c => c.id === id);
    if (!client) notFound();

    return (
        <ClientDetailClient
            data={{
                ...client,
                startedAt: client.startedAt.toISOString(),
                endedAt: client.endedAt?.toISOString() || null,
            }}
        />
    );
}
