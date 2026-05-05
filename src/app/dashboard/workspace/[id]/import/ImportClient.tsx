'use client';

import {
    Container, Title, Text, Stack, Group, Paper, Card, Badge, Button, Anchor, Box,
    Checkbox, Tabs, Alert, SimpleGrid, ScrollArea, Table,
} from '@mantine/core';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import {
    IconBuildingStore, IconFileImport, IconWorld, IconSpeakerphone, IconBolt, IconArrowRight, IconAlertCircle,
} from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';
import { moveDataToWorkspace } from '@/app/actions/dataImportActions';

interface ChannelItem { id: string; type: string; accountName: string; status: string; region: string; createdAt: string; }
interface CampaignItem { id: string; name: string; status: string; scheduledAt: string | null; createdAt: string; }
interface SeriesItem { id: string; name: string; status: string; totalPosts: number; completedPosts: number; createdAt: string; }

interface Data {
    channels: ChannelItem[];
    campaigns: CampaignItem[];
    series: SeriesItem[];
    totals: { channels: number; campaigns: number; series: number };
}

export default function ImportClient({
    workspaceId,
    workspaceName,
    brandColor,
    data,
}: {
    workspaceId: string;
    workspaceName: string;
    brandColor: string | null;
    data: Data;
}) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [selChannels, setSelChannels] = useState<Set<string>>(new Set());
    const [selCampaigns, setSelCampaigns] = useState<Set<string>>(new Set());
    const [selSeries, setSelSeries] = useState<Set<string>>(new Set());

    const totalSelected = selChannels.size + selCampaigns.size + selSeries.size;

    const toggleAll = (kind: 'channels' | 'campaigns' | 'series') => {
        if (kind === 'channels') {
            if (selChannels.size === data.channels.length) setSelChannels(new Set());
            else setSelChannels(new Set(data.channels.map(c => c.id)));
        } else if (kind === 'campaigns') {
            if (selCampaigns.size === data.campaigns.length) setSelCampaigns(new Set());
            else setSelCampaigns(new Set(data.campaigns.map(c => c.id)));
        } else {
            if (selSeries.size === data.series.length) setSelSeries(new Set());
            else setSelSeries(new Set(data.series.map(s => s.id)));
        }
    };

    const toggleOne = (kind: 'channels' | 'campaigns' | 'series', id: string) => {
        const setMap = { channels: selChannels, campaigns: selCampaigns, series: selSeries }[kind];
        const setterMap = { channels: setSelChannels, campaigns: setSelCampaigns, series: setSelSeries }[kind];
        const next = new Set(setMap);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setterMap(next);
    };

    const handleMove = async () => {
        if (totalSelected === 0) {
            notifications.show({ color: 'orange', title: '선택 없음', message: '이동할 항목을 선택해주세요' });
            return;
        }
        if (!confirm(`총 ${totalSelected}개 항목을 "${workspaceName}" 워크스페이스로 이동합니다.\n\n이동 후에는 해당 워크스페이스 활성화 시에만 보입니다.\n계속하시겠습니까?`)) return;

        setBusy(true);
        try {
            const r = await moveDataToWorkspace({
                workspaceId,
                channelIds: Array.from(selChannels),
                campaignIds: Array.from(selCampaigns),
                seriesIds: Array.from(selSeries),
            });
            if (!r.ok) {
                notifications.show({ color: 'red', title: '실패', message: r.error || '실패' });
                return;
            }
            const m = r.moved;
            const total = m.channels + m.campaigns + m.series + m.campaignsFromSeries;
            notifications.show({
                color: 'teal',
                title: `✅ ${total}개 항목 이동 완료`,
                message: `채널 ${m.channels} · 캠페인 ${m.campaigns} (+ 시리즈 파생 ${m.campaignsFromSeries}) · 시리즈 ${m.series}`,
                autoClose: 6000,
            });
            router.push(`/dashboard/workspace/${workspaceId}`);
            router.refresh();
        } catch (e: any) {
            notifications.show({ color: 'red', title: '실패', message: e?.message || '실패' });
        } finally {
            setBusy(false);
        }
    };

    const empty = data.totals.channels === 0 && data.totals.campaigns === 0 && data.totals.series === 0;

    return (
        <Container size="lg" py="xl">
            <Stack gap="md">
                {/* 헤더 */}
                <Stack gap={2}>
                    <Anchor component={Link} href={`/dashboard/workspace/${workspaceId}`} size="sm">← 워크스페이스로</Anchor>
                    <Group gap="sm" align="center">
                        <Box
                            style={{
                                width: 40, height: 40, borderRadius: 8,
                                background: brandColor || '#7C3AED',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontWeight: 700, fontSize: 16,
                            }}
                        >
                            {workspaceName.slice(0, 2).toUpperCase()}
                        </Box>
                        <Stack gap={0}>
                            <Group gap={4}><IconFileImport size={20} /><Title order={3}>{workspaceName} 으로 데이터 가져오기</Title></Group>
                            <Text size="sm" c="dimmed">개인 모드의 채널·캠페인·시리즈를 이 워크스페이스로 옮길 수 있어요</Text>
                        </Stack>
                    </Group>
                </Stack>

                {empty ? (
                    <Paper withBorder p="xl" radius="md">
                        <Stack gap="sm" align="center">
                            <IconFileImport size={48} style={{ opacity: 0.3 }} />
                            <Text fw={700}>이동할 데이터가 없습니다</Text>
                            <Text size="sm" c="dimmed" ta="center">
                                개인 모드 (워크스페이스 미배정) 의 채널·캠페인·시리즈가 없어요.<br />
                                새로 만든 데이터부터 자동으로 활성 워크스페이스에 저장됩니다.
                            </Text>
                            <Button component={Link} href={`/dashboard/workspace/${workspaceId}`} variant="light">
                                워크스페이스로 돌아가기
                            </Button>
                        </Stack>
                    </Paper>
                ) : (
                    <>
                        <Alert color="blue" variant="light" icon={<IconAlertCircle size={16} />}>
                            <Text size="sm">
                                이동 후에는 <strong>{workspaceName}</strong> 워크스페이스를 활성화한 상태에서만 이 데이터가 보입니다.
                                개인 모드에서는 표시되지 않아요. (Owner 권한이 있다면 다시 회수 가능)
                            </Text>
                        </Alert>

                        <Tabs defaultValue="channels">
                            <Tabs.List>
                                <Tabs.Tab value="channels" leftSection={<IconWorld size={14} />}>
                                    채널 ({selChannels.size}/{data.totals.channels})
                                </Tabs.Tab>
                                <Tabs.Tab value="campaigns" leftSection={<IconSpeakerphone size={14} />}>
                                    캠페인 ({selCampaigns.size}/{data.totals.campaigns})
                                </Tabs.Tab>
                                <Tabs.Tab value="series" leftSection={<IconBolt size={14} />}>
                                    자동 발행 ({selSeries.size}/{data.totals.series})
                                </Tabs.Tab>
                            </Tabs.List>

                            <Tabs.Panel value="channels" pt="md">
                                <Paper withBorder p="md" radius="md">
                                    <Group justify="space-between" mb="sm">
                                        <Text fw={700} size="sm">개인 모드 채널 {data.totals.channels}개</Text>
                                        {data.channels.length > 0 && (
                                            <Button size="compact-xs" variant="subtle" onClick={() => toggleAll('channels')}>
                                                {selChannels.size === data.channels.length ? '전체 해제' : '전체 선택'}
                                            </Button>
                                        )}
                                    </Group>
                                    {data.channels.length === 0 ? (
                                        <Text size="sm" c="dimmed" ta="center" py="lg">개인 모드 채널이 없어요</Text>
                                    ) : (
                                        <ScrollArea.Autosize mah={420}>
                                            <Table highlightOnHover>
                                                <Table.Thead>
                                                    <Table.Tr>
                                                        <Table.Th w={40}></Table.Th>
                                                        <Table.Th>타입</Table.Th>
                                                        <Table.Th>계정명</Table.Th>
                                                        <Table.Th>상태</Table.Th>
                                                        <Table.Th>등록일</Table.Th>
                                                    </Table.Tr>
                                                </Table.Thead>
                                                <Table.Tbody>
                                                    {data.channels.map(c => (
                                                        <Table.Tr key={c.id} onClick={() => toggleOne('channels', c.id)} style={{ cursor: 'pointer' }}>
                                                            <Table.Td><Checkbox checked={selChannels.has(c.id)} readOnly /></Table.Td>
                                                            <Table.Td><Badge size="xs" variant="light">{c.type}</Badge></Table.Td>
                                                            <Table.Td><Text size="sm">{c.accountName}</Text></Table.Td>
                                                            <Table.Td>
                                                                <Badge size="xs" color={c.status === 'ACTIVE' ? 'teal' : 'gray'} variant="light">
                                                                    {c.status}
                                                                </Badge>
                                                            </Table.Td>
                                                            <Table.Td><Text size="xs" c="dimmed">{dayjs(c.createdAt).format('YY-MM-DD')}</Text></Table.Td>
                                                        </Table.Tr>
                                                    ))}
                                                </Table.Tbody>
                                            </Table>
                                        </ScrollArea.Autosize>
                                    )}
                                </Paper>
                            </Tabs.Panel>

                            <Tabs.Panel value="campaigns" pt="md">
                                <Paper withBorder p="md" radius="md">
                                    <Group justify="space-between" mb="sm">
                                        <Text fw={700} size="sm">개인 모드 캠페인 {data.totals.campaigns}개</Text>
                                        {data.campaigns.length > 0 && (
                                            <Button size="compact-xs" variant="subtle" onClick={() => toggleAll('campaigns')}>
                                                {selCampaigns.size === data.campaigns.length ? '전체 해제' : '전체 선택'}
                                            </Button>
                                        )}
                                    </Group>
                                    {data.campaigns.length === 0 ? (
                                        <Text size="sm" c="dimmed" ta="center" py="lg">개인 모드 캠페인이 없어요</Text>
                                    ) : (
                                        <ScrollArea.Autosize mah={420}>
                                            <Table highlightOnHover>
                                                <Table.Thead>
                                                    <Table.Tr>
                                                        <Table.Th w={40}></Table.Th>
                                                        <Table.Th>이름</Table.Th>
                                                        <Table.Th>상태</Table.Th>
                                                        <Table.Th>예약 시간</Table.Th>
                                                    </Table.Tr>
                                                </Table.Thead>
                                                <Table.Tbody>
                                                    {data.campaigns.map(c => (
                                                        <Table.Tr key={c.id} onClick={() => toggleOne('campaigns', c.id)} style={{ cursor: 'pointer' }}>
                                                            <Table.Td><Checkbox checked={selCampaigns.has(c.id)} readOnly /></Table.Td>
                                                            <Table.Td><Text size="sm">{c.name}</Text></Table.Td>
                                                            <Table.Td><Badge size="xs" variant="light">{c.status}</Badge></Table.Td>
                                                            <Table.Td><Text size="xs" c="dimmed">{c.scheduledAt ? dayjs(c.scheduledAt).format('YY-MM-DD HH:mm') : '-'}</Text></Table.Td>
                                                        </Table.Tr>
                                                    ))}
                                                </Table.Tbody>
                                            </Table>
                                        </ScrollArea.Autosize>
                                    )}
                                </Paper>
                            </Tabs.Panel>

                            <Tabs.Panel value="series" pt="md">
                                <Paper withBorder p="md" radius="md">
                                    <Group justify="space-between" mb="sm">
                                        <Text fw={700} size="sm">개인 모드 자동 발행 시리즈 {data.totals.series}개</Text>
                                        {data.series.length > 0 && (
                                            <Button size="compact-xs" variant="subtle" onClick={() => toggleAll('series')}>
                                                {selSeries.size === data.series.length ? '전체 해제' : '전체 선택'}
                                            </Button>
                                        )}
                                    </Group>
                                    <Alert color="orange" variant="light" mb="sm" icon={<IconAlertCircle size={14} />}>
                                        <Text size="xs">
                                            시리즈를 옮기면 그 시리즈가 만든 모든 캠페인도 함께 워크스페이스로 이동합니다.
                                        </Text>
                                    </Alert>
                                    {data.series.length === 0 ? (
                                        <Text size="sm" c="dimmed" ta="center" py="lg">개인 모드 시리즈가 없어요</Text>
                                    ) : (
                                        <ScrollArea.Autosize mah={420}>
                                            <Table highlightOnHover>
                                                <Table.Thead>
                                                    <Table.Tr>
                                                        <Table.Th w={40}></Table.Th>
                                                        <Table.Th>이름</Table.Th>
                                                        <Table.Th>상태</Table.Th>
                                                        <Table.Th>진행</Table.Th>
                                                    </Table.Tr>
                                                </Table.Thead>
                                                <Table.Tbody>
                                                    {data.series.map(s => (
                                                        <Table.Tr key={s.id} onClick={() => toggleOne('series', s.id)} style={{ cursor: 'pointer' }}>
                                                            <Table.Td><Checkbox checked={selSeries.has(s.id)} readOnly /></Table.Td>
                                                            <Table.Td><Text size="sm">{s.name}</Text></Table.Td>
                                                            <Table.Td><Badge size="xs" variant="light">{s.status}</Badge></Table.Td>
                                                            <Table.Td><Text size="xs">{s.completedPosts}/{s.totalPosts}</Text></Table.Td>
                                                        </Table.Tr>
                                                    ))}
                                                </Table.Tbody>
                                            </Table>
                                        </ScrollArea.Autosize>
                                    )}
                                </Paper>
                            </Tabs.Panel>
                        </Tabs>

                        <Group justify="space-between" mt="md">
                            <Text size="sm" c="dimmed">
                                선택: 채널 {selChannels.size} · 캠페인 {selCampaigns.size} · 시리즈 {selSeries.size} (총 {totalSelected}개)
                            </Text>
                            <Group>
                                <Button variant="subtle" component={Link} href={`/dashboard/workspace/${workspaceId}`}>취소</Button>
                                <Button
                                    color="violet"
                                    leftSection={<IconArrowRight size={14} />}
                                    onClick={handleMove}
                                    loading={busy}
                                    disabled={totalSelected === 0}
                                >
                                    🚚 {totalSelected}개 항목 옮기기
                                </Button>
                            </Group>
                        </Group>
                    </>
                )}
            </Stack>
        </Container>
    );
}
