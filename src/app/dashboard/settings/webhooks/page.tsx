import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listMyWebhookTokens } from '@/app/actions/webhookActions';
import WebhooksClient from './WebhooksClient';

export const metadata = {
    title: 'Webhook | 마케팅봇',
};

export default async function WebhooksPage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    const result = await listMyWebhookTokens();
    return <WebhooksClient initialTokens={result.tokens || []} />;
}
