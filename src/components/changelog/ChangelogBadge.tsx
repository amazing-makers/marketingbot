'use client';

import { ActionIcon, Tooltip, Indicator } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LATEST_VERSION, hasUnseenChanges } from '@/lib/changelog';

const KEY = 'amakers_changelog_last_seen';

/**
 * Phase 34 — 헤더에 ✨ 변경사항 버튼.
 * localStorage 의 마지막 본 버전과 LATEST_VERSION 비교 → 새 항목 있으면 dot indicator.
 * 클릭 시 /dashboard/changelog 로 이동 + localStorage 업데이트.
 */
export default function ChangelogBadge() {
    const [unseen, setUnseen] = useState(false);

    useEffect(() => {
        try {
            const saved = localStorage.getItem(KEY);
            setUnseen(hasUnseenChanges(saved));
        } catch { /* ignore */ }
    }, []);

    const markSeen = () => {
        try {
            localStorage.setItem(KEY, LATEST_VERSION);
        } catch { /* ignore */ }
        setUnseen(false);
    };

    return (
        <Tooltip label={unseen ? '✨ 새 기능 보기' : '변경사항'} withArrow>
            <Indicator
                color="violet"
                size={8}
                offset={4}
                disabled={!unseen}
                processing={unseen}
            >
                <ActionIcon
                    variant="subtle"
                    size="lg"
                    component={Link}
                    href="/dashboard/changelog"
                    onClick={markSeen}
                    aria-label="변경사항"
                >
                    <IconSparkles size={18} stroke={1.7} color={unseen ? 'var(--mantine-color-violet-6)' : undefined} />
                </ActionIcon>
            </Indicator>
        </Tooltip>
    );
}
