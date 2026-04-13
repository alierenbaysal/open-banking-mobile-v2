import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Center,
  Loader,
  Stack,
  Text,
  Alert,
  Button,
  Container,
  Card,
  ThemeIcon,
} from '@mantine/core';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';
import { exchangeAuthCode, validateState, storeCredentials } from '@/utils/consent';

type CallbackState = 'processing' | 'success' | 'error';

export default function Callback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<CallbackState>('processing');
  const [error, setError] = useState('');

  useEffect(() => {
    const process = async () => {
      try {
        const code = searchParams.get('code');
        const stateParam = searchParams.get('state');

        if (!code) {
          // Check for error response from BD Online
          const errorParam = searchParams.get('error');
          if (errorParam) {
            throw new Error(`Authorization denied: ${searchParams.get('error_description') || errorParam}`);
          }
          throw new Error('Missing authorization code in callback');
        }

        // Validate state parameter (CSRF protection)
        if (stateParam) {
          const valid = validateState(stateParam);
          if (!valid) {
            throw new Error('Invalid state parameter. Please try connecting again.');
          }
        }

        // Exchange authorization code for access token
        const { access_token, consent_id } = await exchangeAuthCode(code);

        // Store credentials
        storeCredentials(access_token, consent_id);

        setState('success');

        // Redirect to dashboard after brief success message
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1500);
      } catch (err: any) {
        setError(err.message || 'Failed to complete bank connection');
        setState('error');
      }
    };

    process();
  }, [searchParams, navigate]);

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8f7ff, #f0f9f4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Container size="xs">
        <Card shadow="md" padding="xl" radius="lg" withBorder>
          {state === 'processing' && (
            <Stack align="center" gap="lg" py="xl">
              <Loader size="lg" color="violet" />
              <Box ta="center">
                <Text fw={600} size="lg">Connecting to Bank Dhofar</Text>
                <Text size="sm" c="dimmed" mt="xs">
                  Exchanging authorization and setting up your account...
                </Text>
                <Text size="xs" c="dimmed" mt={4}>جاري ربط حسابك البنكي...</Text>
              </Box>
            </Stack>
          )}

          {state === 'success' && (
            <Stack align="center" gap="lg" py="xl">
              <ThemeIcon size={80} radius="xl" color="teal" variant="light">
                <IconCheck size={40} />
              </ThemeIcon>
              <Box ta="center">
                <Text fw={700} size="xl" c="teal">Connected Successfully!</Text>
                <Text size="sm" c="dimmed" mt="xs">
                  Your Bank Dhofar account is now linked to Masroofi.
                </Text>
                <Text size="xs" c="dimmed" mt={4}>تم ربط حسابك بنجاح</Text>
              </Box>
              <Text size="xs" c="dimmed">Redirecting to dashboard...</Text>
            </Stack>
          )}

          {state === 'error' && (
            <Stack align="center" gap="lg" py="md">
              <ThemeIcon size={80} radius="xl" color="red" variant="light">
                <IconAlertCircle size={40} />
              </ThemeIcon>
              <Box ta="center">
                <Text fw={700} size="lg">Connection Failed</Text>
                <Text size="sm" c="dimmed" mt="xs">{error}</Text>
              </Box>
              <Button color="violet" onClick={() => navigate('/connect')}>
                Try Again
              </Button>
              <Button variant="subtle" color="gray" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            </Stack>
          )}
        </Card>
      </Container>
    </Box>
  );
}
