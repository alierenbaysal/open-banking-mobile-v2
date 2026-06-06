import {
  Container,
  Card,
  Title,
  Text,
  Stack,
  TextInput,
  PasswordInput,
  Button,
  Alert,
  Group,
  Anchor,
  ThemeIcon,
  Box,
} from '@mantine/core';
import { IconAlertCircle, IconLock } from '@tabler/icons-react';
import { FormEvent, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ApiError } from '../../utils/api';

function errorCode(err: ApiError): string {
  const body = err.body;
  if (body && typeof body === 'object' && 'error' in body) {
    return String((body as Record<string, unknown>).error);
  }
  return '';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid =
    /^\S+@\S+\.\S+$/.test(email.trim()) && password.length > 0 && /^\d{6}$/.test(code.trim());

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password, code.trim());
      await refresh();
      navigate('/applications');
    } catch (err) {
      const apiErr = err as ApiError;
      const ec = errorCode(apiErr);
      if (apiErr.status === 403 || ec === 'not_activated') {
        setError(
          'Your account is not activated yet. Please complete the activation steps using the PIN from your invitation email.'
        );
      } else if (apiErr.status === 401 || ec === 'invalid_login') {
        setError('Invalid email, password, or authenticator code. Please try again.');
      } else {
        setError('Sign in failed. Please try again in a moment.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container size={420} py={60}>
      <Stack align="center" gap="lg">
        <Box ta="center">
          <ThemeIcon size={56} radius="xl" color="bankGreen" variant="light" mb="sm">
            <IconLock size={28} />
          </ThemeIcon>
          <Title order={2}>Sign in to Qantara</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Access your developer portal and TPP applications.
          </Text>
        </Box>

        <Card withBorder w="100%" p="xl">
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
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
              />

              <PasswordInput
                label="Password"
                placeholder="Your password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
              />

              <TextInput
                label="Authenticator code"
                description="6-digit code from your authenticator app"
                placeholder="123456"
                required
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.currentTarget.value.replace(/\D/g, ''))}
              />

              <Button type="submit" fullWidth loading={submitting} disabled={!valid}>
                Sign In
              </Button>
            </Stack>
          </form>
        </Card>

        <Group gap={4}>
          <Text size="sm" c="dimmed">
            Have an invitation?
          </Text>
          <Anchor size="sm" component={Link} to="/activate">
            Activate your account
          </Anchor>
        </Group>
      </Stack>
    </Container>
  );
}
