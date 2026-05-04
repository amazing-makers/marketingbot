import { getCampaign, retryTask, executeTaskNow } from "@/app/actions/campaignActions";
import { CLOUD_PUBLISHED_CHANNELS } from '@/lib/publishers';
import {
  Title, Text, Card, Group, Stack, Badge, Table, Button,
  ActionIcon, Tooltip, Divider, Breadcrumbs, Anchor, SimpleGrid
} from '@mantine/core';
import {
  IconRefresh, IconBolt
} from '@tabler/icons-react';
import { revalidatePath } from 'next/cache';
import dayjs from 'dayjs';

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
  const campaign = await getCampaign(params.id);

  if (!campaign) return <Text>캠페인을 찾을 수 없습니다.</Text>;

  const handleRetry = async (taskId: string) => {
    "use server";
    await retryTask(taskId);
    revalidatePath(`/dashboard/campaigns/${params.id}`);
  };

  const handlePublishNow = async (taskId: string) => {
    "use server";
    await executeTaskNow(taskId);
    revalidatePath(`/dashboard/campaigns/${params.id}`);
  };

  const statusColors: Record<string, string> = {
    PENDING: 'gray',
    RUNNING: 'blue',
    SUCCESS: 'green',
    FAILED: 'red',
    CANCELLED: 'yellow',
  };

  return (
    <Stack>
      <Breadcrumbs mb="xs">
        <Anchor component="a" href="/dashboard/campaigns">캠페인 목록</Anchor>
        <Text size="sm">상세 정보</Text>
      </Breadcrumbs>

      <Group justify="space-between">
        <Stack gap={0}>
          <Title order={2}>{campaign.name}</Title>
          <Text c="dimmed" size="sm">{campaign.description || '설명 없음'}</Text>
        </Stack>
        <Badge size="xl" variant="dot" color={campaign.status === 'SCHEDULED' ? 'blue' : 'green'}>
          {campaign.status}
        </Badge>
      </Group>

      <Divider my="md" />

      <SimpleGrid cols={{ base: 1, md: 3 }} mb="xl">
        <Card withBorder radius="md">
          <Text size="xs" c="dimmed" fw={700} tt="uppercase">예약 시각</Text>
          <Text fw={500}>{dayjs(campaign.scheduledAt).format('YYYY-MM-DD HH:mm')}</Text>
        </Card>
        <Card withBorder radius="md">
          <Text size="xs" c="dimmed" fw={700} tt="uppercase">생성일</Text>
          <Text fw={500}>{dayjs(campaign.createdAt).format('YYYY-MM-DD')}</Text>
        </Card>
        <Card withBorder radius="md">
          <Text size="xs" c="dimmed" fw={700} tt="uppercase">채널 수</Text>
          <Text fw={500}>{campaign.tasks.length}개</Text>
        </Card>
      </SimpleGrid>

      <Card withBorder radius="md" p={0}>
        <Table verticalSpacing="md" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>발행 채널</Table.Th>
              <Table.Th>상태</Table.Th>
              <Table.Th>실행 시각</Table.Th>
              <Table.Th>에러 로그</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {campaign.tasks.map((task) => (
              <Table.Tr key={task.id}>
                <Table.Td>
                  <Group gap="xs">
                    <Text fw={500}>{task.channel.accountName}</Text>
                    <Badge size="xs" variant="outline">{task.channel.type}</Badge>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge color={statusColors[task.status]} variant="light">
                    {task.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{task.executedAt ? dayjs(task.executedAt).format('HH:mm:ss') : '-'}</Text>
                </Table.Td>
                <Table.Td>
                  {task.errorLog ? (
                    <Tooltip label={task.errorLog}>
                      <Text size="xs" c="red" truncate="end" maw={200} style={{ cursor: 'help' }}>
                        {task.errorLog}
                      </Text>
                    </Tooltip>
                  ) : '-'}
                </Table.Td>
                <Table.Td>
                  <Group gap={4} wrap="nowrap">
                    {(task.status === 'PENDING' || task.status === 'FAILED') &&
                      CLOUD_PUBLISHED_CHANNELS.has(task.channel.type) && (
                        <form action={handlePublishNow.bind(null, task.id)}>
                          <Tooltip label="에이전트 거치지 않고 클라우드에서 즉시 발행">
                            <Button variant="filled" color="violet" size="xs"
                              leftSection={<IconBolt size={14} />} type="submit">
                              지금 발행
                            </Button>
                          </Tooltip>
                        </form>
                      )}
                    {task.status === 'FAILED' && (
                      <form action={handleRetry.bind(null, task.id)}>
                        <Button variant="subtle" size="xs"
                          leftSection={<IconRefresh size={14} />} type="submit">
                          재시도
                        </Button>
                      </form>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
    </Stack>
  );
}
