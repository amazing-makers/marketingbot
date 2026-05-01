'use client';

import { 
  Group, 
  Title, 
  Button, 
  ActionIcon, 
  Drawer, 
  Stack, 
  NavLink,
  Container,
  Box
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconMenu2, IconX } from '@tabler/icons-react';
import Link from 'next/link';

interface MobileLandingNavProps {
  isLoggedIn: boolean;
}

export default function MobileLandingNav({ isLoggedIn }: MobileLandingNavProps) {
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <Box h={60} style={{ position: 'sticky', top: 0, zIndex: 100, backgroundColor: 'white', borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
      <Container h="100%">
        <Group justify="space-between" h="100%">
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Title order={4} c="blue.6">
              MarketingBot
            </Title>
          </Link>

          <Group gap="xs">
            {!isLoggedIn && (
              <Button size="xs" radius="xl" component={Link} href="/register">시작하기</Button>
            )}
            <ActionIcon variant="subtle" color="gray" onClick={open} size="lg">
              <IconMenu2 size={24} />
            </ActionIcon>
          </Group>
        </Group>
      </Container>

      <Drawer
        opened={opened}
        onClose={close}
        size="70%"
        padding="md"
        title="메뉴"
        position="right"
      >
        <Stack gap="xs">
          <NavLink label="홈" component={Link} href="/" onClick={close} />
          <NavLink label="제품 기능" component={Link} href="/#features" onClick={close} />
          <NavLink label="가격제" component={Link} href="/#pricing" onClick={close} />
          <NavLink label="FAQ" component={Link} href="/#faq" onClick={close} />
          <Stack mt="xl" gap="sm">
            {isLoggedIn ? (
              <Button fullWidth component={Link} href="/dashboard" radius="md">대시보드</Button>
            ) : (
              <>
                <Button fullWidth variant="outline" component={Link} href="/login" radius="md">로그인</Button>
                <Button fullWidth component={Link} href="/register" radius="md">14일 무료 체험</Button>
              </>
            )}
          </Stack>
        </Stack>
      </Drawer>
    </Box>
  );
}
