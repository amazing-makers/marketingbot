import { redirect } from 'next/navigation';

// 기존 URL 호환성 — 모두 /dashboard/partner 로 redirect
export default function ResellerRedirect() {
    redirect('/dashboard/partner');
}
