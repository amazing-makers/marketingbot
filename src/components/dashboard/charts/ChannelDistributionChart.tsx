'use client';
import { DonutChart } from '@mantine/charts';
import { Paper, Title, Stack } from '@mantine/core';
import { EmptyChartState } from './EmptyChartState';

const CHANNEL_COLORS: Record<string, string> = {
    INSTAGRAM: 'pink.6',
    NAVER_BLOG: 'green.6',
    NAVER_CAFE: 'green.4',
    FACEBOOK: 'blue.6',
    THREADS: 'dark.6',
    X: 'gray.6',
    YOUTUBE: 'red.6',
};

export function ChannelDistributionChart({ data }: { data: any[] }) {
    if (data.length === 0) {
        return <EmptyChartState title="채널별 게시 비중" message="채널 등록 후 게시하면 표시됩니다" />;
    }
    
    const colored = data.map(d => ({
        ...d,
        color: CHANNEL_COLORS[d.type] || 'gray.5',
    }));
    
    return (
        <Paper withBorder p="lg" radius="md">
            <Stack gap="sm">
                <Title order={4}>채널별 게시 비중</Title>
                <DonutChart
                    h={{ base: 200, md: 250 }}
                    data={colored}
                    paddingAngle={3}
                    withLabelsLine
                    withLabels
                    chartLabel="채널 비중"
                />
            </Stack>
        </Paper>
    );
}
