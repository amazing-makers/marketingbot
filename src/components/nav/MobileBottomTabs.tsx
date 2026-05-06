'use client';

import { Box, Group, UnstyledButton, Text, Indicator } from '@mantine/core';
import {
    IconDashboard, IconCalendarEvent, IconCalendarMonth, IconBolt, IconUserCircle,
} from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Tab {
    href: string;
    label: string;
    icon: React.ReactNode;
    matchPaths?: string[];
}

const TABS: Tab[] = [
    { href: '/dashboard', label: '홈', icon: <IconDashboard size={20} stroke={1.7} />, matchPaths: ['/dashboard'] },
    { href: '/dashboard/campaigns', label: '발행', icon: <IconCalendarEvent size={20} stroke={1.7} />, matchPaths: ['/dashboard/campaigns'] },
    { href: '/dashboard/campaigns/calendar', label: '캘린더', icon: <IconCalendarMonth size={20} stroke={1.7} />, matchPaths: ['/calendar'] },
    { href: '/dashboard/campaigns/series', label: '자동발행', icon: <IconBolt size={20} stroke={1.7} />, matchPaths: ['/series'] },
    { href: '/dashboard/settings/profile', label: '내 정보', icon: <IconUserCircle size={20} stroke={1.7} />, matchPaths: ['/settings'] },
];

/**
 * Phase 41 — 모바일 하단 고정 Tab Bar (sm 미만에서만 표시).
 * iOS/Android 네이티브 앱 스타일. 5개 핵심 메뉴.
 *
 * AppShell.Main 의 padding-bottom 을 64px 늘려야 마지막 콘텐츠가 안 가려짐.
 */
export default function MobileBottomTabs() {
    const pathname = usePathname();

    const isActive = (tab: Tab) => {
        if (!pathname) return false;
        // 정확 매치 우선 (홈)
        if (tab.matchPaths?.includes(pathname)) return true;
        // 캠페인 발행: /dashboard/campaigns 시작 + /calendar /series 제외
        if (tab.href === '/dashboard/campaigns') {
            return pathname.startsWith('/dashboard/campaigns')
                && !pathname.includes('/calendar')
                && !pathname.includes('/series');
        }
        // 부분 매치 (matchPaths 가 startsWith 또는 includes)
        return tab.matchPaths?.some(p => pathname.includes(p)) || false;
    };

    return (
        <Box
            hiddenFrom="sm"
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 100,
                background: 'var(--mantine-color-body)',
                borderTop: '1px solid var(--mantine-color-default-border)',
                paddingBottom: 'env(safe-area-inset-bottom, 0)',
            }}
        >
            <Group gap={0} grow style={{ height: 56 }}>
                {TABS.map(tab => {
                    const active = isActive(tab);
                    return (
                        <UnstyledButton
                            key={tab.href}
                            component={Link}
                            href={tab.href}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 2,
                                padding: '6px 0',
                                color: active ? 'var(--mantine-color-violet-6)' : 'var(--mantine-color-dimmed)',
                                position: 'relative',
                            }}
                        >
                            {active && (
                                <Box style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: '20%',
                                    right: '20%',
                                    height: 2,
                                    background: 'var(--mantine-color-violet-6)',
                                    borderRadius: '0 0 2px 2px',
                                }} />
                            )}
                            {tab.icon}
                            <Text size="10px" fw={active ? 700 : 500}>{tab.label}</Text>
                        </UnstyledButton>
                    );
                })}
            </Group>
        </Box>
    );
}
