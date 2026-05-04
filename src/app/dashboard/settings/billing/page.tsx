import BillingClient from './BillingClient';
import { getMySubscription } from '@/app/actions/billingActions';

export default async function BillingPage() {
    const subscription = await getMySubscription();
    return <BillingClient subscription={subscription} />;
}
