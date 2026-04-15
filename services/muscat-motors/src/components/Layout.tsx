import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppShell,
  Group,
  Text,
  Box,
  Badge,
  Avatar,
  Menu,
  UnstyledButton,
  Button,
} from '@mantine/core';
import { IconLogout, IconUser, IconChevronDown } from '@tabler/icons-react';
import { getCurrentSalesperson, clearCurrentSalesperson } from '@/utils/auth';

const NAV_ITEMS: Array<{ path: string; label: string }> = [
  { path: '/inventory', label: 'Inventory' },
  { path: '/sale', label: 'New Sale' },
  { path: '/history', label: 'Sales History' },
  { path: '/webhooks', label: 'Webhooks' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const sp = getCurrentSalesperson();

  const handleLogout = () => {
    clearCurrentSalesperson();
    navigate('/login');
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <AppShell header={{ height: 72 }} padding="lg" styles={{ main: { background: '#0f0f11' } }}>
      <AppShell.Header
        style={{
          background: 'linear-gradient(180deg,#18181b 0%,#27272a 100%)',
          borderBottom: '2px solid #ffc107',
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
        }}
      >
        <Group h="100%" px="xl" justify="space-between" wrap="nowrap">
          <Group gap="md" wrap="nowrap">
            <Box
              onClick={() => navigate('/inventory')}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg,#ffd54a,#ffc107 60%,#c9961d)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 16px -4px rgba(255,193,7,0.45)',
              }}
            >
              <Text c="#18181b" fw={900} size="xl" lh={1}>
                M
              </Text>
            </Box>
            <Box onClick={() => navigate('/inventory')} style={{ cursor: 'pointer' }}>
              <Text fw={800} size="lg" c="#fafafa" lh={1.1}>
                Muscat Motors
              </Text>
              <Text size="xs" c="#a1a1aa" mt={2}>
                Premium Auto Showroom
              </Text>
            </Box>

            <Group gap={4} ml="xl" visibleFrom="sm">
              {NAV_ITEMS.map((item) => (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? 'filled' : 'subtle'}
                  color={isActive(item.path) ? 'yellow' : 'gray'}
                  size="sm"
                  onClick={() => navigate(item.path)}
                  styles={{
                    root: isActive(item.path)
                      ? { color: '#18181b', fontWeight: 700 }
                      : { color: '#e4e4e7', fontWeight: 500 },
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Group>
          </Group>

          <Group gap="md" wrap="nowrap">
            <Badge
              variant="gradient"
              gradient={{ from: '#ffc107', to: '#c9961d', deg: 90 }}
              size="lg"
              styles={{ root: { color: '#18181b', fontWeight: 700, letterSpacing: 1 } }}
            >
              SANDBOX
            </Badge>

            <Menu shadow="lg" width={240} position="bottom-end">
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <Avatar
                      radius="xl"
                      size="md"
                      styles={{
                        root: { background: sp?.avatarBg ?? '#ffc107' },
                        placeholder: { color: '#18181b', fontWeight: 800 },
                      }}
                    >
                      {sp?.initials ?? '?'}
                    </Avatar>
                    <Box visibleFrom="sm">
                      <Text size="sm" fw={600} c="#fafafa" lh={1.1}>
                        {sp?.name ?? 'Salesperson'}
                      </Text>
                      <Text size="xs" c="#a1a1aa">
                        {sp?.branch ?? ''}
                      </Text>
                    </Box>
                    <IconChevronDown size={14} color="#a1a1aa" />
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>
                  <Text size="xs">{sp?.email}</Text>
                </Menu.Label>
                <Menu.Item leftSection={<IconUser size={14} />} disabled>
                  Profile
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={handleLogout}>
                  Sign Out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Box className="fade-up">
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
