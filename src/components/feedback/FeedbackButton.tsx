'use client';

import { ActionIcon, Tooltip, Modal, Stack, Text, Textarea, Button, Group, Box, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconStar, IconStarFilled, IconMessage } from '@tabler/icons-react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import { submitFeedback } from '@/app/actions/feedbackActions';

/**
 * Phase 25 — 사용자 피드백 (5점 + 코멘트).
 * 우하단 모서리에 작은 버튼 — 클릭 시 모달.
 * 한 번 보낸 사용자는 30일간 다시 안 보임 (localStorage).
 */

export default function FeedbackButton() {
    const pathname = usePathname();
    const [opened, ctl] = useDisclosure(false);
    const [rating, setRating] = useState(0);
    const [hovered, setHovered] = useState(0);
    const [comment, setComment] = useState('');
    const [busy, setBusy] = useState(false);

    const handleOpen = () => {
        // 30일 내 보냈으면 차단 — UI는 표시하되 모달 열 때 안내
        try {
            const last = Number(localStorage.getItem('amakers_feedback_at') || 0);
            if (Date.now() - last < 30 * 24 * 60 * 60 * 1000) {
                notifications.show({
                    color: 'blue',
                    title: '이미 피드백을 보내주셨어요',
                    message: '30일 후에 다시 받겠습니다. 감사합니다 🙏',
                    autoClose: 4000,
                });
                return;
            }
        } catch { /* SSR */ }
        ctl.open();
    };

    const handleSubmit = async () => {
        if (rating === 0) {
            notifications.show({ color: 'orange', title: '평점 필요', message: '별점을 선택해주세요' });
            return;
        }
        setBusy(true);
        try {
            const r = await submitFeedback({ rating, comment, context: pathname || undefined });
            if (!r.ok) throw new Error(r.error || '실패');
            try { localStorage.setItem('amakers_feedback_at', String(Date.now())); } catch { /* ignore */ }
            notifications.show({
                color: 'teal',
                title: '🙏 피드백 감사합니다',
                message: rating <= 2 ? '바로 개선하겠습니다!' : '소중한 의견 잘 받았습니다',
                autoClose: 5000,
            });
            ctl.close();
            setRating(0);
            setComment('');
        } catch (e: any) {
            notifications.show({ color: 'red', title: '실패', message: e?.message || '실패' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <Tooltip label="💬 피드백 보내기" position="left" withArrow>
                <ActionIcon
                    size="lg"
                    variant="light"
                    color="grape"
                    onClick={handleOpen}
                    style={{
                        position: 'fixed',
                        bottom: 84,
                        right: 16,
                        zIndex: 100,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                    aria-label="피드백"
                >
                    <IconMessage size={18} />
                </ActionIcon>
            </Tooltip>

            <Modal opened={opened} onClose={ctl.close} title="💬 어떻게 사용하고 계세요?" size="sm">
                <Stack gap="md">
                    <Text size="sm" c="dimmed">
                        솔직한 한 마디가 마케팅봇을 더 좋게 만듭니다.
                    </Text>

                    <Box>
                        <Text size="sm" fw={600} mb="xs">전반적인 만족도</Text>
                        <Group gap={6} justify="center">
                            {[1, 2, 3, 4, 5].map(n => {
                                const active = (hovered || rating) >= n;
                                return (
                                    <UnstyledButton
                                        key={n}
                                        onClick={() => setRating(n)}
                                        onMouseEnter={() => setHovered(n)}
                                        onMouseLeave={() => setHovered(0)}
                                        style={{ padding: 4 }}
                                        aria-label={`${n}점`}
                                    >
                                        {active
                                            ? <IconStarFilled size={32} color="var(--mantine-color-yellow-5)" />
                                            : <IconStar size={32} color="var(--mantine-color-gray-4)" />}
                                    </UnstyledButton>
                                );
                            })}
                        </Group>
                        {rating > 0 && (
                            <Text size="xs" c="dimmed" ta="center" mt={6}>
                                {rating === 5 ? '👍 정말 좋아요' :
                                 rating === 4 ? '😊 만족스러워요' :
                                 rating === 3 ? '🙂 그저 그래요' :
                                 rating === 2 ? '😐 아쉬워요' : '😞 개선 필요'}
                            </Text>
                        )}
                    </Box>

                    <Textarea
                        label="코멘트 (선택)"
                        placeholder="가장 마음에 드는 점, 가장 불편한 점, 추가됐으면 하는 기능 등 자유롭게..."
                        autosize
                        minRows={3}
                        maxRows={8}
                        value={comment}
                        onChange={(e) => setComment(e.currentTarget.value)}
                    />

                    <Group justify="flex-end">
                        <Button variant="subtle" onClick={ctl.close}>취소</Button>
                        <Button onClick={handleSubmit} loading={busy} color="grape" disabled={rating === 0}>
                            🚀 보내기
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </>
    );
}
