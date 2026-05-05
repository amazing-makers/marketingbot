'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { chatRaw } from '@/lib/ai/caption';

/**
 * AI 코파일럿 (Cursor 스타일) — 페이지 컨텍스트 + 사용자 데이터 인식해서 AI 응답.
 *
 * 동작:
 *   1. 사용자 메시지 + 현재 페이지 (path) 받음
 *   2. 페이지별 자동 컨텍스트 수집 (캠페인 목록·채널 목록·통계)
 *   3. 시스템 프롬프트 + 컨텍스트 + 메시지 → generateCaption (free LLM)
 *   4. 응답 반환
 *
 * 향후 강화:
 *   - 멀티턴 (대화 이력 prisma 저장)
 *   - 도구 호출 (캠페인 생성·채널 추가 같은 액션 자동 실행)
 *   - 스트리밍 (Server-Sent Events)
 */

interface ChatContext {
    path?: string;           // 현재 페이지 경로 (예 '/dashboard/campaigns/new')
    selectedText?: string;   // 사용자가 선택한 텍스트 (있으면)
    pageData?: any;          // 페이지가 직접 넘기는 추가 컨텍스트 (예 현재 캠페인 본문)
}

export async function chatWithCopilot(input: {
    message: string;
    context?: ChatContext;
}): Promise<{ success: boolean; reply?: string; error?: string; action?: { kind: string; label: string; href: string } | null }> {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: 'Unauthorized' };
    if (!input.message?.trim()) return { success: false, error: '메시지가 비어있습니다' };

    const userId = session.user.id;

    // ── 1. 사용자 데이터 컨텍스트 수집 (지난 30일 통계 + 채널 + 최근 캠페인) ──
    const [channelCount, recentCampaigns, taskStats] = await Promise.all([
        prisma.marketingChannel.count({ where: { userId } }),
        prisma.campaign.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { id: true, name: true, status: true, createdAt: true },
        }),
        prisma.scheduledTask.groupBy({
            by: ['status'],
            where: { campaign: { userId }, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
            _count: true,
        }).catch(() => [] as any[]),
    ]);

    const userContext = `
사용자 통계 (지난 30일):
- 등록된 채널: ${channelCount}개
- 최근 캠페인: ${recentCampaigns.map(c => `"${c.name}"(${c.status})`).join(', ') || '없음'}
- 작업 상태: ${taskStats.map((s: any) => `${s.status}: ${s._count}건`).join(', ') || '없음'}
`.trim();

    // ── 2. 페이지 컨텍스트 ──
    const path = input.context?.path || '';
    let pageContext = '';
    if (path.includes('/campaigns/new')) {
        pageContext = '현재 페이지: 새 캠페인 작성. 사용자가 콘텐츠 작성 도움을 원할 가능성 높음.';
    } else if (path.includes('/campaigns/calendar')) {
        pageContext = '현재 페이지: 콘텐츠 캘린더. 일정 최적화·분할 발행 추천 가능.';
    } else if (path.includes('/campaigns')) {
        pageContext = '현재 페이지: 캠페인 목록.';
    } else if (path.includes('/channels')) {
        pageContext = '현재 페이지: 채널 관리. 채널 추가/연동 관련 질문 가능성 높음.';
    } else if (path.includes('/agent')) {
        pageContext = '현재 페이지: 에이전트 다운로드/관리.';
    } else if (path.includes('/settings/ai')) {
        pageContext = '현재 페이지: AI 엔진 설정. 무료 키 등록 가이드 가능.';
    } else if (path.includes('/billing') || path.includes('/pricing')) {
        pageContext = '현재 페이지: 결제·가격제. 플랜 추천·비교 가능.';
    } else {
        pageContext = `현재 페이지: ${path || '대시보드'}`;
    }
    if (input.context?.selectedText) {
        pageContext += `\n사용자가 선택한 텍스트: "${input.context.selectedText.slice(0, 500)}"`;
    }

    // ── 3. 시스템 프롬프트 + 호출 ──
    const systemPrompt = `당신은 마케팅봇의 AI 코파일럿입니다. 한국 마케팅·SNS 전문가로서 친근하고 실용적인 조언을 제공하세요.

마케팅봇 핵심 기능:
- Telegram·Discord·LinkedIn·X·WordPress 클라우드 자동 발행 (HTTP API)
- Instagram·Facebook·Threads·네이버블로그·네이버카페 데스크톱 에이전트 자동화
- 16 플랫폼 AI 캡션 생성 (Gemini·Groq·Claude·Ollama)
- 14 언어 자동 번역 (DeepL·AI 폴백)
- AI 이미지 생성 (Pollinations 무료·DALL-E·Imagen)
- Sharp 채널별 이미지 비율 자동 변환 (1:1/4:5/9:16/16:9/1.91:1)
- prime-time 황금시간대 자동 추천 (12 region)
- 분할 발행 (같은 콘텐츠 N개 시각으로 자동)
- R2 (Cloudflare) 이미지 호스팅
- Workspace 다중 브랜드
- 14일 무료 체험 + Stripe 결제

답변 규칙:
- 짧고 명확하게 (2-4문단)
- 마크다운 사용 가능 (목록·코드·강조)
- 사용자가 직접 페이지로 이동하면 좋을 때는 경로 안내 (예 "/dashboard/campaigns/new")
- 모르면 솔직하게 모른다고
- 광고 톤 금지

${userContext}

${pageContext}
`.trim();

    try {
        const reply = await chatRaw({
            systemPrompt,
            userMessage: input.message,
            userId,
            maxChars: 4000,
        });

        // Phase 24 — 도구 호출 의도 감지
        const action = detectAction(input.message);

        return { success: true, reply, action };
    } catch (e: any) {
        console.error('[copilot]', e);
        return { success: false, error: e?.message || 'AI 응답 실패' };
    }
}

/**
 * Phase 24 — 사용자 메시지에서 의도(action) 감지.
 * "캠페인 만들어줘", "신메뉴 캠페인", "글 작성해줘" 등에 매칭되면 캠페인 작성 페이지 prefill 링크 반환.
 */
function detectAction(message: string): { kind: string; label: string; href: string } | null {
    const m = message.trim();
    const lower = m.toLowerCase();

    // 캠페인 작성 의도
    const campaignKeywords = ['캠페인 만들', '캠페인 작성', '캠페인 생성', '글 작성', '게시물 만들', '포스팅 만들', '발행해', '올려줘'];
    const isCreate = campaignKeywords.some(k => m.includes(k)) || lower.includes('create campaign');
    if (isCreate) {
        // 메시지에서 "주제" 추출 — 따옴표 또는 콜론 뒤 텍스트
        let topic = '';
        const quotedMatch = m.match(/["'「『]([^"'」』]+)["'」』]/);
        if (quotedMatch) topic = quotedMatch[1];
        else {
            const colonMatch = m.match(/[:：]\s*(.+?)(?:\s+(?:캠페인|게시물|포스팅|글)|\s*$)/);
            if (colonMatch) topic = colonMatch[1].trim();
        }
        const params = topic
            ? `?topic=${encodeURIComponent(topic)}`
            : '';
        return {
            kind: 'CREATE_CAMPAIGN',
            label: topic ? `"${topic}" 캠페인 만들기` : '새 캠페인 작성하기',
            href: `/dashboard/campaigns/new${params}`,
        };
    }

    // 시리즈 작성
    if (m.includes('자동 발행') || m.includes('시리즈 만들') || m.includes('자동화 만들')) {
        return {
            kind: 'CREATE_SERIES',
            label: '자동 발행 만들기',
            href: '/dashboard/campaigns/series/new',
        };
    }

    // 채널 추가
    if (m.includes('채널 추가') || m.includes('채널 연동') || m.includes('인스타 연결') || m.includes('블로그 연결')) {
        return {
            kind: 'ADD_CHANNEL',
            label: '채널 추가하기',
            href: '/dashboard/channels',
        };
    }

    // 캘린더
    if (m.includes('일정') || m.includes('캘린더')) {
        return {
            kind: 'OPEN_CALENDAR',
            label: '콘텐츠 캘린더 열기',
            href: '/dashboard/campaigns/calendar',
        };
    }

    return null;
}
