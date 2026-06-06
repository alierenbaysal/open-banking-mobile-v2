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
} from '@mantine/core';
import {
  IconAlertCircle,
  IconMailForward,
  IconCheck,
  IconCopy,
  IconSend,
  IconMail,
} from '@tabler/icons-react';
import { FormEvent, useState } from 'react';
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

export default function InvitationsPage() {
  const navigate = useNavigate();
  const { isAdmin, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [tppClientId, setTppClientId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResponse | null>(null);

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
