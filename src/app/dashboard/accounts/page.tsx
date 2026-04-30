"use client";

import { Title, Button, Group, Stack, Paper, Text, Table } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';

export default function AccountsPage() {
  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>SNS 계정 관리</Title>
        <Button leftSection={<IconPlus size={16} />}>계정 추가</Button>
      </Group>

      <Paper withBorder radius="md">
        <Table verticalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>플랫폼</Table.Th>
              <Table.Th>계정명</Table.Th>
              <Table.Th>상태</Table.Th>
              <Table.Th>연동일</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr>
              <Table.Td colSpan={5} ta="center">
                <Text c="dimmed" py={40}>등록된 SNS 계정이 없습니다.</Text>
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}
