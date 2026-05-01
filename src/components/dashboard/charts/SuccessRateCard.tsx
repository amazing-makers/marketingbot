'use client';
import { RingProgress, Paper, Title, Text, Stack, Group, Badge } from '@mantine/core';
import { EmptyChartState } from './EmptyChartState';

export function SuccessRateCard({ overall, total, byChannel }: any) {
    if (total === 0) {
        return <EmptyChartState title="성공률 분석" message="첫 게시 후 측정됩니다" />;
    }
    
    return (
        <Paper withBorder p="lg" radius="md">
            <Stack gap="sm">
                <Title order={4}>성공률 분석</Title>
                <Group justify="center" py="md">
                    <RingProgress
                        size={180}
                        thickness={16}
                        roundCaps
                        sections={[{ value: overall, color: overall >= 90 ? 'teal' : overall >= 70 ? 'yellow' : 'red' }]}
                        label={
                            <Stack gap={0} align="center">
                                <Text size="xl" fw={900}>{overall}%</Text>
                                <Text size="xs" c="dimmed">총 {total}건</Text>
                            </Stack>
                        }
                    />
                </Group>
                <Stack gap={8}>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">채널별 성과 (Top 5)</Text>
                    {byChannel.slice(0, 5).map((c: any) => (
                        <Group key={c.channelType} justify="space-between">
                            <Group gap="xs">
                                <Badge variant="dot" color={c.successRate >= 90 ? 'teal' : c.successRate >= 70 ? 'yellow' : 'red'}>
                                    {c.channelType}
                                </Badge>
                                <Text size="sm">{c.channelType}</Text>
                            </Group>
                            <Text size="sm" fw={600}>{c.successRate}% <Text component="span" size="xs" c="dimmed" fw={400}>({c.total}건)</Text></Text>
                        </Group>
                    ))}
                </Stack>
            </Stack>
        </Paper>
    );
}
