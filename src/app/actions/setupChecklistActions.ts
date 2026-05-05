'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export interface ChecklistItem {
    id: string;
    title: string;
    desc: string;
    done: boolean;
    href: string;
    emoji: string;
}

/**
 * Phase 26 — 단계별 셋업 체크리스트.
 * Dashboard 상단에 프로그레스 표시. 모두 완료되면 자동 숨김.
 */
export async function getSetupChecklist(): Promise<{
    items: ChecklistItem[];
    completed: number;
    total: number;
    percent: number;
}> {
    const session = await auth();
    if (!session?.user?.id) {
        return { items: [], completed: 0, total: 0, percent: 0 };
    }
    const userId = session.user.id;

    const [channelCount, campaignCount, seriesCount, hasTemplate, hasAiKey, completedOnboarding] = await Promise.all([
        prisma.marketingChannel.count({ where: { userId, status: 'ACTIVE' } }),
        prisma.campaign.count({ where: { userId } }),
        prisma.campaignSeries.count({ where: { userId, status: 'RUNNING' } }),
        prisma.captionTemplate.count({ where: { userId } }).then(c => c > 0),
        prisma.userAiConfig.findUnique({ where: { userId }, select: { aiKeysEncrypted: true } }).then(c => !!c?.aiKeysEncrypted),
        prisma.user.findUnique({ where: { id: userId }, select: { onboardingCompletedAt: true } }).then(u => !!u?.onboardingCompletedAt),
    ]);

    const items: ChecklistItem[] = [
        {
            id: 'onboarding',
            emoji: '👋',
            title: '온보딩 완료',
            desc: '4단계 가이드를 마치면 모든 기능 활성화',
            done: completedOnboarding,
            href: '/onboarding',
        },
        {
            id: 'channel',
            emoji: '🌐',
            title: '첫 채널 연결',
            desc: '인스타그램·블로그·텔레그램 등 1개 이상 연결',
            done: channelCount > 0,
            href: '/dashboard/channels',
        },
        {
            id: 'ai_key',
            emoji: '🔑',
            title: 'AI 키 등록 (선택)',
            desc: 'Gemini·Groq 무료 키로 캡션 생성 품질 ↑',
            done: hasAiKey,
            href: '/dashboard/settings/ai',
        },
        {
            id: 'campaign',
            emoji: '✍️',
            title: '첫 캠페인 작성',
            desc: 'AI 캡션 + 이미지 + 5개 채널 동시 발행',
            done: campaignCount > 0,
            href: '/dashboard/campaigns/new',
        },
        {
            id: 'series',
            emoji: '🤖',
            title: '자동 발행 시리즈 시작',
            desc: '한 번 설정하면 정해진 시간마다 자동 발행',
            done: seriesCount > 0,
            href: '/dashboard/campaigns/series/new',
        },
        {
            id: 'template',
            emoji: '📚',
            title: '템플릿 라이브러리',
            desc: '자주 쓰는 캡션 패턴 저장해 재사용',
            done: hasTemplate,
            href: '/dashboard/library',
        },
    ];

    const completed = items.filter(i => i.done).length;
    const total = items.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { items, completed, total, percent };
}
