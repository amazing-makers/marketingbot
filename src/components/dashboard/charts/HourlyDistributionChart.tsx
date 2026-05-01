'use client';
import { BarChart } from '@mantine/charts';
import { Paper, Title, Stack } from '@mantine/core';
import { EmptyChartState } from './EmptyChartState';

export function HourlyDistributionChart({ data }: { data: any[] }) {
    const hasData = data.some(d => d.count > 0);
    
    if (!hasData) {
        return <EmptyChartState title="시간대별 게시 패턴" message="발행 데이터 누적 후 표시됩니다" />;
    }
    
    return (
        <Paper withBorder p="lg" radius="md">
            <Stack gap="sm">
                <Title order={4}>시간대별 게시 패턴</Title>
                <BarChart
                    h={{ base: 200, md: 250 }}
                    data={data}
                    dataKey="hour"
                    series={[{ name: 'count', label: '게시 수', color: 'blue.5' }]}
                    withTooltip
                    tickLine="none"
                    gridAxis="y"
                />
            </Stack>
        </Paper>
    );
}
