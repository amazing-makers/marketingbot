import { CHANGELOG, LATEST_VERSION } from '@/lib/changelog';
import { Stack, Title, Text, Paper, Badge, Group, Box, List } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';

export const metadata = { title: '변경사항 | 마케팅봇' };
export const dynamic = 'force-dynamic';

const CATEGORY_COLOR: Record<string, string> = {
    feature: 'violet',
    improvement: 'blue',
    fix: 'orange',
};

const CATEGORY_LABEL: Record<string, string> = {
    feature: '🎁 신규',
    improvement: '✨ 개선',
    fix: '🔧 수정',
};

export default function ChangelogPage() {
    const userFacing = CHANGELOG.filter(c => c.userFacing);

    return (
        <Stack gap="md">
            <Stack gap={2}>
                <Group gap={6}>
                    <IconSparkles size={24} color="var(--mantine-color-violet-6)" />
                    <Title order={2}>✨ 변경사항</Title>
                    <Badge size="sm" color="violet" variant="light">최신: {LATEST_VERSION}</Badge>
                </Group>
                <Text size="sm" c="dimmed">
                    마케팅봇이 어떻게 발전하고 있는지 확인하세요. 새 기능 제안은 우하단 💬 피드백 버튼을 눌러주세요.
                </Text>
            </Stack>

            <Stack gap="md">
                {userFacing.map((entry, idx) => (
                    <Paper
                        key={entry.version}
                        withBorder
                        p="lg"
                        radius="md"
                        style={idx === 0 ? {
                            borderColor: 'var(--mantine-color-violet-4)',
                            borderWidth: 2,
                        } : undefined}
                    >
                        <Group justify="space-between" wrap="nowrap" mb="sm">
                            <Group gap={8}>
                                <Box style={{ fontSize: 28 }}>{entry.icon}</Box>
                                <Stack gap={0}>
                                    <Group gap={6}>
                                        <Text fw={700} size="lg">{entry.title}</Text>
                                        <Badge size="xs" color={CATEGORY_COLOR[entry.category]} variant="light">
                                            {CATEGORY_LABEL[entry.category]}
                                        </Badge>
                                        {idx === 0 && (
                                            <Badge size="xs" color="violet" variant="filled">최신</Badge>
                                        )}
                                    </Group>
                                    <Text size="xs" c="dimmed">{entry.date} · v{entry.version}</Text>
                                </Stack>
                            </Group>
                        </Group>
                        <List size="sm" spacing={4} pl="lg">
                            {entry.items.map((item, i) => (
                                <List.Item key={i}>
                                    <Text size="sm">{item}</Text>
                                </List.Item>
                            ))}
                        </List>
                    </Paper>
                ))}
            </Stack>

            <Paper withBorder p="md" radius="md" bg="var(--mantine-color-default-hover)">
                <Text size="xs" c="dimmed" ta="center">
                    더 오래된 변경사항은 GitHub 커밋 히스토리에서 확인할 수 있습니다.<br />
                    피드백·요청은 <a href="mailto:help@amakers.co.kr">help@amakers.co.kr</a> 또는 우하단 피드백 버튼.
                </Text>
            </Paper>
        </Stack>
    );
}
