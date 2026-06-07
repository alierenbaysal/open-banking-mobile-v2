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
} from '@mantine/core';
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
} from '@tabler/icons-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api, ApiError } from '../../utils/api';

interface InviteResponse {
  email: string;
  status: string;
  expires_at: string;
  emailed: boolean;
  dev_pin?: string;
}

interface SignupRequest {
  email: string;
  name: string;
  organisation: string;
  message: string;
  requested_at: string;
}

interface ApproveResponse {
  email: string;
  status: string;
  expires_at: string;
  emailed: boolean;
  dev_pin?: string;
}

export default function InvitationsPage() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [tppClientId, setTppClientId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResponse | null>(null);

  const [requests, setRequests] = useState<SignupRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      const res = await api.get<SignupRequest[]>('/portal-api/auth/signup-requests');
      setRequests(res.data);
    } catch {
      setRequestsError('Could not load access requests. Please try again.');
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && isAdmin) {
      void loadRequests();
    }
  }, [loading, isAdmin, loadRequests]);

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
      await loadRequests();
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
      await loadRequests();
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

  if (!loading && !isAdmin) {
    return (
      <Container size="md">
        <Card withBorder p="xl" ta="center">
          <Stack align="center" gap="md">
            <ThemeIcon size={64} radius="xl" color="red" variant="light">
              <IconAlertCircle size={32} />
            </ThemeIcon>
            <Title order={3}>Administrators only</Title>
            <Text c="dimmed" maw={400}>
              You need the <Badge variant="light">qantara-admin</Badge> role to invite partners.
            </Text>
            <Button variant="light" onClick={() => navigate('/applications')}>
              Back to Applications
            </Button>
          </Stack>
        </Card>
      </Container>
    );
  }

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
      });
      setResult(res.data);
      setEmail('');
      setName('');
      setTppClientId('');
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
    <Container size="md">
      <Stack gap="lg">
        <div>
          <Text size="sm" fw={600} c="bankGreen" tt="uppercase" mb={4}>
            Administration
          </Text>
          <Title order={2}>Invite a Partner</Title>
          <Text c="dimmed" mt="xs">
            Send an activation invitation. The partner receives a PIN by email and completes their
            own password and authenticator setup.
          </Text>
        </div>

        <Card withBorder p="xl">
          <Group justify="space-between" mb="md">
            <div>
              <Title order={4}>Access requests</Title>
              <Text size="sm" c="dimmed">
                People who requested access via the public sign-up form. Approve to send them an
                invitation, or reject to decline.
              </Text>
            </div>
            <Button
              variant="subtle"
              size="xs"
              onClick={() => void loadRequests()}
              loading={requestsLoading}
            >
              Refresh
            </Button>
          </Group>

          {requestsError && (
            <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />} mb="md">
              {requestsError}
            </Alert>
          )}

          {requestsLoading && requests.length === 0 ? (
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
                          {req.requested_at
                            ? new Date(req.requested_at).toLocaleString()
                            : '—'}
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
        </Card>

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
                <Text size="sm" c="dimmed">{result.email}</Text>
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
                <Badge variant="light" color="blue">{result.status}</Badge>
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
                          <ActionIcon variant="subtle" color={copied ? 'green' : 'gray'} onClick={copy}>
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
    </Container>
  );
}
