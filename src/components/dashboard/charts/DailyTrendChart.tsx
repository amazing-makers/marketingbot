'use client';
import { LineChart } from '@mantine/charts';
import { Paper, Title, Stack } from '@mantine/core';
import { EmptyChartState } from './EmptyChartState';

export function DailyTrendChart({ data, days }: { data: any[]; days: number }) {
    const hasData = data.length > 0 && data.some(d => d.total > 0);
    
    if (!hasData) {
        return <EmptyChartState title={`${days}일 게시 추이`} message="아직 발행된 게시물이 없습니다" />;
    }
    
    return (
        <Paper withBorder p="lg" radius="md">
            <Stack gap="sm">
                <Title order={4}>{days}일 게시 추이</Title>
                <LineChart
                    h={{ base: 200, md: 250 }}
                    data={data}
                    dataKey="date"
                    series={[
                        { name: 'success', label: '성공', color: 'teal.6' },
                        { name: 'failed', label: '실패', color: 'red.6' },
                    ]}
                    curveType="monotone"
                    withLegend
                    tickLine="none"
                    gridAxis="x"
                />
            </Stack>
        </Paper>
    );
}
