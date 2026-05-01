import { listCampaigns } from "@/app/actions/campaignActions";
import { Table, Group, Text, Badge, Button, Stack, Title, Anchor, Card } from '@mantine/core';
import { IconPlus, IconCalendar, IconChevronRight } from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';

export default async function CampaignsPage() {
  const campaigns = await listCampaigns();

  const rows = campaigns.map((campaign) => (
    <Table.Tr key={campaign.id} style={{ cursor: 'pointer' }}>
      <Table.Td>
        <Anchor component={Link} href={`/dashboard/campaigns/${campaign.id}`} fw={500}>
          {campaign.name}
        </Anchor>
      </Table.Td>
      <Table.Td>
        <Badge variant="light" color={campaign.status === 'SCHEDULED' ? 'blue' : 'green'}>
          {campaign.status}
        </Badge>
      </Table.Td>
      <Table.Td>{campaign._count.tasks}개 채널</Table.Td>
      <Table.Td>
        <Group gap="xs">
          <IconCalendar size={14} color="gray" />
          <Text size="sm">{campaign.scheduledAt ? dayjs(campaign.scheduledAt).format('YYYY-MM-DD HH:mm') : '-'}</Text>
        </Group>
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">{dayjs(campaign.createdAt).format('YYYY-MM-DD')}</Text>
      </Table.Td>
      <Table.Td>
        <Anchor component={Link} href={`/dashboard/campaigns/${campaign.id}`}>
          <IconChevronRight size={16} />
        </Anchor>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>캠페인 관리</Title>
        <Button component={Link} href="/dashboard/campaigns/new" leftSection={<IconPlus size={16} />}>
          새 캠페인 작성
        </Button>
      </Group>

      <Card withBorder radius="md" p={0}>
        <Table verticalSpacing="md" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>캠페인명</Table.Th>
              <Table.Th>상태</Table.Th>
              <Table.Th>대상</Table.Th>
              <Table.Th>예약일시</Table.Th>
              <Table.Th>생성일</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Card>
      
      {campaigns.length === 0 && (
        <Text ta="center" c="dimmed" my="xl">생성된 캠페인이 없습니다. 첫 캠페인을 작성해보세요!</Text>
      )}
    </Stack>
  );
}
