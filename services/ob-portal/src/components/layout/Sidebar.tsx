import { NavLink, Stack, Divider, Text } from '@mantine/core';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  IconHome,
  IconApi,
  IconTerminal2,
  IconApps,
  IconChartBar,
  IconBook,
} from '@tabler/icons-react';
import { useAuth } from '../../hooks/useAuth';

const NAV_ITEMS = [
  { label: 'Home', icon: IconHome, path: '/', auth: false },
  { label: 'API Catalog', icon: IconApi, path: '/apis', auth: false },
  { label: 'Sandbox', icon: IconTerminal2, path: '/sandbox', auth: false },
  { label: 'My Applications', icon: IconApps, path: '/applications', auth: true },
  { label: 'Analytics', icon: IconChartBar, path: '/analytics', auth: true },
];

const RESOURCE_ITEMS = [
  { label: 'Getting Started', icon: IconBook, path: '/getting-started' },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  return (
    <Stack gap={0} py="md">
      <Text size="xs" fw={600} c="dimmed" px="md" mb="xs" tt="uppercase">
        Navigation
      </Text>
      {NAV_ITEMS.map((item) => {
        if (item.auth && !isAuthenticated) return null;
        const isActive = item.path === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(item.path);
        return (
          <NavLink
            key={item.path}
            label={item.label}
            leftSection={<item.icon size={18} stroke={1.5} />}
            active={isActive}
            onClick={() => navigate(item.path)}
            variant="filled"
          />
        );
      })}

      <Divider my="md" />

      <Text size="xs" fw={600} c="dimmed" px="md" mb="xs" tt="uppercase">
        Resources
      </Text>
      {RESOURCE_ITEMS.map((item) => {
        const isActive = location.pathname.startsWith(item.path);
        return (
          <NavLink
            key={item.path}
            label={item.label}
            leftSection={<item.icon size={18} stroke={1.5} />}
            active={isActive}
            onClick={() => navigate(item.path)}
            variant="filled"
          />
        );
      })}
    </Stack>
  );
}
