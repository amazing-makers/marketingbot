import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getMyAiConfig } from '@/app/actions/aiSettingsActions';
import AiSettingsClient from './AiSettingsClient';

export const metadata = {
    title: 'AI 엔진 설정 | 마케팅봇',
};

export default async function AiSettingsPage() {
    const session = await auth();
    if (!session?.user?.id) redirect('/login');

    const result = await getMyAiConfig();
    if (!result.success || !result.config) {
        // 설정 로드 실패 — 기본값으로 폴백 (UI 가 표시)
        return <AiSettingsClient initialConfig={null} loadError={result.error || '로드 실패'} />;
    }

    return <AiSettingsClient initialConfig={result.config} />;
}
