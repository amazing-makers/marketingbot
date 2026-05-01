'use client';

import { useState } from 'react';
import { Container, Title, Text, Switch, Stack, Paper, Button, Group } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { updateEmailPreferences } from '@/app/actions/userActions';

interface NotificationsClientProps {
  initialPrefs: {
    failures: boolean;
    weekly: boolean;
    welcome: boolean;
  };
}

export default function NotificationsClient({ initialPrefs }: NotificationsClientProps) {
  const [prefs, setPrefs] = useState(initialPrefs);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const result = await updateEmailPreferences(prefs);
    setLoading(false);

    if (result.success) {
      notifications.show({
        title: '저장 완료',
        message: '알림 설정이 성공적으로 업데이트되었습니다.',
        color: 'teal',
      });
    } else {
      notifications.show({
        title: '오류 발생',
        message: '설정 저장 중 문제가 발생했습니다.',
        color: 'red',
      });
    }
  };

  return (
    <Container size="sm" py="xl">
      <Title order={2} mb="md">알림 설정</Title>
      <Text c="dimmed" mb="xl">받고 싶은 이메일 알림을 선택해 주세요.</Text>

      <Paper withBorder p="xl" radius="md">
        <Stack gap="xl">
          <Group justify="space-between" wrap="nowrap">
            <div>
              <Text fw={500}>작업 실패 요약</Text>
              <Text size="xs" c="dimmed">SNS 게시 작업이 실패한 경우 매일 아침 모아서 알려드립니다.</Text>
            </div>
            <Switch 
              checked={prefs.failures} 
              onChange={(e) => setPrefs({ ...prefs, failures: e.currentTarget.checked })} 
              size="md"
            />
          </Group>

          <Group justify="space-between" wrap="nowrap">
            <div>
              <Text fw={500}>주간 리포트</Text>
              <Text size="xs" c="dimmed">지난 한 주간의 마케팅 성과를 요약하여 매주 월요일 발송합니다.</Text>
            </div>
            <Switch 
              checked={prefs.weekly} 
              onChange={(e) => setPrefs({ ...prefs, weekly: e.currentTarget.checked })} 
              size="md"
            />
          </Group>

          <Group justify="space-between" wrap="nowrap">
            <div>
              <Text fw={500}>가입 환영 및 공지사항</Text>
              <Text size="xs" c="dimmed">계정 활성화 안내 및 서비스 주요 변경 사항을 알려드립니다.</Text>
            </div>
            <Switch 
              checked={prefs.welcome} 
              onChange={(e) => setPrefs({ ...prefs, welcome: e.currentTarget.checked })} 
              size="md"
            />
          </Group>

          <Button onClick={handleSave} loading={loading} mt="md">
            설정 저장하기
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
