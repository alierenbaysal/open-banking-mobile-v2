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
        background: 'linear-gradient(135deg, #f0fdf4, #e6fcf5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Container size="xs">
        <Card shadow="md" padding="xl" radius="lg" withBorder>
          {state === 'processing' && (
            <Stack align="center" gap="lg" py="xl">
              <Loader size="lg" color="teal" />
              <Box ta="center">
                <Text fw={600} size="lg">Connecting to Bank Dhofar</Text>
                <Text size="sm" c="dimmed" mt="xs">
                  Exchanging authorization and setting up your business account...
                </Text>
                <Text size="xs" c="dimmed" mt={4}>{'\u062C\u0627\u0631\u064A \u0631\u0628\u0637 \u062D\u0633\u0627\u0628\u0643 \u0627\u0644\u0628\u0646\u0643\u064A...'}</Text>
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
                  Your Bank Dhofar business account is now linked to Hisab.
                </Text>
                <Text size="xs" c="dimmed" mt={4}>{'\u062A\u0645 \u0631\u0628\u0637 \u062D\u0633\u0627\u0628\u0643 \u0628\u0646\u062C\u0627\u062D'}</Text>
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
              <Button color="teal" onClick={() => navigate('/connect')}>
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
