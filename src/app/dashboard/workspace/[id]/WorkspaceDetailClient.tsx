'use client';

import {
    Container, Title, Text, Stack, Group, Card, Badge, Button, Modal,
    TextInput, Select, Anchor, Box, Table, ActionIcon, Tooltip, Textarea, Alert,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { IconUsersGroup, IconUserPlus, IconCrown, IconTrash, IconEdit, IconMail, IconClock, IconBan, IconFileImport } from '@tabler/icons-react';
import Link from 'next/link';
import dayjs from 'dayjs';
import { removeWorkspaceMember, updateMemberRole } from '@/app/actions/workspaceActions';
import { inviteToWorkspace, revokeInvitation } from '@/app/actions/invitationActions';

interface Member {
    userId: string;
    email: string;
    name: string | null;
    role: string;
    joinedAt: string;
    isOwner: boolean;
    isMe: boolean;
    weekCampaigns?: number;
    monthCampaigns?: number;
    weekSeries?: number;
    monthSeries?: number;
}

interface PendingInvite {
    id: string;
    email: string;
    role: string;
    expiresAt: string;
    createdAt: string;
}

interface Data {
    workspace: {
        id: string;
        name: string;
        slug: string;
        plan: string;
        brandColor: string | null;
        logoUrl: string | null;
        description: string | null;
        ownerId: string;
        isOwner: boolean;
    };
    myRole: string;
    members: Member[];
    pendingInvitations: PendingInvite[];
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
    OWNER: { label: '소유자', color: 'yellow' },
    ADMIN: { label: '관리자', color: 'violet' },
    MEMBER: { label: '멤버', color: 'blue' },
    VIEWER: { label: '뷰어', color: 'gray' },
};

export default function WorkspaceDetailClient({ data }: { data: Data }) {
    const [busy, setBusy] = useState(false);
    const [inviteModal, inviteModalCtl] = useDisclosure(false);
    const [roleModal, roleModalCtl] = useDisclosure(false);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);

    const inviteForm = useForm({
        initialValues: {
            email: '',
            role: 'MEMBER' as 'ADMIN' | 'MEMBER' | 'VIEWER',
            message: '',
        },
        validate: {
            email: (v) => (/^\S+@\S+$/.test(v) ? null : '유효한 이메일'),
        },
    });

    const roleForm = useForm({
        initialValues: { role: 'MEMBER' as 'ADMIN' | 'MEMBER' | 'VIEWER' },
    });

    const canInvite = data.myRole === 'OWNER' || data.myRole === 'ADMIN';
    const canManage = data.workspace.isOwner;

    const handleInvite = async (values: typeof inviteForm.values) => {
        setBusy(true);
        try {
            const r = await inviteToWorkspace({
                workspaceId: data.workspace.id,
                email: values.email,
                role: values.role,
                message: values.message?.trim() || undefined,
            });
            if (!r.ok) {
                notifications.show({ color: 'orange', title: '초대 실패', message: r.error || '실패' });
                return;
            }
            if (r.type === 'instant_added') {
                notifications.show({ color: 'teal', title: '✅ 멤버 추가됨', message: `${values.email} (이미 가입된 사용자)` });
            } else {
                notifications.show({
                    color: 'teal',
                    title: '📧 초대 메일 발송됨',
                    message: `${values.email} — 7일 안에 수락하면 자동 합류`,
                    autoClose: 5000,
                });
            }
            inviteModalCtl.close();
            inviteForm.reset();
            window.location.reload();
        } catch (e: any) {
            notifications.show({ color: 'red', title: '실패', message: e?.message || '실패' });
        } finally {
            setBusy(false);
        }
    };

    const handleRevokeInvite = async (invId: string, email: string) => {
        if (!confirm(`${email} 의 초대를 취소하시겠습니까?`)) return;
        setBusy(true);
        try {
            const r = await revokeInvitation(invId);
            if (!r.ok) {
                notifications.show({ color: 'orange', title: '취소 실패', message: r.error || '실패' });
            } else {
                notifications.show({ color: 'teal', title: '초대 취소됨', message: email });
                window.location.reload();
            }
        } finally {
            setBusy(false);
        }
    };

    const handleRemove = async (member: Member) => {
        if (!confirm(`정말 ${member.email} 을(를) 워크스페이스에서 제거하시겠습니까?`)) return;
        setBusy(true);
        try {
            const r = await removeWorkspaceMember({ workspaceId: data.workspace.id, userId: member.userId });
            if (!r.ok) {
                notifications.show({ color: 'orange', title: '제거 실패', message: r.error || '실패' });
            } else {
                notifications.show({ color: 'teal', title: '제거됨', message: member.email });
                window.location.reload();
            }
        } finally {
            setBusy(false);
        }
    };

    const openRoleModal = (member: Member) => {
        setSelectedMember(member);
        roleForm.setValues({ role: (member.role as any) || 'MEMBER' });
        roleModalCtl.open();
    };

    const handleRoleChange = async (values: typeof roleForm.values) => {
        if (!selectedMember) return;
        setBusy(true);
        try {
            const r = await updateMemberRole({
                workspaceId: data.workspace.id,
                userId: selectedMember.userId,
                role: values.role,
            });
            if (!r.ok) {
                notifications.show({ color: 'orange', title: '변경 실패', message: r.error || '실패' });
            } else {
                notifications.show({ color: 'teal', title: '권한 변경됨', message: `${selectedMember.email} → ${ROLE_LABELS[values.role].label}` });
                roleModalCtl.close();
                window.location.reload();
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <Container size="lg" py="xl">
            <Stack gap="md">
                {/* 헤더 */}
                <Stack gap={2}>
                    <Anchor component={Link} href="/dashboard/workspace" size="sm">← 워크스페이스 목록</Anchor>
                    <Group gap="sm" align="center" justify="space-between" wrap="wrap">
                        <Group gap="sm">
                            <Box
                                style={{
                                    width: 48, height: 48, borderRadius: 10,
                                    background: data.workspace.brandColor || '#1D1D1B',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontWeight: 700, fontSize: 20,
                                }}
                            >
                                {data.workspace.name.slice(0, 2).toUpperCase()}
                            </Box>
                            <Stack gap={0}>
                                <Title order={2}>{data.workspace.name}</Title>
                                <Group gap={6}>
                                    <Text size="xs" c="dimmed">/{data.workspace.slug}</Text>
                                    <Badge size="xs" variant="light">{data.workspace.plan}</Badge>
                                    <Badge size="xs" color={ROLE_LABELS[data.myRole]?.color || 'gray'} variant="light">
                                        내 권한: {ROLE_LABELS[data.myRole]?.label || data.myRole}
                                    </Badge>
                                </Group>
                            </Stack>
                        </Group>
                        <Group gap="xs">
                            {canInvite && (
                                <Button
                                    component={Link}
                                    href={`/dashboard/workspace/${data.workspace.id}/import`}
                                    variant="light"
                                    leftSection={<IconFileImport size={14} />}
                                >
                                    데이터 가져오기
                                </Button>
                            )}
                            {canInvite && (
                                <Button color="violet" leftSection={<IconUserPlus size={16} />} onClick={inviteModalCtl.open}>
                                    멤버 초대
                                </Button>
                            )}
                        </Group>
                    </Group>
                </Stack>

                {/* 멤버 목록 */}
                <Card withBorder p="md" radius="md">
                    <Group gap={6} mb="sm"><IconUsersGroup size={18} /><Text fw={700}>멤버 ({data.members.length}명)</Text></Group>
                    <Table.ScrollContainer minWidth={780}>
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>이메일</Table.Th>
                                <Table.Th>이름</Table.Th>
                                <Table.Th>권한</Table.Th>
                                <Table.Th>이번 주 활동</Table.Th>
                                <Table.Th>최근 30일</Table.Th>
                                <Table.Th>가입일</Table.Th>
                                <Table.Th>액션</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {data.members.map(m => {
                                const week = (m.weekCampaigns || 0) + (m.weekSeries || 0);
                                const month = (m.monthCampaigns || 0) + (m.monthSeries || 0);
                                return (
                                <Table.Tr key={m.userId}>
                                    <Table.Td>
                                        <Group gap={6}>
                                            <Text size="sm">{m.email}</Text>
                                            {m.isMe && <Badge size="xs" variant="light" color="blue">나</Badge>}
                                        </Group>
                                    </Table.Td>
                                    <Table.Td><Text size="sm">{m.name || '-'}</Text></Table.Td>
                                    <Table.Td>
                                        <Badge
                                            size="sm"
                                            color={ROLE_LABELS[m.role]?.color || 'gray'}
                                            variant="light"
                                            leftSection={m.isOwner ? <IconCrown size={11} /> : undefined}
                                        >
                                            {ROLE_LABELS[m.role]?.label || m.role}
                                        </Badge>
                                    </Table.Td>
                                    {/* Phase 38 — 활동 통계 */}
                                    <Table.Td>
                                        {week > 0 ? (
                                            <Group gap={4}>
                                                <Badge size="xs" variant="light" color="blue">📋 {m.weekCampaigns || 0}</Badge>
                                                {(m.weekSeries || 0) > 0 && <Badge size="xs" variant="light" color="violet">🤖 {m.weekSeries}</Badge>}
                                            </Group>
                                        ) : (
                                            <Text size="11px" c="dimmed">활동 없음</Text>
                                        )}
                                    </Table.Td>
                                    <Table.Td>
                                        {month > 0 ? (
                                            <Text size="sm" fw={600}>{month}건</Text>
                                        ) : (
                                            <Text size="11px" c="dimmed">-</Text>
                                        )}
                                    </Table.Td>
                                    <Table.Td><Text size="xs" c="dimmed">{dayjs(m.joinedAt).format('YYYY-MM-DD')}</Text></Table.Td>
                                    <Table.Td>
                                        {canManage && !m.isOwner && (
                                            <Group gap={4}>
                                                <Tooltip label="권한 변경">
                                                    <ActionIcon size="sm" variant="light" onClick={() => openRoleModal(m)}>
                                                        <IconEdit size={13} />
                                                    </ActionIcon>
                                                </Tooltip>
                                                <Tooltip label="제거">
                                                    <ActionIcon size="sm" variant="light" color="red" onClick={() => handleRemove(m)} loading={busy}>
                                                        <IconTrash size={13} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            </Group>
                                        )}
                                    </Table.Td>
                                </Table.Tr>
                                );
                            })}
                        </Table.Tbody>
                    </Table>
                    </Table.ScrollContainer>
                </Card>

                {/* === 대기 중인 초대 === */}
                {data.pendingInvitations.length > 0 && (
                    <Card withBorder p="md" radius="md">
                        <Group gap={6} mb="sm">
                            <IconMail size={18} />
                            <Text fw={700}>대기 중인 초대 ({data.pendingInvitations.length})</Text>
                        </Group>
                        <Table>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>이메일</Table.Th>
                                    <Table.Th>권한</Table.Th>
                                    <Table.Th>발송일</Table.Th>
                                    <Table.Th>만료</Table.Th>
                                    <Table.Th>액션</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {data.pendingInvitations.map(inv => {
                                    const expired = new Date(inv.expiresAt) < new Date();
                                    const daysLeft = Math.max(0, Math.ceil((new Date(inv.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                                    return (
                                        <Table.Tr key={inv.id}>
                                            <Table.Td><Text size="sm">{inv.email}</Text></Table.Td>
                                            <Table.Td>
                                                <Badge size="sm" color={ROLE_LABELS[inv.role]?.color || 'gray'} variant="light">
                                                    {ROLE_LABELS[inv.role]?.label || inv.role}
                                                </Badge>
                                            </Table.Td>
                                            <Table.Td><Text size="xs" c="dimmed">{dayjs(inv.createdAt).format('YYYY-MM-DD HH:mm')}</Text></Table.Td>
                                            <Table.Td>
                                                <Group gap={4}>
                                                    <IconClock size={12} />
                                                    <Text size="xs" c={expired ? 'red' : daysLeft <= 1 ? 'orange' : 'dimmed'}>
                                                        {expired ? '만료됨' : `${daysLeft}일 남음`}
                                                    </Text>
                                                </Group>
                                            </Table.Td>
                                            <Table.Td>
                                                {canInvite && (
                                                    <Tooltip label="초대 취소">
                                                        <ActionIcon size="sm" variant="light" color="red" onClick={() => handleRevokeInvite(inv.id, inv.email)} loading={busy}>
                                                            <IconBan size={13} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                )}
                                            </Table.Td>
                                        </Table.Tr>
                                    );
                                })}
                            </Table.Tbody>
                        </Table>
                    </Card>
                )}
            </Stack>

            {/* 초대 모달 */}
            <Modal opened={inviteModal} onClose={inviteModalCtl.close} title="멤버 초대" size="md">
                <form onSubmit={inviteForm.onSubmit(handleInvite)}>
                    <Stack gap="sm">
                        <Alert color="blue" variant="light" icon={<IconMail size={14} />}>
                            <Text size="xs">
                                <strong>가입자</strong>: 즉시 멤버로 추가됩니다.<br />
                                <strong>미가입자</strong>: 초대 메일이 발송되어 7일 안에 가입+수락 시 자동 합류합니다.
                            </Text>
                        </Alert>
                        <TextInput
                            label="이메일"
                            placeholder="user@example.com"
                            required
                            {...inviteForm.getInputProps('email')}
                        />
                        <Select
                            label="권한"
                            data={[
                                { value: 'ADMIN', label: '관리자 (멤버 초대·관리 가능)' },
                                { value: 'MEMBER', label: '멤버 (캠페인 작성·발행)' },
                                { value: 'VIEWER', label: '뷰어 (읽기 전용)' },
                            ]}
                            allowDeselect={false}
                            {...inviteForm.getInputProps('role')}
                        />
                        <Textarea
                            label="초대 메시지 (선택)"
                            placeholder="안녕하세요! 저희 워크스페이스에 함께해주세요 😊"
                            autosize
                            minRows={2}
                            maxRows={5}
                            {...inviteForm.getInputProps('message')}
                        />
                        <Group justify="flex-end">
                            <Button variant="subtle" onClick={inviteModalCtl.close}>취소</Button>
                            <Button type="submit" loading={busy} color="violet">
                                {/* email 이 가입자면 즉시추가, 아니면 메일발송 — 상태 사전 판별 어려우니 통합 라벨 */}
                                초대 보내기
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>

            {/* 권한 변경 모달 */}
            <Modal opened={roleModal} onClose={roleModalCtl.close} title="권한 변경" size="sm">
                {selectedMember && (
                    <form onSubmit={roleForm.onSubmit(handleRoleChange)}>
                        <Stack gap="sm">
                            <Text size="sm">{selectedMember.email}</Text>
                            <Select
                                label="권한"
                                data={[
                                    { value: 'ADMIN', label: '관리자' },
                                    { value: 'MEMBER', label: '멤버' },
                                    { value: 'VIEWER', label: '뷰어' },
                                ]}
                                allowDeselect={false}
                                {...roleForm.getInputProps('role')}
                            />
                            <Group justify="flex-end">
                                <Button variant="subtle" onClick={roleModalCtl.close}>취소</Button>
                                <Button type="submit" loading={busy}>저장</Button>
                            </Group>
                        </Stack>
                    </form>
                )}
            </Modal>
        </Container>
    );
}
