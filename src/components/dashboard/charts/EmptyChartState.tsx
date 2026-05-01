'use client';
import { Paper, Title, Stack, Center, Text, ThemeIcon } from '@mantine/core';
import { IconChartBar } from '@tabler/icons-react';

export function EmptyChartState({ title, message }: { title: string; message: string }) {
    return (
        <Paper withBorder p="lg" radius="md" h="100%" style={{ minHeight: 300 }}>
            <Stack gap="sm" h="100%">
                <Title order={4}>{title}</Title>
                <Center flex={1}>
                    <Stack gap="xs" align="center">
                        <ThemeIcon size={48} radius="xl" variant="light" color="gray">
                            <IconChartBar size={24} />
                        </ThemeIcon>
                        <Text size="sm" c="dimmed" ta="center" maw={200}>{message}</Text>
                    </Stack>
                </Center>
            </Stack>
        </Paper>
    );
}
