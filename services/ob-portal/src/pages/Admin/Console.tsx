import {
  Container,
  Card,
  Title,
  Text,
  Stack,
  TextInput,
  Button,
  Alert,
  Group,
  ThemeIcon,
  Badge,
  CopyButton,
  ActionIcon,
  Tooltip,
  Paper,
  Table,
  Loader,
  Center,
  Tabs,
  Checkbox,
  Modal,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconMailForward,
  IconCheck,
  IconCopy,
  IconSend,
  IconMail,
  IconUserCheck,
  IconUserX,
  IconInbox,
  IconUsers,
  IconApps,
  IconUserOff,
} from '@tabler/icons-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api, ApiError } from '../../utils/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PartnerStatus = 'invited' | 'pending' | 'active' | 'rejected' | 'revoked';

interface Partner {
  email: string;
  name: string;
  organisation: string;
  status: PartnerStatus;
  is_admin: boolean;
  created_at: string;
}

interface AdminApplication {
  id?: string;
  client_id?: string;
  name: string;
  owner_email: string;
  roles: string[];
  status: string;
  created_at?: string;
}

interface SignupRequest {
  email: string;
  name: string;
  organisation: string;
  message: string;
  requested_at: string;
}

interface InviteResponse {
  email: string;
  status: string;
  expires_at: string;
  emailed: boolean;
  dev_pin?: string;
}

interface ApproveResponse {
  email: string;
  status: string;
  expires_at: string;
  emailed: boolean;
  dev_pin?: string;
}

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------

const PARTNER_STATUS_COLOR: Record<string, string> = {
  active: 'green',
  invited: 'blue',
  pending: 'yellow',
  rejected: 'red',
  revoked: 'gray',
};

function PartnerStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="light" color={PARTNER_STATUS_COLOR[status] ?? 'gray'} tt="capitalize">
      {status}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Partners tab
// ---------------------------------------------------------------------------

function PartnersTab({ currentEmail }: { currentEmail: string }) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Partner | null>(null);
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Partner[]>('/portal-api/admin/partners');
      setPartners(res.data);
    } catch {
      setError('Could not load partners. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    const email = revokeTarget.email;
    setRevoking(true);
    try {
      await api.post('/portal-api/admin/partners/revoke', { email });
      notifications.show({
        title: 'Partner revoked',
        message: `${email} no longer has access.`,
        color: 'green',
      });
      setRevokeTarget(null);
      await load();
    } catch {
      notifications.show({
        title: 'Revoke failed',
        message: `Could not revoke ${email}. Please try again.`,
        color: 'red',
      });
    } finally {
      setRevoking(false);
    }
  };

  const canRevoke = (p: Partner) =>
    p.email !== currentEmail && (p.status === 'active' || p.status === 'invited');

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={4}>Partners</Title>
          <Text size="sm" c="dimmed">
            Everyone invited to or registered on the platform. Revoke removes a partner's access.
          </Text>
        </div>
        <Button variant="subtle" size="xs" onClick={() => void load()} loading={loading}>
          Refresh
        </Button>
      </Group>

      {error && (
        <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>
          {error}
        </Alert>
      )}

      {loading && partners.length === 0 ? (
        <Center py="lg">
          <Loader size="sm" />
        </Center>
      ) : partners.length === 0 ? (
        <Center py="lg">
          <Stack align="center" gap="xs">
            <ThemeIcon size={40} radius="xl" color="gray" variant="light">
              <IconUsers size={22} />
            </ThemeIcon>
            <Text size="sm" c="dimmed">
              No partners yet.
            </Text>
          </Stack>
        </Center>
      ) : (
        <Table.ScrollContainer minWidth={720}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Email</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Organisation</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th ta="right">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {partners.map((p) => (
                <Table.Tr key={p.email}>
                  <Table.Td style={{ wordBreak: 'break-all' }}>{p.email}</Table.Td>
                  <Table.Td>{p.name || <Text c="dimmed">—</Text>}</Table.Td>
                  <Table.Td>{p.organisation || <Text c="dimmed">—</Text>}</Table.Td>
                  <Table.Td>
                    <PartnerStatusBadge status={p.status} />
                  </Table.Td>
                  <Table.Td>
                    {p.is_admin ? (
                      <Badge variant="light" color="bankGreen">
                        Admin
                      </Badge>
                    ) : (
                      <Text c="dimmed" size="sm">
                        Partner
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" justify="flex-end" wrap="nowrap">
                      {canRevoke(p) ? (
                        <Button
                          size="xs"
                          variant="light"
                          color="red"
                          leftSection={<IconUserOff size={14} />}
                          onClick={() => setRevokeTarget(p)}
                        >
                          Revoke
                        </Button>
                      ) : (
                        <Text size="xs" c="dimmed">
                          {p.email === currentEmail ? 'You' : '—'}
                        </Text>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}

      <Modal
        opened={revokeTarget !== null}
        onClose={() => (revoking ? undefined : setRevokeTarget(null))}
        title="Revoke partner access"
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            Revoke access for{' '}
            <Text span fw={600}>
              {revokeTarget?.email}
            </Text>
            ? They will no longer be able to sign in or use their applications.
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setRevokeTarget(null)} disabled={revoking}>
              Cancel
            </Button>
            <Button color="red" onClick={() => void handleRevoke()} loading={revoking}>
              Revoke Access
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Access Requests tab (public self-signup queue)
// ---------------------------------------------------------------------------

function AccessRequestsTab() {
  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<SignupRequest[]>('/portal-api/auth/signup-requests');
      setRequests(res.data);
    } catch {
      setError('Could not load access requests. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = async (email: string) => {
    setActingOn(email);
    try {
      const res = await api.post<ApproveResponse>('/portal-api/auth/signup-requests/approve', {
        email,
      });
      notifications.show({
        title: 'Request approved',
        message: res.data.emailed
          ? `${email} invited, email sent.`
          : `${email} invited — email not configured, share the PIN manually.`,
        color: 'green',
      });
      await load();
    } catch {
      notifications.show({
        title: 'Approval failed',
        message: `Could not approve ${email}. Please try again.`,
        color: 'red',
      });
    } finally {
      setActingOn(null);
    }
  };

  const handleReject = async (email: string) => {
    setActingOn(email);
    try {
      await api.post('/portal-api/auth/signup-requests/reject', { email });
      notifications.show({
        title: 'Request rejected',
        message: `${email} rejected.`,
        color: 'gray',
      });
      await load();
    } catch {
      notifications.show({
        title: 'Rejection failed',
        message: `Could not reject ${email}. Please try again.`,
        color: 'red',
      });
    } finally {
      setActingOn(null);
    }
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={4}>Access requests</Title>
          <Text size="sm" c="dimmed">
            People who requested access via the public sign-up form. Approve to send them an
            invitation, or reject to decline.
          </Text>
        </div>
        <Button variant="subtle" size="xs" onClick={() => void load()} loading={loading}>
          Refresh
        </Button>
      </Group>

      {error && (
        <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>
          {error}
        </Alert>
      )}

      {loading && requests.length === 0 ? (
        <Center py="lg">
          <Loader size="sm" />
        </Center>
      ) : requests.length === 0 ? (
        <Center py="lg">
          <Stack align="center" gap="xs">
            <ThemeIcon size={40} radius="xl" color="gray" variant="light">
              <IconInbox size={22} />
            </ThemeIcon>
            <Text size="sm" c="dimmed">
              No pending access requests.
            </Text>
          </Stack>
        </Center>
      ) : (
        <Table.ScrollContainer minWidth={680}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Email</Table.Th>
                <Table.Th>Name</Table.Th>
                <Table.Th>Organisation</Table.Th>
                <Table.Th>Message</Table.Th>
                <Table.Th>Requested</Table.Th>
                <Table.Th ta="right">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {requests.map((req) => (
                <Table.Tr key={req.email}>
                  <Table.Td style={{ wordBreak: 'break-all' }}>{req.email}</Table.Td>
                  <Table.Td>{req.name || <Text c="dimmed">—</Text>}</Table.Td>
                  <Table.Td>{req.organisation || <Text c="dimmed">—</Text>}</Table.Td>
                  <Table.Td maw={260}>
                    {req.message ? (
                      <Text size="sm" lineClamp={2}>
                        {req.message}
                      </Text>
                    ) : (
                      <Text c="dimmed">—</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {req.requested_at ? new Date(req.requested_at).toLocaleString() : '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" justify="flex-end" wrap="nowrap">
                      <Button
                        size="xs"
                        color="green"
                        leftSection={<IconUserCheck size={14} />}
                        loading={actingOn === req.email}
                        disabled={actingOn !== null && actingOn !== req.email}
                        onClick={() => void handleApprove(req.email)}
                      >
                        Approve
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        color="red"
                        leftSection={<IconUserX size={14} />}
                        loading={actingOn === req.email}
                        disabled={actingOn !== null && actingOn !== req.email}
                        onClick={() => void handleReject(req.email)}
                      >
                        Reject
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Applications tab (all TPPs across tenants)
// ---------------------------------------------------------------------------

function ApplicationsTab() {
  const [apps, setApps] = useState<AdminApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<AdminApplication[]>('/portal-api/admin/applications');
      setApps(res.data);
    } catch {
      setError('Could not load applications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={4}>Applications</Title>
          <Text size="sm" c="dimmed">
            Every TPP application registered on the platform, across all partners.
          </Text>
        </div>
        <Button variant="subtle" size="xs" onClick={() => void load()} loading={loading}>
          Refresh
        </Button>
      </Group>

      {error && (
        <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>
          {error}
        </Alert>
      )}

      {loading && apps.length === 0 ? (
        <Center py="lg">
          <Loader size="sm" />
        </Center>
      ) : apps.length === 0 ? (
        <Center py="lg">
          <Stack align="center" gap="xs">
            <ThemeIcon size={40} radius="xl" color="gray" variant="light">
              <IconApps size={22} />
            </ThemeIcon>
            <Text size="sm" c="dimmed">
              No applications registered yet.
            </Text>
          </Stack>
        </Center>
      ) : (
        <Table.ScrollContainer minWidth={720}>
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Application</Table.Th>
                <Table.Th>Owner</Table.Th>
                <Table.Th>Roles</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Created</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {apps.map((app) => (
                <Table.Tr key={app.client_id || app.id || app.name}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {app.name}
                    </Text>
                    {(app.client_id || app.id) && (
                      <Text size="xs" c="dimmed" ff="monospace">
                        {app.client_id || app.id}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td style={{ wordBreak: 'break-all' }}>
                    {app.owner_email || <Text c="dimmed">—</Text>}
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {(app.roles || []).map((role) => (
                        <Badge key={role} variant="outline" size="sm">
                          {role}
                        </Badge>
                      ))}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <PartnerStatusBadge status={app.status} />
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {app.created_at ? new Date(app.created_at).toLocaleDateString() : '—'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Invite tab (direct invite form)
// ---------------------------------------------------------------------------

function InviteTab() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [tppClientId, setTppClientId] = useState('');
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResponse | null>(null);

  const valid = /^\S+@\S+\.\S+$/.test(email.trim()) && name.trim().length > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post<InviteResponse>('/portal-api/auth/invite', {
        email: email.trim(),
        name: name.trim(),
        tpp_client_id: tppClientId.trim() || undefined,
        is_admin: makeAdmin || undefined,
      });
      setResult(res.data);
      setEmail('');
      setName('');
      setTppClientId('');
      setMakeAdmin(false);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 403) {
        setError('You are not authorised to send invitations.');
      } else {
        setError('Could not send the invitation. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack gap="md">
      <div>
        <Title order={4}>Invite a partner</Title>
        <Text size="sm" c="dimmed">
          Send an activation invitation. The partner receives a PIN by email and completes their own
          password and authenticator setup.
        </Text>
      </div>

      <Card withBorder p="xl">
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            {error && (
              <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>
                {error}
              </Alert>
            )}

            <TextInput
              label="Partner email"
              placeholder="partner@company.com"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
            <TextInput
              label="Partner name"
              placeholder="Full name"
              required
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
            <TextInput
              label="TPP client ID"
              description="Optional — link this person to an existing TPP application"
              placeholder="acme-fintech-prod"
              value={tppClientId}
              onChange={(e) => setTppClientId(e.currentTarget.value)}
            />
            <Checkbox
              label="Grant administrator access"
              description="Admins can manage partners, applications, and invitations."
              checked={makeAdmin}
              onChange={(e) => setMakeAdmin(e.currentTarget.checked)}
            />

            <Group justify="flex-end">
              <Button
                type="submit"
                leftSection={<IconSend size={16} />}
                loading={busy}
                disabled={!valid}
              >
                Send Invitation
              </Button>
            </Group>
          </Stack>
        </form>
      </Card>

      {result && (
        <Card withBorder p="lg">
          <Group gap="sm" mb="md">
            <ThemeIcon size={40} radius="xl" color="green" variant="light">
              <IconMailForward size={22} />
            </ThemeIcon>
            <div>
              <Title order={4}>Invitation created</Title>
              <Text size="sm" c="dimmed">
                {result.email}
              </Text>
            </div>
          </Group>

          <Stack gap="sm">
            <Group gap="xs">
              {result.emailed ? (
                <Badge color="green" variant="light" leftSection={<IconMail size={12} />}>
                  Emailed to partner
                </Badge>
              ) : (
                <Badge color="yellow" variant="light" leftSection={<IconAlertCircle size={12} />}>
                  Email not sent — share the PIN manually
                </Badge>
              )}
              <Badge variant="light" color="blue">
                {result.status}
              </Badge>
              {result.expires_at && (
                <Text size="xs" c="dimmed">
                  Expires {new Date(result.expires_at).toLocaleString()}
                </Text>
              )}
            </Group>

            {result.dev_pin && (
              <Alert color="orange" variant="light" icon={<IconAlertCircle size={16} />}>
                <Text size="sm" fw={600} mb={6}>
                  Development PIN (email delivery not configured)
                </Text>
                <Group gap="xs" wrap="nowrap">
                  <Paper
                    withBorder
                    px="sm"
                    py={6}
                    style={{ flex: 1, fontFamily: 'monospace', fontSize: '1rem', letterSpacing: 2 }}
                  >
                    {result.dev_pin}
                  </Paper>
                  <CopyButton value={result.dev_pin}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'Copied' : 'Copy'}>
                        <ActionIcon
                          variant="subtle"
                          color={copied ? 'green' : 'gray'}
                          onClick={copy}
                        >
                          {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
              </Alert>
            )}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// Admin Console (tabbed, admin-gated)
// ---------------------------------------------------------------------------

export default function AdminConsole() {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();

  // Redirect non-admins to home once auth has hydrated.
  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/', { replace: true });
    }
  }, [loading, isAdmin, navigate]);

  if (loading) {
    return (
      <Container size="lg">
        <Center py={80}>
          <Loader color="bankGreen" />
        </Center>
      </Container>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Container size="lg">
      <Stack gap="lg">
        <div>
          <Text size="sm" fw={600} c="bankGreen" tt="uppercase" mb={4}>
            Administration
          </Text>
          <Title order={2}>Admin Console</Title>
          <Text c="dimmed" mt="xs">
            Manage partners, access requests, applications, and invitations.
          </Text>
        </div>

        <Tabs defaultValue="partners" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="partners" leftSection={<IconUsers size={16} />}>
              Partners
            </Tabs.Tab>
            <Tabs.Tab value="requests" leftSection={<IconInbox size={16} />}>
              Access Requests
            </Tabs.Tab>
            <Tabs.Tab value="applications" leftSection={<IconApps size={16} />}>
              Applications
            </Tabs.Tab>
            <Tabs.Tab value="invite" leftSection={<IconMailForward size={16} />}>
              Invite
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="partners" pt="lg">
            <PartnersTab currentEmail={user?.email ?? ''} />
          </Tabs.Panel>
          <Tabs.Panel value="requests" pt="lg">
            <AccessRequestsTab />
          </Tabs.Panel>
          <Tabs.Panel value="applications" pt="lg">
            <ApplicationsTab />
          </Tabs.Panel>
          <Tabs.Panel value="invite" pt="lg">
            <InviteTab />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
