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
  Radio,
  CopyButton,
  ActionIcon,
  Tooltip,
  Code,
  Divider,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconPlus,
  IconApps,
  IconCalendar,
  IconAlertCircle,
  IconCopy,
  IconCheck,
  IconCircleCheck,
} from '@tabler/icons-react';
import { useAuth } from '../../hooks/useAuth';
import { getAllApps as getAllAppsFromStore, registerApp as registerAppToStore } from '../../utils/appStore';
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

function generateClientId(appName: string, environment: string): string {
  const slug = appName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = environment === 'sandbox' ? '-sandbox' : '-prod';
  return slug + suffix;
}

function generateClientSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `sb_sec_${hex}`;
}

export default function ApplicationsPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState<TppApplication[]>(() => getAllAppsFromStore());
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [credentialsOpened, { open: openCredentials, close: closeCredentials }] = useDisclosure(false);

  // Form state
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newEnvironment, setNewEnvironment] = useState<string>('sandbox');
  const [newRedirectUris, setNewRedirectUris] = useState('');
  const [newRoles, setNewRoles] = useState<string[]>([]);

  // Credentials display state (shown after successful registration)
  const [createdCredentials, setCreatedCredentials] = useState<{
    clientId: string;
    clientSecret: string;
    appName: string;
    appId: string;
  } | null>(null);

  // Pre-fill contact email when opening the create modal
  const handleOpenCreate = useCallback(() => {
    setNewContactEmail(user?.email || '');
    openCreate();
  }, [user, openCreate]);

  const resetForm = useCallback(() => {
    setNewName('');
    setNewDescription('');
    setNewCompanyName('');
    setNewContactEmail('');
    setNewEnvironment('sandbox');
    setNewRedirectUris('');
    setNewRoles([]);
  }, []);

  const handleCreate = useCallback(() => {
    if (!newName || newRoles.length === 0) return;

    const clientId = generateClientId(newName, newEnvironment);
    const clientSecret = generateClientSecret();

    const app: TppApplication = {
      id: clientId,
      name: newName,
      description: newDescription,
      clientId,
      clientSecret,
      status: newEnvironment === 'sandbox' ? 'active' : 'pending',
      roles: newRoles,
      redirectUris: newRedirectUris.split('\n').map((u) => u.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
      environment: newEnvironment as 'sandbox' | 'production',
    };

    // 1. Add to local state + persist in localStorage
    setApps((prev) => [app, ...prev]);
    registerAppToStore(app);

    // 2. Fire-and-forget TPP manager API call (don't block on it)
    try {
      fetch('/portal-api/tpp/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          description: newDescription,
          companyName: newCompanyName,
          contactEmail: newContactEmail,
          environment: newEnvironment,
          roles: newRoles,
          redirectUris: app.redirectUris,
        }),
      }).catch(() => {
        // Silently ignore — the app is already in local state
      });
    } catch {
      // Ignore fetch errors
    }

    // 3. Close registration modal and show credentials
    closeCreate();
    resetForm();
    setCreatedCredentials({ clientId, clientSecret, appName: newName, appId: clientId });
    openCredentials();
  }, [newName, newDescription, newCompanyName, newContactEmail, newEnvironment, newRedirectUris, newRoles, closeCreate, resetForm, openCredentials]);

  const handleCredentialsDismiss = useCallback(() => {
    const appId = createdCredentials?.appId;
    closeCredentials();
    setCreatedCredentials(null);
    if (appId) {
      navigate(`/applications/${appId}`);
    }
  }, [createdCredentials, closeCredentials, navigate]);

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
          <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreate}>
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
              <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreate}>
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

          <TextInput
            label="Company Name"
            placeholder="Acme FinTech LLC"
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.currentTarget.value)}
          />

          <TextInput
            label="Contact Email"
            placeholder="developer@company.com"
            value={newContactEmail}
            onChange={(e) => setNewContactEmail(e.currentTarget.value)}
          />

          <Textarea
            label="Description"
            placeholder="Describe what your application does..."
            minRows={3}
            value={newDescription}
            onChange={(e) => setNewDescription(e.currentTarget.value)}
          />

          <Radio.Group
            label="Environment"
            value={newEnvironment}
            onChange={setNewEnvironment}
          >
            <Group mt="xs">
              <Radio value="sandbox" label="Sandbox" description="Instant access with test data" />
              <Radio value="production" label="Production" description="Requires Bank Dhofar review" />
            </Group>
          </Radio.Group>

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

      {/* Credentials Modal — shown once after successful registration */}
      <Modal
        opened={credentialsOpened}
        onClose={handleCredentialsDismiss}
        title={null}
        size="lg"
        centered
        closeOnClickOutside={false}
        closeOnEscape={false}
      >
        {createdCredentials && (
          <Stack gap="lg">
            <Group gap="sm">
              <ThemeIcon size={40} radius="xl" color="green" variant="light">
                <IconCircleCheck size={24} />
              </ThemeIcon>
              <div>
                <Title order={4}>Application Registered Successfully!</Title>
                <Text size="sm" c="dimmed">{createdCredentials.appName}</Text>
              </div>
            </Group>

            <Alert color="orange" variant="light" icon={<IconAlertCircle size={16} />}>
              <Text fw={600} size="sm">
                Important: Save your client secret now. You won't be able to see it again.
              </Text>
            </Alert>

            <Stack gap="sm">
              <div>
                <Text size="sm" fw={500} mb={4}>Client ID</Text>
                <Group gap="xs">
                  <Code block style={{ flex: 1, fontSize: '0.85rem' }}>
                    {createdCredentials.clientId}
                  </Code>
                  <CopyButton value={createdCredentials.clientId}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'Copied' : 'Copy'}>
                        <ActionIcon variant="subtle" color={copied ? 'green' : 'gray'} onClick={copy}>
                          {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
              </div>

              <Divider />

              <div>
                <Text size="sm" fw={500} mb={4}>Client Secret</Text>
                <Group gap="xs">
                  <Code block style={{ flex: 1, fontSize: '0.85rem' }}>
                    {createdCredentials.clientSecret}
                  </Code>
                  <CopyButton value={createdCredentials.clientSecret}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'Copied' : 'Copy'}>
                        <ActionIcon variant="subtle" color={copied ? 'green' : 'gray'} onClick={copy}>
                          {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
              </div>
            </Stack>

            <Group justify="flex-end" mt="md">
              <Button onClick={handleCredentialsDismiss}>
                View Application
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
