import { redirect } from 'next/navigation';
import { requireActivePartner } from '@/app/actions/resellerActions';
import NewClientForm from './NewClientForm';

export const dynamic = 'force-dynamic';

export default async function NewClientPage() {
    // Phase 39 — 활성 파트너만 접근 가능
    try {
        await requireActivePartner();
    } catch (e: any) {
        const reason = e?.message === 'PARTNER_SUSPENDED' ? 'suspended' : 'not-partner';
        redirect(`/dashboard/partner?error=${reason}`);
    }
    return <NewClientForm />;
}
