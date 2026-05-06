import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getMyResellerSummary } from '@/app/actions/resellerActions';
import { listMyPartnerClients } from '@/app/actions/partnerActions';
import PartnerDashboardClient from './PartnerDashboardClient';

export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: Promise<{ error?: string }>;
}

export default async function PartnerPage({ searchParams }: PageProps) {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const sp = await searchParams;
    const summary = await getMyResellerSummary();
    const clients = summary
        ? await listMyPartnerClients().catch(() => [])
        : [];

    return (
        <PartnerDashboardClient
            summary={summary}
            clients={clients.map(c => ({
                ...c,
                startedAt: c.startedAt.toISOString(),
                endedAt: c.endedAt?.toISOString() || null,
            }))}
            accessError={sp.error || null}
        />
    );
}
