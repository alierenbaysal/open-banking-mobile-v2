/**
 * Login page — Bank Dhofar's own login form.
 * No Keycloak redirect. Customer authenticates directly on bankdhofar.com.
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Center,
  Stack,
  Paper,
  Text,
  Button,
  Loader,
  Box,
  Divider,
  TextInput,
  PasswordInput,
  Alert,
} from '@mantine/core';
import {
  IconBuildingBank,
  IconLogin,
  IconShieldCheck,
  IconAlertCircle,
} from '@tabler/icons-react';
import { login, isAuthenticated } from '@/utils/auth';

export default function Login() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Consent flow params — preserve across login
  const consentId = searchParams.get('consent_id');
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  const clientId = searchParams.get('client_id');

  useEffect(() => {
    // Check if already authenticated
    isAuthenticated().then((authed) => {
      if (authed) {
        if (consentId) {
          const params = new URLSearchParams();
          params.set('consent_id', consentId);
          if (redirectUri) params.set('redirect_uri', redirectUri);
          if (state) params.set('state', state);
          if (clientId) params.set('client_id', clientId);
          navigate(`/consent/approve?${params.toString()}`, { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        setLoading(false);
      }
    });
  }, [consentId, redirectUri, state, clientId, navigate]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !password) return;

    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);

      // After successful login, redirect to consent approval or dashboard
      if (consentId) {
        const params = new URLSearchParams();
        params.set('consent_id', consentId);
        if (redirectUri) params.set('redirect_uri', redirectUri);
        if (state) params.set('state', state);
        if (clientId) params.set('client_id', clientId);
        navigate(`/consent/approve?${params.toString()}`, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #4D9134 0%, #326323 50%, #264c1b 100%)',
        }}
      >
        <Center h="100vh">
          <Loader color="white" size="lg" />
        </Center>
      </Box>
    );
  }

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #4D9134 0%, #326323 50%, #264c1b 100%)',
      }}
    >
      <Center h="100vh">
        <Paper
          shadow="xl"
          radius="lg"
          p="xl"
          w={420}
          style={{ maxWidth: '90vw' }}
        >
          <form onSubmit={handleSubmit}>
            <Stack align="center" gap="lg">
              {/* Bank logo and name */}
              <Box
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 16,
                  backgroundColor: '#4D9134',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconBuildingBank size={36} color="white" />
              </Box>

              <Text size="xl" fw={700} c="dark">
                Bank Dhofar
              </Text>

              <Text size="sm" c="dimmed" ta="center">
                Sign In
              </Text>

              <Divider w="100%" />

              {consentId && (
                <Box
                  style={{
                    backgroundColor: '#f0f9ed',
                    borderRadius: 8,
                    padding: '12px 16px',
                    width: '100%',
                  }}
                >
                  <Stack gap={4} align="center">
                    <IconShieldCheck size={20} color="#4D9134" />
                    <Text size="sm" ta="center" c="#4D9134" fw={500}>
                      A service provider is requesting access to your account information.
                    </Text>
                    <Text size="xs" c="dimmed">
                      Please sign in to review and approve.
                    </Text>
                  </Stack>
                </Box>
              )}

              {error && (
                <Alert
                  w="100%"
                  variant="light"
                  color="red"
                  icon={<IconAlertCircle size={16} />}
                  radius="md"
                >
                  <Text size="sm">{error}</Text>
                </Alert>
              )}

              <TextInput
                w="100%"
                label="Email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                type="email"
                required
                autoFocus
                size="md"
              />

              <PasswordInput
                w="100%"
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                required
                size="md"
              />

              <Button
                type="submit"
                fullWidth
                size="lg"
                color="green"
                radius="md"
                leftSection={submitting ? <Loader size="sm" color="white" /> : <IconLogin size={20} />}
                disabled={submitting || !email || !password}
                style={{ backgroundColor: '#4D9134' }}
              >
                {submitting ? 'Signing in...' : 'Sign In'}
              </Button>

              <Text size="xs" c="dimmed" ta="center">
                Secured by Bank Dhofar
              </Text>
            </Stack>
          </form>
        </Paper>
      </Center>
    </Box>
  );
}
