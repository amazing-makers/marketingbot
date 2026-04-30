"use client";

import { AppShell, Burger, Group, NavLink, Title, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconDashboard, IconPlus, IconUserCircle, IconSettings } from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const pathname = usePathname();

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Title order={3}>SNS Auto</Title>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink
          component={Link}
          href="/dashboard"
          label="대시보드"
          leftSection={<IconDashboard size="1rem" stroke={1.5} />}
          active={pathname === '/dashboard'}
        />
        <NavLink
          component={Link}
          href="/dashboard/posts/new"
          label="게시물 작성"
          leftSection={<IconPlus size="1rem" stroke={1.5} />}
          active={pathname === '/dashboard/posts/new'}
        />
        <NavLink
          component={Link}
          href="/dashboard/accounts"
          label="계정 관리"
          leftSection={<IconUserCircle size="1rem" stroke={1.5} />}
          active={pathname === '/dashboard/accounts'}
        />
        <NavLink
          component={Link}
          href="/dashboard/settings"
          label="설정"
          leftSection={<IconSettings size="1rem" stroke={1.5} />}
          active={pathname === '/dashboard/settings'}
        />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
