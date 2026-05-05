'use client';

import {
    Container, Title, Text, Stack, Group, Paper, Card, Badge, Button, Modal,
    TextInput, Textarea, Select, ActionIcon, CopyButton, Tooltip, SimpleGrid, Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { IconBookmark, IconPlus, IconCopy, IconCheck, IconTrash, IconEdit } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { createTemplate, updateTemplate, deleteTemplate } from '@/app/actions/templateActions';

interface Template {
    id: string;
    name: string;
    body: string;
    hashtags: string | null;
    category: string | null;
    usageCount: number;
    lastUsedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

const CATEGORIES = ['카페·디저트', '식당', '뷰티·화장품', '의류·패션', '헬스·요가', '교육·강의', 'IT·SaaS', '여행·숙박', '기타'];

export default function LibraryClient({ initialTemplates }: { initialTemplates: Template[] }) {
    const [templates, setTemplates] = useState(initialTemplates);
    const [editModal, editModalCtl] = useDisclosure(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const form = useForm({
        initialValues: { name: '', body: '', hashtags: '', category: '' },
        validate: {
            name: (v) => (v.trim().length < 2 ? '이름 2자 이상' : null),
            body: (v) => (v.trim().length < 5 ? '본문 5자 이상' : null),
        },
    });

    const openCreate = () => {
        setEditingId(null);
        form.reset();
        editModalCtl.open();
    };

    const openEdit = (t: Template) => {
        setEditingId(t.id);
        form.setValues({
            name: t.name,
            body: t.body,
            hashtags: t.hashtags || '',
            category: t.category || '',
        });
        editModalCtl.open();
    };

    const handleSubmit = async (values: typeof form.values) => {
        setBusy(true);
        try {
            if (editingId) {
                await updateTemplate({ id: editingId, ...values });
                notifications.show({ color: 'teal', title: '저장됨', message: values.name });
            } else {
                const r = await createTemplate(values);
                notifications.show({ color: 'teal', title: '✨ 템플릿 추가', message: r.name });
            }
            editModalCtl.close();
            window.location.reload();
        } catch (e: any) {
            notifications.show({ color: 'red', title: '실패', message: e?.message || '실패' });
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async (t: Template) => {
        if (!confirm(`"${t.name}" 템플릿을 삭제하시겠습니까?`)) return;
        setBusy(true);
        try {
            await deleteTemplate(t.id);
            setTemplates(prev => prev.filter(p => p.id !== t.id));
            notifications.show({ color: 'gray', title: '삭제됨', message: t.name });
        } finally {
            setBusy(false);
        }
    };

    const fullText = (t: Template) => t.body + (t.hashtags ? '\n\n' + t.hashtags : '');

    return (
        <Container size="lg" py="xl">
            <Stack gap="md">
                <Group justify="space-between">
                    <Stack gap={2}>
                        <Group gap={6}><IconBookmark size={24} /><Title order={2}>📚 콘텐츠 라이브러리</Title></Group>
                        <Text size="sm" c="dimmed">자주 쓰는 캡션·해시태그 패턴을 저장해두고 캠페인 작성 시 즉시 불러쓰세요</Text>
                    </Stack>
                    <Button leftSection={<IconPlus size={16} />} color="violet" onClick={openCreate}>
                        새 템플릿
                    </Button>
                </Group>

                {templates.length === 0 ? (
                    <Paper withBorder p="xl" radius="md">
                        <Stack gap="sm" align="center">
                            <IconBookmark size={48} style={{ opacity: 0.3 }} />
                            <Text fw={700}>아직 저장된 템플릿이 없어요</Text>
                            <Text size="sm" c="dimmed" ta="center">
                                자주 쓰는 캡션 패턴을 저장해두면<br />
                                다음 캠페인 작성이 30초로 줄어요
                            </Text>
                            <Button onClick={openCreate} color="violet" leftSection={<IconPlus size={14} />}>
                                첫 템플릿 만들기
                            </Button>
                        </Stack>
                    </Paper>
                ) : (
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        {templates.map(t => (
                            <Card key={t.id} withBorder p="md" radius="md">
                                <Group justify="space-between" mb={4}>
                                    <Group gap={6}>
                                        <Text fw={700}>{t.name}</Text>
                                        {t.usageCount > 0 && (
                                            <Badge size="xs" color="violet" variant="light">{t.usageCount}회 사용</Badge>
                                        )}
                                    </Group>
                                    {t.category && <Badge size="xs" variant="light">{t.category}</Badge>}
                                </Group>
                                <Box style={{
                                    background: 'var(--mantine-color-default-hover)',
                                    padding: 10, borderRadius: 6, marginTop: 8, marginBottom: 8,
                                    maxHeight: 120, overflow: 'auto',
                                }}>
                                    <Text size="xs" style={{ whiteSpace: 'pre-wrap' }}>
                                        {t.body}
                                        {t.hashtags && <Text component="span" c="violet"><br /><br />{t.hashtags}</Text>}
                                    </Text>
                                </Box>
                                <Group justify="space-between" mt="xs">
                                    <Text size="11px" c="dimmed">
                                        {t.lastUsedAt ? `최근 ${dayjs(t.lastUsedAt).format('YY-MM-DD')}` : '아직 사용 안 함'}
                                    </Text>
                                    <Group gap={4}>
                                        <CopyButton value={fullText(t)}>
                                            {({ copied, copy }) => (
                                                <Tooltip label={copied ? '복사됨!' : '본문+해시태그 복사'}>
                                                    <ActionIcon size="sm" variant="light" color={copied ? 'teal' : 'violet'} onClick={copy}>
                                                        {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
                                                    </ActionIcon>
                                                </Tooltip>
                                            )}
                                        </CopyButton>
                                        <Tooltip label="수정">
                                            <ActionIcon size="sm" variant="light" onClick={() => openEdit(t)}>
                                                <IconEdit size={13} />
                                            </ActionIcon>
                                        </Tooltip>
                                        <Tooltip label="삭제">
                                            <ActionIcon size="sm" variant="light" color="red" onClick={() => handleDelete(t)} loading={busy}>
                                                <IconTrash size={13} />
                                            </ActionIcon>
                                        </Tooltip>
                                    </Group>
                                </Group>
                            </Card>
                        ))}
                    </SimpleGrid>
                )}

                <Paper withBorder p="md" radius="md" bg="violet.0">
                    <Text size="xs" c="violet.9">
                        💡 캠페인 작성 페이지에서도 라이브러리 패널이 곧 추가될 예정 — 클릭 한 번으로 본문에 삽입 (Phase 24+).
                    </Text>
                </Paper>
            </Stack>

            <Modal opened={editModal} onClose={editModalCtl.close} title={editingId ? '템플릿 수정' : '새 템플릿 만들기'} size="md">
                <form onSubmit={form.onSubmit(handleSubmit)}>
                    <Stack gap="sm">
                        <TextInput label="이름" placeholder="예: 신메뉴 출시" required {...form.getInputProps('name')} />
                        <Textarea
                            label="본문"
                            placeholder="🎉 신메뉴 출시! 첫 줄은 후킹 문장으로 시작하세요..."
                            autosize
                            minRows={4}
                            maxRows={12}
                            required
                            {...form.getInputProps('body')}
                        />
                        <TextInput label="해시태그 (공백 구분)" placeholder="#카페 #신메뉴 #봄" {...form.getInputProps('hashtags')} />
                        <Select label="카테고리" data={CATEGORIES} clearable searchable {...form.getInputProps('category')} />
                        <Group justify="flex-end" mt="md">
                            <Button variant="subtle" onClick={editModalCtl.close}>취소</Button>
                            <Button type="submit" loading={busy} color="violet">{editingId ? '저장' : '추가'}</Button>
                        </Group>
                    </Stack>
                </form>
            </Modal>
        </Container>
    );
}
