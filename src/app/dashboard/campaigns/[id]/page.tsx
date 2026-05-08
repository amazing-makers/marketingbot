import { getCampaign, retryTask, executeTaskNow } from "@/app/actions/campaignActions";
import { CLOUD_PUBLISHED_CHANNELS } from '@/lib/publishers';
import { toFriendlyError } from '@/lib/publish-error-messages';
import {
  Title, Text, Card, Group, Stack, Badge, Table, Button,
  ActionIcon, Tooltip, Divider, Breadcrumbs, Anchor, SimpleGrid, Alert
} from '@mantine/core';
import {
  IconRefresh, IconBolt, IconAlertCircle
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

      {/* Phase 50 — 발행 결과 한눈에 보기 (성공/실패/실행중/대기) */}
      {(() => {
        const counts = campaign.tasks.reduce((acc, t) => {
          acc[t.status] = (acc[t.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const total = campaign.tasks.length;
        const success = counts.SUCCESS || 0;
        const failed = counts.FAILED || 0;
        const running = counts.RUNNING || 0;
        const pending = counts.PENDING || 0;
        return (
          <SimpleGrid cols={{ base: 2, md: 4 }} mb="xl">
            <Card withBorder radius="md" style={{ borderColor: success > 0 ? 'var(--mantine-color-teal-4)' : undefined }}>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">✅ 성공</Text>
              <Group align="baseline" gap={4}>
                <Text fw={700} size="xl" c="teal">{success}</Text>
                <Text size="sm" c="dimmed">/ {total}</Text>
              </Group>
            </Card>
            <Card withBorder radius="md" style={{ borderColor: failed > 0 ? 'var(--mantine-color-red-4)' : undefined }}>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">❌ 실패</Text>
              <Group align="baseline" gap={4}>
                <Text fw={700} size="xl" c={failed > 0 ? 'red' : 'dimmed'}>{failed}</Text>
                <Text size="sm" c="dimmed">/ {total}</Text>
              </Group>
              {failed > 0 && (
                <Text size="11px" c="dimmed" mt={4}>아래 표에서 사유 확인</Text>
              )}
            </Card>
            <Card withBorder radius="md" style={{ borderColor: running > 0 ? 'var(--mantine-color-blue-4)' : undefined }}>
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">⏳ 실행중</Text>
              <Text fw={700} size="xl" c={running > 0 ? 'blue' : 'dimmed'}>{running}</Text>
            </Card>
            <Card withBorder radius="md">
              <Text size="xs" c="dimmed" fw={700} tt="uppercase">📅 대기</Text>
              <Text fw={700} size="xl" c={pending > 0 ? 'gray' : 'dimmed'}>{pending}</Text>
              <Text size="11px" c="dimmed" mt={4}>
                예약: {dayjs(campaign.scheduledAt).format('MM-DD HH:mm')}
              </Text>
            </Card>
          </SimpleGrid>
        );
      })()}

      {/* 발행 실패가 1개 이상이면 페이지 상단에 큰 알람 노출 */}
      {(() => {
        const failedTasks = campaign.tasks.filter(t => t.status === 'FAILED');
        if (failedTasks.length === 0) return null;
        return (
          <Alert color="red" icon={<IconAlertCircle size={18} />} radius="md" mb="md">
            <Text fw={700} size="sm">
              {failedTasks.length}개 채널 발행에 실패했어요 — 아래 표에서 사유와 해결 방법을 확인해주세요.
            </Text>
          </Alert>
        );
      })()}

      <Card withBorder radius="md" p={0}>
        <Table.ScrollContainer minWidth={680}>
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
                  {task.errorLog && task.status === 'FAILED' ? (() => {
                    const f = toFriendlyError(task.errorLog);
                    return (
                      <Stack gap={2} maw={320}>
                        <Group gap={4} wrap="nowrap">
                          <IconAlertCircle size={12} color="var(--mantine-color-red-6)" style={{ flexShrink: 0 }} />
                          <Text size="xs" fw={600} c="red.7">{f.title}</Text>
                        </Group>
                        <Text size="11px" c="dimmed" lineClamp={2}>{f.detail}</Text>
                        {task.errorLog !== f.title && task.errorLog !== f.detail && (
                          <Tooltip label={task.errorLog} multiline w={400} withArrow>
                            <Text size="10px" c="dimmed" style={{ cursor: 'help', textDecoration: 'underline dotted' }}>
                              자세한 로그 보기
                            </Text>
                          </Tooltip>
                        )}
                      </Stack>
                    );
                  })() : task.errorLog ? (
                    /* SUCCESS / 메타로그 — 작게 dimmed */
                    <Text size="11px" c="dimmed" truncate maw={200}>{task.errorLog}</Text>
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
        </Table.ScrollContainer>
      </Card>
    </Stack>
  );
}
