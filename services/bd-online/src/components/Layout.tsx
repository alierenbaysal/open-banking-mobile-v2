/**
 * App shell layout with header and navigation.
 * Bank Dhofar internet banking look — professional, minimal.
 */

import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  AppShell,
  Group,
  Text,
  Button,
  UnstyledButton,
  Burger,
  Stack,
  Divider,
  Box,
  Avatar,
  Menu,
  rem,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconHome,
  IconShieldCheck,
  IconLogout,
  IconUser,
  IconBuildingBank,
} from '@tabler/icons-react';
import { getUser, logout, getDisplayName, getEmail, type User } from '@/utils/auth';

interface NavItem {
  label: string;
  labelAr: string;
  icon: typeof IconHome;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    labelAr: '\u0644\u0648\u062D\u0629 \u0627\u0644\u062A\u062D\u0643\u0645',
    icon: IconHome,
    path: '/dashboard',
  },
  {
    label: 'Consents',
    labelAr: '\u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0627\u062A',
    icon: IconShieldCheck,
    path: '/consents',
  },
];

export default function Layout() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    getUser().then(setUser);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // If Keycloak logout fails, just clear session and redirect
      window.sessionStorage.clear();
      window.location.href = '/';
    }
  };

  const displayName = user ? getDisplayName(user) : 'Customer';
  const email = user ? getEmail(user) : '';

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 260,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="lg"
    >
      <AppShell.Header
        style={{
          backgroundColor: '#4D9134',
          borderBottom: 'none',
        }}
      >
        <Group h="100%" px="lg" justify="space-between">
          <Group gap="sm">
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              color="white"
              size="sm"
            />
            <UnstyledButton component={Link} to="/dashboard">
              <Group gap="xs">
                <IconBuildingBank size={28} color="white" />
                <Stack gap={0}>
                  <Text size="lg" fw={700} c="white" lh={1.1}>
                    Bank Dhofar
                  </Text>
                  <Text size="xs" c="rgba(255,255,255,0.8)" lh={1}>
                    \u0628\u0646\u0643 \u0638\u0641\u0627\u0631
                  </Text>
                </Stack>
              </Group>
            </UnstyledButton>
          </Group>

          <Group gap="md">
            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <Avatar size="sm" color="white" variant="filled" radius="xl">
                      <IconUser size={16} color="#4D9134" />
                    </Avatar>
                    <Box visibleFrom="sm">
                      <Text size="sm" c="white" fw={500} lh={1.2}>
                        {displayName}
                      </Text>
                      {email && (
                        <Text size="xs" c="rgba(255,255,255,0.7)" lh={1}>
                          {email}
                        </Text>
                      )}
                    </Box>
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{displayName}</Menu.Label>
                <Menu.Label c="dimmed">{email}</Menu.Label>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />}
                  color="red"
                  onClick={handleLogout}
                >
                  Sign Out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" style={{ borderRight: '1px solid #e9ecef' }}>
        <Stack gap="xs">
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs">
            Navigation
          </Text>
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <UnstyledButton
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  close();
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 8,
                  backgroundColor: isActive ? '#f0f9ed' : 'transparent',
                  color: isActive ? '#4D9134' : '#495057',
                  transition: 'background-color 150ms ease',
                }}
              >
                <Group gap="sm">
                  <item.icon
                    size={20}
                    style={{ color: isActive ? '#4D9134' : '#868e96' }}
                  />
                  <Box>
                    <Text size="sm" fw={isActive ? 600 : 400}>
                      {item.label}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {item.labelAr}
                    </Text>
                  </Box>
                </Group>
              </UnstyledButton>
            );
          })}
        </Stack>

        <Divider my="md" />

        <Box mt="auto">
          <Button
            variant="subtle"
            color="red"
            fullWidth
            leftSection={<IconLogout size={16} />}
            onClick={handleLogout}
            justify="flex-start"
          >
            Sign Out
          </Button>
        </Box>
      </AppShell.Navbar>

      <AppShell.Main style={{ backgroundColor: '#f8f9fa' }}>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
