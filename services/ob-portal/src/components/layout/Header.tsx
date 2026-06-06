import {
  Group,
  Text,
  Button,
  Menu,
  Avatar,
  UnstyledButton,
  Box,
  Badge,
} from '@mantine/core';
import {
  IconUser,
  IconLogout,
  IconChevronDown,
  IconLogin,
  IconMailForward,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function Header() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Group h="100%" px="md" justify="space-between">
      <UnstyledButton onClick={() => navigate('/')}>
        <Group gap="xs">
          <Box
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: '#4D9134',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text fw={700} c="white" size="lg">Q</Text>
          </Box>
          <div>
            <Text fw={700} size="lg" lh={1.2}>Qantara</Text>
            <Text size="xs" c="dimmed" lh={1}>Developer Portal</Text>
          </div>
        </Group>
      </UnstyledButton>

      <Group>
        {isAuthenticated && user ? (
          <Menu shadow="md" width={240}>
            <Menu.Target>
              <UnstyledButton>
                <Group gap="xs">
                  <Avatar color="bankGreen" radius="xl" size="sm">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </Avatar>
                  <div>
                    <Group gap={6}>
                      <Text size="sm" fw={500} lh={1.2}>{user.name || user.email}</Text>
                      {isAdmin && <Badge size="xs" variant="light" color="bankGreen">Admin</Badge>}
                    </Group>
                    <Text size="xs" c="dimmed" lh={1.2}>{user.email}</Text>
                  </div>
                  <IconChevronDown size={14} />
                </Group>
              </UnstyledButton>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Account</Menu.Label>
              <Menu.Item
                leftSection={<IconUser size={14} />}
                onClick={() => navigate('/applications')}
              >
                My Applications
              </Menu.Item>
              {isAdmin && (
                <Menu.Item
                  leftSection={<IconMailForward size={14} />}
                  onClick={() => navigate('/admin/invitations')}
                >
                  Invite Partner
                </Menu.Item>
              )}
              <Menu.Divider />
              <Menu.Item
                leftSection={<IconLogout size={14} />}
                color="red"
                onClick={handleLogout}
              >
                Sign Out
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        ) : (
          <Button
            leftSection={<IconLogin size={16} />}
            variant="filled"
            size="sm"
            onClick={() => navigate('/login')}
          >
            Sign In
          </Button>
        )}
      </Group>
    </Group>
  );
}
