'use client';

import { Group, Text, ActionIcon, Tooltip, CopyButton, rem, Modal, Stack, Code, Button } from '@mantine/core';
import { IconKey, IconCopy, IconCheck, IconExternalLink } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { getLicenseKey } from '@/app/actions/userActions';
import Link from 'next/link';

export default function HeaderLicense() {
  const [license, setLicense] = useState<any>(null);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    getLicenseKey().then(setLicense);
  }, []);

  if (!license) return null;

  const maskedKey = `${license.key.substring(0, 8)}-****-****-****`;

  return (
    <>
      <Tooltip label="라이선스 정보 확인">
        <Group 
          gap={5} 
          style={{ cursor: 'pointer', backgroundColor: 'var(--mantine-color-gray-1)', padding: '4px 10px', borderRadius: '4px' }}
          onClick={() => setOpened(true)}
        >
          <IconKey size={16} stroke={1.5} color="var(--mantine-color-blue-6)" />
          <Text size="xs" fw={700} visibleFrom="xs">
            {maskedKey}
          </Text>
        </Group>
      </Tooltip>

      <Modal opened={opened} onClose={() => setOpened(false)} title="내 라이선스 정보" centered>
        <Stack gap="md">
          <Paper bg="gray.0" p="md" radius="sm" withBorder>
            <Stack gap="xs">
              <Text size="xs" fw={700} c="dimmed">전체 라이선스 키</Text>
              <Group justify="space-between">
                <Code style={{ fontSize: rem(14), flex: 1 }}>{license.key}</Code>
                <CopyButton value={license.key}>
                  {({ copied, copy }) => (
                    <ActionIcon variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy}>
                      {copied ? <IconCheck size="1rem" /> : <IconCopy size="1rem" />}
                    </ActionIcon>
                  )}
                </CopyButton>
              </Group>
            </Stack>
          </Paper>

          <Group justify="space-between">
            <Text size="sm">플랜: <b>{license.plan}</b></Text>
            <Button 
              size="compact-xs" 
              variant="light" 
              rightSection={<IconExternalLink size={12} />}
              component={Link}
              href="/dashboard/agent"
              onClick={() => setOpened(false)}
            >
              에이전트 관리
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

// Modal 내부에서 Paper를 사용하기 위해 import를 추가하거나 Modal 내부 스타일을 조정합니다.
// 여기서는 Paper를 Modal 내부에 직접 구현하거나 Mantine Paper를 import 합니다.
import { Paper } from '@mantine/core';
