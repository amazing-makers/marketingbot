'use client';

import { Box, Group, Text, Button, Stack, ActionIcon, Paper } from '@mantine/core';
import { IconX, IconArrowRight, IconArrowLeft, IconCheck } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface TourStep {
    id: string;
    title: string;
    body: string;
    /** 강조할 영역 — 페이지 내 selector. null 이면 화면 중앙 모달 */
    targetSelector?: string;
    /** 다음 단계 진입 시 이동할 경로 (현재 페이지가 아니면) */
    requiresPath?: string;
    /** 마지막 단계 시 이동할 경로 */
    completePath?: string;
}

const STEPS: TourStep[] = [
    {
        id: 'welcome',
        title: '👋 마케팅봇에 오신 것을 환영합니다!',
        body: '4단계로 핵심 기능을 빠르게 둘러볼게요. 약 1분 걸려요.',
    },
    {
        id: 'channels',
        title: '🌐 1단계: 채널 등록',
        body: '인스타그램 · 페이스북 · 블로그 · 디스코드 등 SNS 계정을 한 번 등록해두면 한 번에 발행할 수 있어요.',
        targetSelector: '[data-tour="nav-channels"]',
        requiresPath: '/dashboard',
    },
    {
        id: 'compose',
        title: '✍️ 2단계: 캠페인 작성',
        body: '한 번 글을 쓰면 14개 언어로 자동 번역되고, 등록한 모든 채널에 동시 발행돼요.',
        targetSelector: '[data-tour="nav-campaigns"]',
        requiresPath: '/dashboard',
    },
    {
        id: 'series',
        title: '🤖 3단계: 자동 발행 시리즈',
        body: '한 번 설정하면 며칠·몇주 동안 정해진 시간마다 자동으로 게시물을 만들어 올려줘요.',
        targetSelector: '[data-tour="nav-series"]',
        requiresPath: '/dashboard',
    },
    {
        id: 'done',
        title: '🎉 준비 완료!',
        body: '먼저 채널을 등록해보세요. 14일 동안 모든 기능을 무료로 체험할 수 있어요.',
        completePath: '/dashboard/channels',
    },
];

const STORAGE_KEY = 'amakers_tour_completed';
const STORAGE_DISMISSED_KEY = 'amakers_tour_dismissed';

export default function InteractiveTour() {
    const router = useRouter();
    const [active, setActive] = useState(false);
    const [stepIdx, setStepIdx] = useState(0);
    const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

    // 첫 방문자 자동 시작 — 단, dismissed 또는 completed 면 안 띄움
    useEffect(() => {
        try {
            const completed = localStorage.getItem(STORAGE_KEY);
            const dismissed = localStorage.getItem(STORAGE_DISMISSED_KEY);
            if (!completed && !dismissed) {
                // 약간 딜레이 — 페이지 렌더 후
                const t = setTimeout(() => setActive(true), 1500);
                return () => clearTimeout(t);
            }
        } catch { /* ignore */ }
    }, []);

    // window 글로벌로 노출 — 사용자 메뉴에서 "투어 다시 보기" 가능
    useEffect(() => {
        (window as any).__startAmakersTour = () => {
            setStepIdx(0);
            setActive(true);
        };
        return () => {
            delete (window as any).__startAmakersTour;
        };
    }, []);

    // step 변경 시 target 위치 계산
    useEffect(() => {
        if (!active) return;
        const step = STEPS[stepIdx];
        if (!step?.targetSelector) {
            setHighlightRect(null);
            return;
        }
        const compute = () => {
            const el = document.querySelector(step.targetSelector!);
            if (el) setHighlightRect(el.getBoundingClientRect());
            else setHighlightRect(null);
        };
        compute();
        window.addEventListener('resize', compute);
        window.addEventListener('scroll', compute, true);
        return () => {
            window.removeEventListener('resize', compute);
            window.removeEventListener('scroll', compute, true);
        };
    }, [active, stepIdx]);

    if (!active) return null;

    const step = STEPS[stepIdx];
    const isLast = stepIdx === STEPS.length - 1;
    const isFirst = stepIdx === 0;

    const handleNext = () => {
        if (isLast) {
            try { localStorage.setItem(STORAGE_KEY, new Date().toISOString()); } catch { /* ignore */ }
            setActive(false);
            if (step.completePath) router.push(step.completePath);
        } else {
            setStepIdx(stepIdx + 1);
        }
    };

    const handleSkip = () => {
        try { localStorage.setItem(STORAGE_DISMISSED_KEY, new Date().toISOString()); } catch { /* ignore */ }
        setActive(false);
    };

    // 카드 위치 계산 — target 이 있으면 target 아래, 없으면 화면 중앙
    const cardStyle: React.CSSProperties = highlightRect
        ? {
            position: 'fixed',
            top: Math.min(window.innerHeight - 240, highlightRect.bottom + 12),
            left: Math.max(16, Math.min(window.innerWidth - 360, highlightRect.left)),
            width: 340,
            zIndex: 10001,
        }
        : {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 380,
            zIndex: 10001,
        };

    return (
        <>
            {/* 어두운 배경 오버레이 — target 영역만 빛남 */}
            <Box
                onClick={handleSkip}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: 9999,
                    cursor: 'pointer',
                }}
            />

            {/* highlight 박스 (target 위에 outline) */}
            {highlightRect && (
                <Box
                    style={{
                        position: 'fixed',
                        top: highlightRect.top - 4,
                        left: highlightRect.left - 4,
                        width: highlightRect.width + 8,
                        height: highlightRect.height + 8,
                        borderRadius: 8,
                        boxShadow: '0 0 0 4px var(--mantine-color-violet-5), 0 0 0 9999px rgba(0,0,0,0.5)',
                        pointerEvents: 'none',
                        zIndex: 10000,
                        animation: 'amakers-tour-pulse 1.5s ease-in-out infinite',
                    }}
                />
            )}

            {/* 가이드 카드 */}
            <Paper
                shadow="xl"
                p="lg"
                radius="md"
                withBorder
                style={cardStyle}
                onClick={(e) => e.stopPropagation()}
            >
                <Stack gap="sm">
                    <Group justify="space-between" wrap="nowrap">
                        <Text size="11px" c="dimmed" fw={600}>
                            {stepIdx + 1} / {STEPS.length}
                        </Text>
                        <ActionIcon size="sm" variant="subtle" color="gray" onClick={handleSkip} aria-label="투어 닫기">
                            <IconX size={14} />
                        </ActionIcon>
                    </Group>
                    <Text fw={800} size="lg">{step.title}</Text>
                    <Text size="sm" c="dimmed">{step.body}</Text>
                    <Group justify="space-between" wrap="nowrap" mt="xs">
                        {!isFirst ? (
                            <Button
                                size="compact-sm"
                                variant="subtle"
                                leftSection={<IconArrowLeft size={14} />}
                                onClick={() => setStepIdx(stepIdx - 1)}
                            >
                                이전
                            </Button>
                        ) : (
                            <Button size="compact-sm" variant="subtle" color="gray" onClick={handleSkip}>
                                건너뛰기
                            </Button>
                        )}
                        <Button
                            size="compact-sm"
                            color="violet"
                            rightSection={isLast ? <IconCheck size={14} /> : <IconArrowRight size={14} />}
                            onClick={handleNext}
                        >
                            {isLast ? '시작하기' : '다음'}
                        </Button>
                    </Group>
                </Stack>
            </Paper>

            <style jsx global>{`
                @keyframes amakers-tour-pulse {
                    0%, 100% { box-shadow: 0 0 0 4px var(--mantine-color-violet-5), 0 0 0 9999px rgba(0,0,0,0.5); }
                    50% { box-shadow: 0 0 0 6px var(--mantine-color-violet-6), 0 0 0 9999px rgba(0,0,0,0.5); }
                }
            `}</style>
        </>
    );
}
