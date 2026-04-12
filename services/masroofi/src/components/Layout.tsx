import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppShell,
  Group,
  NavLink,
  Text,
  ActionIcon,
  Box,
  Divider,
  Badge,
  useMantineTheme,
  Avatar,
  Menu,
  UnstyledButton,
} from '@mantine/core';
import {
  IconDashboard,
  IconBuildingBank,
  IconCreditCard,
  IconReceipt,
  IconChartPie,
  IconMenu2,
  IconLogout,
  IconUser,
  IconChevronDown,
} from '@tabler/icons-react';
import { getCurrentUser, logout } from '@/utils/auth';
import { isBankConnected, disconnectBank } from '@/utils/consent';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', labelAr: 'لوحة المعلومات', icon: IconDashboard },
  { path: '/accounts', label: 'Accounts', labelAr: 'الحسابات', icon: IconCreditCard },
  { path: '/transactions', label: 'Transactions', labelAr: 'المعاملات', icon: IconReceipt },
  { path: '/spending', label: 'Spending', labelAr: 'المصروفات', icon: IconChartPie },
];

export default function Layout() {
  const [opened, setOpened] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useMantineTheme();
  const user = getCurrentUser();
  const connected = isBankConnected();

  const handleLogout = () => {
    logout();
    disconnectBank();
    navigate('/');
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 260, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <ActionIcon
              variant="subtle"
              color="gray"
              hiddenFrom="sm"
              onClick={() => setOpened(!opened)}
              size="lg"
            >
              <IconMenu2 size={20} />
            </ActionIcon>
            <Box
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onClick={() => navigate('/dashboard')}
            >
              <Text c="white" fw={700} size="lg">M</Text>
            </Box>
            <Box onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
              <Text fw={700} size="lg" c="violet.7">Masroofi</Text>
              <Text size="xs" c="dimmed" mt={-4}>Personal Finance Manager</Text>
            </Box>
          </Group>

          <Group gap="md">
            {connected && (
              <Badge color="teal" variant="light" size="lg" leftSection={
                <Box style={{ width: 8, height: 8, borderRadius: '50%', background: '#00b894' }} />
              }>
                Bank Connected
              </Badge>
            )}
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <Avatar color="violet" radius="xl" size="sm">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </Avatar>
                    <Text size="sm" fw={500} visibleFrom="sm">{user?.name || 'User'}</Text>
                    <IconChevronDown size={14} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>
                  <Text size="xs" c="dimmed">{user?.email}</Text>
                </Menu.Label>
                <Menu.Item leftSection={<IconUser size={14} />}>
                  Profile
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={14} />}
                  onClick={handleLogout}
                >
                  Sign Out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Box style={{ flex: 1 }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              label={
                <Group gap={6}>
                  <Text size="sm">{item.label}</Text>
                  <Text size="xs" c="dimmed">{item.labelAr}</Text>
                </Group>
              }
              leftSection={<item.icon size={20} stroke={1.5} />}
              active={location.pathname === item.path || location.pathname.startsWith(item.path + '/')}
              onClick={() => {
                navigate(item.path);
                setOpened(false);
              }}
              color="violet"
              variant="light"
              style={{ borderRadius: theme.radius.md, marginBottom: 4 }}
            />
          ))}

          <Divider my="md" />

          {!connected && (
            <NavLink
              label={
                <Group gap={6}>
                  <Text size="sm" fw={500}>Connect Bank</Text>
                  <Text size="xs" c="dimmed">ربط الحساب البنكي</Text>
                </Group>
              }
              leftSection={<IconBuildingBank size={20} stroke={1.5} />}
              active={location.pathname === '/connect'}
              onClick={() => {
                navigate('/connect');
                setOpened(false);
              }}
              color="teal"
              variant="light"
              style={{ borderRadius: theme.radius.md }}
            />
          )}
        </Box>

        <Divider my="sm" />
        <Text size="xs" c="dimmed" ta="center" py="xs">
          Powered by Bank Dhofar Open Banking
        </Text>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
