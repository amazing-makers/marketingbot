"use client";

import { Title, Text, SimpleGrid, Paper, Group, Button, Stack } from '@mantine/core';

export default function DashboardPage() {
  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>대시보드</Title>
        <Button variant="filled">새 예약 게시물</Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Paper withBorder p="md" radius="md">
          <Text size="xs" c="dimmed" fw={700}>연동된 계정</Text>
          <Text size="xl" fw={700}>0</Text>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Text size="xs" c="dimmed" fw={700}>예약 대기</Text>
          <Text size="xl" fw={700}>0</Text>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Text size="xs" c="dimmed" fw={700}>오늘 발행 완료</Text>
          <Text size="xl" fw={700}>0</Text>
        </Paper>
      </SimpleGrid>

      <Paper withBorder p="md" radius="md">
        <Title order={3} size="h4" mb="md">최근 예약 목록</Title>
        <Text c="dimmed" ta="center" py={40}>아직 예약된 게시물이 없습니다.</Text>
      </Paper>
    </Stack>
  );
}
