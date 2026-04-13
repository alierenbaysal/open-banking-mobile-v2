import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  Group,
  Button,
  SimpleGrid,
  Badge,
  Modal,
  TextInput,
  Checkbox,
  Textarea,
  Alert,
  ThemeIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconPlus,
  IconApps,
  IconCalendar,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useAuth } from '../../hooks/useAuth';
import { StatusBadge } from '../../components/common/StatusBadge';

export interface TppApplication {
  id: string;
  name: string;
  description: string;
  clientId: string;
  clientSecret: string;
  status: 'active' | 'pending' | 'inactive';
  roles: string[];
  redirectUris: string[];
  createdAt: string;
  environment: 'sandbox' | 'production';
}

// In-memory store for demo purposes
const INITIAL_APPS: TppApplication[] = [
  {
    id: 'masroofi-demo',
    name: 'Masroofi \u2014 Personal Finance Manager',
    description: 'Bank Dhofar\'s personal finance management app. Aggregates accounts, tracks spending, and provides budgeting insights using Open Banking APIs.',
    clientId: 'masroofi-demo',
    clientSecret: 'sb_sec_masroofi_demo_internal',
    status: 'active',
    roles: ['AISP'],
    redirectUris: ['https://masroofi.tnd.bankdhofar.com/callback'],
    createdAt: '2026-04-12T00:00:00Z',
    environment: 'production',
  },
  {
    id: 'app-001',
    name: 'FinTech PFM App',
    description: 'Personal finance management application for account aggregation and budgeting.',
    clientId: 'pfm-app-sandbox-001',
    clientSecret: 'sb_sec_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
    status: 'active',
    roles: ['AISP'],
    redirectUris: ['https://pfm.example.com/callback', 'https://pfm.example.com/auth/redirect'],
    createdAt: '2026-04-01T10:00:00Z',
    environment: 'sandbox',
  },
  {
    id: 'app-002',
    name: 'PayConnect Gateway',
    description: 'Payment gateway for e-commerce merchants integrating with Bank Dhofar.',
    clientId: 'payconnect-sandbox-002',
    clientSecret: 'sb_sec_q1w2e3r4t5y6u7i8o9p0a1s2d3f4g5h6',
    status: 'active',
    roles: ['PISP', 'CBPII'],
    redirectUris: ['https://pay.example.com/callback'],
    createdAt: '2026-04-05T14:30:00Z',
    environment: 'sandbox',
  },
  {
    id: 'app-003',
    name: 'Sweeping Service',
    description: 'Automated savings sweep service using Variable Recurring Payments.',
    clientId: 'sweep-sandbox-003',
    clientSecret: 'sb_sec_z1x2c3v4b5n6m7k8j9h0g1f2d3s4a5q6',
    status: 'pending',
    roles: ['AISP', 'PISP'],
    redirectUris: ['https://sweep.example.com/auth'],
    createdAt: '2026-04-10T09:15:00Z',
    environment: 'sandbox',
  },
];

const ROLE_OPTIONS = [
  { value: 'AISP', label: 'AISP - Account Information Service Provider', description: 'Access account data' },
  { value: 'PISP', label: 'PISP - Payment Initiation Service Provider', description: 'Initiate payments' },
  { value: 'CBPII', label: 'CBPII - Card Based Payment Instrument Issuer', description: 'Confirm funds' },
];

export default function ApplicationsPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState<TppApplication[]>(INITIAL_APPS);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);

  // Form state
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newRedirectUris, setNewRedirectUris] = useState('');
  const [newRoles, setNewRoles] = useState<string[]>([]);

  const handleCreate = useCallback(() => {
    if (!newName || newRoles.length === 0) return;

    const app: TppApplication = {
      id: `app-${Date.now()}`,
      name: newName,
      description: newDescription,
      clientId: `${newName.toLowerCase().replace(/\s+/g, '-')}-sandbox-${Date.now().toString(36)}`,
      clientSecret: `sb_sec_${Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('')}`,
      status: 'pending',
      roles: newRoles,
      redirectUris: newRedirectUris.split('\n').map(u => u.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
      environment: 'sandbox',
    };

    setApps((prev) => [app, ...prev]);
    setNewName('');
    setNewDescription('');
    setNewRedirectUris('');
    setNewRoles([]);
    closeCreate();
  }, [newName, newDescription, newRedirectUris, newRoles, closeCreate]);

  if (!isAuthenticated) {
    return (
      <Container size="lg">
        <Card withBorder p="xl" ta="center">
          <Stack align="center" gap="md">
            <ThemeIcon size={64} radius="xl" color="bankGreen" variant="light">
              <IconApps size={32} />
            </ThemeIcon>
            <Title order={3}>Sign In Required</Title>
            <Text c="dimmed" maw={400}>
              You need to sign in to manage your TPP applications.
              Use the Sign In button in the top right corner.
            </Text>
          </Stack>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="lg">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Text size="sm" fw={600} c="bankGreen" tt="uppercase" mb={4}>
              TPP Management
            </Text>
            <Title order={2}>My Applications</Title>
            <Text c="dimmed" mt="xs">
              Register and manage your Third Party Provider applications.
            </Text>
          </div>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            Register New App
          </Button>
        </Group>

        {apps.length === 0 ? (
          <Card withBorder p="xl" ta="center">
            <Stack align="center" gap="md">
              <ThemeIcon size={64} radius="xl" color="gray" variant="light">
                <IconApps size={32} />
              </ThemeIcon>
              <Text c="dimmed">You haven't registered any applications yet.</Text>
              <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
                Register Your First App
              </Button>
            </Stack>
          </Card>
        ) : (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
            {apps.map((app) => (
              <Card
                key={app.id}
                withBorder
                padding="lg"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/applications/${app.id}`)}
              >
                <Group justify="space-between" mb="sm">
                  <Text fw={600} size="lg">{app.name}</Text>
                  <StatusBadge status={app.status} />
                </Group>
                <Text size="sm" c="dimmed" mb="md" lineClamp={2}>
                  {app.description || 'No description provided.'}
                </Text>
                <Group gap="xs" mb="sm">
                  {app.roles.map((role) => (
                    <Badge key={role} variant="outline" size="sm">
                      {role}
                    </Badge>
                  ))}
                </Group>
                <Group gap="xs">
                  <Badge variant="light" color="blue" size="sm">
                    {app.environment}
                  </Badge>
                  <Group gap={4}>
                    <IconCalendar size={12} color="gray" />
                    <Text size="xs" c="dimmed">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </Text>
                  </Group>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Stack>

      {/* Create App Modal */}
      <Modal opened={createOpened} onClose={closeCreate} title="Register New Application" size="lg" centered>
        <Stack gap="md">
          <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
            Sandbox applications are created immediately. Production access requires review and
            approval from Bank Dhofar.
          </Alert>

          <TextInput
            label="Application Name"
            placeholder="My FinTech App"
            required
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
          />

          <Textarea
            label="Description"
            placeholder="Describe what your application does..."
            minRows={3}
            value={newDescription}
            onChange={(e) => setNewDescription(e.currentTarget.value)}
          />

          <div>
            <Text size="sm" fw={500} mb="xs">TPP Roles <Text span c="red">*</Text></Text>
            <Stack gap="xs">
              {ROLE_OPTIONS.map((role) => (
                <Checkbox
                  key={role.value}
                  label={
                    <div>
                      <Text size="sm" fw={500}>{role.value}</Text>
                      <Text size="xs" c="dimmed">{role.description}</Text>
                    </div>
                  }
                  checked={newRoles.includes(role.value)}
                  onChange={(e) => {
                    if (e.currentTarget.checked) {
                      setNewRoles((prev) => [...prev, role.value]);
                    } else {
                      setNewRoles((prev) => prev.filter((r) => r !== role.value));
                    }
                  }}
                />
              ))}
            </Stack>
          </div>

          <Textarea
            label="Redirect URIs"
            description="One URI per line"
            placeholder={"https://myapp.com/callback\nhttps://myapp.com/auth/redirect"}
            minRows={3}
            value={newRedirectUris}
            onChange={(e) => setNewRedirectUris(e.currentTarget.value)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={closeCreate}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!newName || newRoles.length === 0}
            >
              Register Application
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
