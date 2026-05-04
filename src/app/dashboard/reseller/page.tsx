import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getMyResellerSummary } from '@/app/actions/resellerActions';
import ResellerDashboardClient from './ResellerDashboardClient';

export const dynamic = 'force-dynamic';

export default async function ResellerPage() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const summary = await getMyResellerSummary();
    return <ResellerDashboardClient summary={summary} />;
}
