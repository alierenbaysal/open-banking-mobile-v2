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
  Center,
  Loader,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconPlus,
  IconApps,
  IconCalendar,
  IconAlertCircle,
  IconCopy,
  IconCheck,
  IconCircleCheck,
  IconTrash,
} from '@tabler/icons-react';
import { useAuth } from '../../hooks/useAuth';
import { StatusBadge } from '../../components/common/StatusBadge';

// Display shape for an application card.
export interface TppApplication {
  id: string;
  name: string;
  description: string;
  clientId: string;
  // The stored client secret is never returned by the backend list/get (it is
  // shown once at registration / on regenerate); kept on the type for the detail
  // view but blank here.
  clientSecret: string;
  status: 'active' | 'pending' | 'inactive';
  roles: string[];
  redirectUris: string[];
  createdAt: string;
  environment: string;
}

// Raw TPP as returned by the scoped backend (GET /portal-api/tpp). The list is
// already filtered server-side: a partner sees ONLY apps they own; an admin sees
// all. There are NO hardcoded/built-in apps — this is the single source of truth.
interface BackendTPP {
  id: string;
  name: string;
  description?: string;
  client_id: string;
  status?: string;
  roles?: string[];
  redirect_uris?: string[];
  created_at?: string;
}

function mapTPP(t: BackendTPP): TppApplication {
  const status: TppApplication['status'] =
    t.status === 'active' ? 'active' : t.status === 'pending' ? 'pending' : 'inactive';
  return {
    id: t.id || t.client_id,
    name: t.name,
    description: t.description || '',
    clientId: t.client_id,
    clientSecret: '',
    status,
    roles: t.roles || [],
    redirectUris: t.redirect_uris || [],
    createdAt: t.created_at || new Date().toISOString(),
    environment: 'sandbox',
  };
}

const ROLE_OPTIONS = [
  { value: 'AISP', label: 'AISP - Account Information Service Provider', description: 'Access account data' },
  { value: 'PISP', label: 'PISP - Payment Initiation Service Provider', description: 'Initiate payments' },
  { value: 'CBPII', label: 'CBPII - Card Based Payment Instrument Issuer', description: 'Confirm funds' },
];

async function apiJSON<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...opts });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const b = await res.json();
      msg = b.message || b.error || msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export default function ApplicationsPage() {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState<TppApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
  const [formError, setFormError] = useState<string | null>(null);

  // Credentials display state (shown once after successful registration).
  const [createdCredentials, setCreatedCredentials] = useState<{
    clientId: string;
    clientSecret: string;
    appName: string;
    appId: string;
  } | null>(null);

  // Load the caller's OWN applications from the scoped backend.
  const loadApps = useCallback(async () => {
    setLoadingApps(true);
    setLoadError(null);
    try {
      const data = await apiJSON<BackendTPP[]>('/portal-api/tpp');
      setApps((data || []).map(mapTPP));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load applications');
      setApps([]);
    } finally {
      setLoadingApps(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadApps();
  }, [isAuthenticated, loadApps]);

  const handleOpenCreate = useCallback(() => {
    setNewContactEmail(user?.email || '');
    setFormError(null);
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
    setFormError(null);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!newName || newRoles.length === 0) return;
    setSubmitting(true);
    setFormError(null);
    try {
      // Register against the backend, which owns the client_id/secret and binds
      // the app to the signed-in owner. Cookie session is sent (credentials).
      const resp = await apiJSON<{ client_id: string; client_secret: string; name: string }>(
        '/portal-api/tpp/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newName,
            description: newDescription,
            roles: newRoles,
            redirect_uris: newRedirectUris.split('\n').map((u) => u.trim()).filter(Boolean),
            contact_email: newContactEmail,
            organisation_id: newCompanyName,
          }),
        },
      );
      closeCreate();
      resetForm();
      setCreatedCredentials({
        clientId: resp.client_id,
        clientSecret: resp.client_secret,
        appName: resp.name || newName,
        appId: resp.client_id,
      });
      openCredentials();
      await loadApps();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }, [newName, newDescription, newCompanyName, newContactEmail, newRedirectUris, newRoles, closeCreate, resetForm, openCredentials, loadApps]);

  const handleDelete = useCallback(async (app: TppApplication, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${app.name}"? This cannot be undone.`)) return;
    try {
      await apiJSON(`/portal-api/tpp/${encodeURIComponent(app.id)}`, { method: 'DELETE' });
    } catch {
      /* surfaced via reload */
    }
    await loadApps();
  }, [loadApps]);

  const handleCredentialsDismiss = useCallback(() => {
    const appId = createdCredentials?.appId;
    closeCredentials();
    setCreatedCredentials(null);
    if (appId) navigate(`/applications/${appId}`);
  }, [createdCredentials, closeCredentials, navigate]);

  if (authLoading) {
    return (
      <Container size="lg">
        <Center py={80}>
          <Loader color="bankGreen" />
        </Center>
      </Container>
    );
  }

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
            </Text>
            <Group>
              <Button onClick={() => navigate('/login')}>Sign In</Button>
              <Button variant="light" onClick={() => navigate('/signup')}>
                Request Access
              </Button>
            </Group>
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

        {loadError && (
          <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>
            {loadError}
          </Alert>
        )}

        {loadingApps ? (
          <Center py={60}><Loader color="bankGreen" /></Center>
        ) : apps.length === 0 ? (
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
                  <Group gap="xs">
                    <StatusBadge status={app.status} />
                    <Tooltip label="Delete application">
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        onClick={(e: React.MouseEvent) => handleDelete(app, e)}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
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

          {formError && (
            <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>
              {formError}
            </Alert>
          )}

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
              loading={submitting}
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
