import {
  Group,
  Text,
  Button,
  Menu,
  Avatar,
  UnstyledButton,
  Modal,
  TextInput,
  Stack,
  Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconUser,
  IconLogout,
  IconChevronDown,
  IconLogin,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useAuth, User } from '../../hooks/useAuth';

export function Header() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [loginOpened, { open: openLogin, close: closeLogin }] = useDisclosure(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [org, setOrg] = useState('');

  const handleLogin = () => {
    if (email && name) {
      login(email, name, org || undefined);
      closeLogin();
      setEmail('');
      setName('');
      setOrg('');
    }
  };

  return (
    <>
      <Group h="100%" px="md" justify="space-between">
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

        <Group>
          {isAuthenticated && user ? (
            <Menu shadow="md" width={220}>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <Avatar color="bankGreen" radius="xl" size="sm">
                      {user.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <div>
                      <Text size="sm" fw={500} lh={1.2}>{user.name}</Text>
                      <Text size="xs" c="dimmed" lh={1.2}>{user.email}</Text>
                    </div>
                    <IconChevronDown size={14} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Account</Menu.Label>
                <Menu.Item leftSection={<IconUser size={14} />}>
                  Profile
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconLogout size={14} />}
                  color="red"
                  onClick={logout}
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
              onClick={openLogin}
            >
              Sign In
            </Button>
          )}
        </Group>
      </Group>

      <Modal opened={loginOpened} onClose={closeLogin} title="Sign In to Qantara" centered>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Enter your details to access the developer portal. For TND testing, any email works.
          </Text>
          <TextInput
            label="Full Name"
            placeholder="Your name"
            required
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
          <TextInput
            label="Email"
            placeholder="you@company.com"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
          <TextInput
            label="Organization"
            placeholder="Your company (optional)"
            value={org}
            onChange={(e) => setOrg(e.currentTarget.value)}
          />
          <Button fullWidth onClick={handleLogin} disabled={!email || !name}>
            Sign In
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
