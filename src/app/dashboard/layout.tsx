"use client";

import { AppShell, Burger, Group, NavLink, Title, UnstyledButton, Text, Menu, Avatar, ActionIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconDashboard, IconPlus, IconUserCircle, IconSettings, IconLogout } from '@tabler/icons-react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
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
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={3}>MarketingBot</Title>
          </Group>
          
          {session?.user && (
            <Group>
              <Text size="sm" fw={500}>{session.user.name || session.user.email}님</Text>
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <UnstyledButton>
                    <Avatar radius="xl" size="sm" />
                  </UnstyledButton>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>내 계정</Menu.Label>
                  <Menu.Item leftSection={<IconUserCircle size={14} />}>프로필</Menu.Item>
                  <Menu.Item 
                    color="red" 
                    leftSection={<IconLogout size={14} />}
                    onClick={() => signOut({ callbackUrl: '/login' })}
                  >
                    로그아웃
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          )}
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
