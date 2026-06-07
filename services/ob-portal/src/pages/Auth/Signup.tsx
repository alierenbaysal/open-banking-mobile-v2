import {
  Container,
  Card,
  Title,
  Text,
  Stack,
  TextInput,
  Textarea,
  Button,
  Alert,
  Group,
  Anchor,
  ThemeIcon,
  Box,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconUserPlus,
  IconCircleCheck,
  IconInfoCircle,
} from '@tabler/icons-react';
import { FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../../utils/api';

interface SignupResponse {
  status: 'pending_approval' | 'already_pending';
}

type Outcome =
  | { kind: 'pending_approval' }
  | { kind: 'already_pending' }
  | { kind: 'already_registered' };

function errorCode(err: ApiError): string {
  const body = err.body;
  if (body && typeof body === 'object' && 'error' in body) {
    return String((body as Record<string, unknown>).error);
  }
  return '';
}

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const valid = /^\S+@\S+\.\S+$/.test(email.trim());

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    setOutcome(null);
    try {
      const res = await api.post<SignupResponse>('/portal-api/auth/signup', {
        email: email.trim(),
        name: name.trim(),
        organisation: organisation.trim(),
        message: message.trim(),
      });
      if (res.data.status === 'already_pending') {
        setOutcome({ kind: 'already_pending' });
      } else {
        setOutcome({ kind: 'pending_approval' });
      }
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 409 || errorCode(apiErr) === 'already_registered') {
        setOutcome({ kind: 'already_registered' });
      } else {
        setError('Could not submit your request. Please try again in a moment.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container size={460} py={48}>
      <Stack align="center" gap="lg">
        <Box ta="center">
          <ThemeIcon size={56} radius="xl" color="bankGreen" variant="light" mb="sm">
            <IconUserPlus size={28} />
          </ThemeIcon>
          <Title order={2}>Request access to Qantara</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Tell us about yourself. An administrator will review your request and email you an
            invitation to activate your account.
          </Text>
        </Box>

        <Card withBorder w="100%" p="xl">
          {outcome?.kind === 'pending_approval' && (
            <Alert color="green" variant="light" icon={<IconCircleCheck size={16} />}>
              <Text size="sm" fw={600} mb={4}>
                Request submitted
              </Text>
              <Text size="sm">
                Thanks — you'll receive an email once an admin approves your access. You can then
                activate your account using the PIN in that email.
              </Text>
            </Alert>
          )}

          {outcome?.kind === 'already_pending' && (
            <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />}>
              <Text size="sm" fw={600} mb={4}>
                Request already received
              </Text>
              <Text size="sm">
                We already have a pending access request for this email. An administrator will be in
                touch by email shortly.
              </Text>
            </Alert>
          )}

          {outcome?.kind === 'already_registered' && (
            <Alert color="yellow" variant="light" icon={<IconInfoCircle size={16} />}>
              <Text size="sm" fw={600} mb={4}>
                You already have an account
              </Text>
              <Text size="sm">
                This email is already registered.{' '}
                <Anchor component={Link} to="/login">
                  Sign in instead
                </Anchor>
                .
              </Text>
            </Alert>
          )}

          {!outcome && (
            <form onSubmit={handleSubmit}>
              <Stack gap="md">
                {error && (
                  <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>
                    {error}
                  </Alert>
                )}

                <TextInput
                  label="Email"
                  placeholder="you@company.com"
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                />
                <TextInput
                  label="Full name"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                />
                <TextInput
                  label="Organisation"
                  placeholder="Your company"
                  value={organisation}
                  onChange={(e) => setOrganisation(e.currentTarget.value)}
                />
                <Textarea
                  label="Message"
                  description="Optional — tell us what you're building"
                  placeholder="We're building a personal finance app and would like to integrate account information APIs."
                  autosize
                  minRows={3}
                  value={message}
                  onChange={(e) => setMessage(e.currentTarget.value)}
                />

                <Button type="submit" fullWidth loading={busy} disabled={!valid}>
                  Request Access
                </Button>
              </Stack>
            </form>
          )}
        </Card>

        <Group gap={4}>
          <Text size="sm" c="dimmed">
            Already have an account?
          </Text>
          <Anchor size="sm" component={Link} to="/login">
            Sign in
          </Anchor>
        </Group>
      </Stack>
    </Container>
  );
}
