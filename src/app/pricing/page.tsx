import PricingClient from './PricingClient';
import { PLANS } from '@/lib/billing/stripe';

export default function PricingPage() {
    // server 에서 plan 정의를 직렬화 가능한 형태로 전달
    const plans = Object.values(PLANS).map(p => ({
        key: p.key,
        name: p.name,
        priceMonthlyKrw: p.priceMonthlyKrw,
        description: p.description,
        features: p.features,
        highlight: p.highlight || false,
        configured: !!p.stripePriceId, // Stripe Price ID 가 .env 에 등록됐는지
    }));
    return <PricingClient plans={plans} />;
}
