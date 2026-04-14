import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  Container,
  Group,
  List,
  Loader,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Alert,
  Badge,
  Stepper,
} from '@mantine/core';
import {
  IconBuildingBank,
  IconShieldCheck,
  IconCheck,
  IconAlertCircle,
  IconExternalLink,
  IconPlugConnected,
  IconEye,
  IconCreditCard,
  IconReceipt,
} from '@tabler/icons-react';
import { createConsent, buildConsentRedirectUrl, isBankConnected } from '@/utils/consent';
import { useNavigate } from 'react-router-dom';

const PERMISSIONS = [
  { label: 'View account details', icon: IconCreditCard },
  { label: 'View account balances', icon: IconEye },
  { label: 'View transaction history', icon: IconReceipt },
];

export default function ConnectBank() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);

  const connected = isBankConnected();

  if (connected) {
    return (
      <Container size="sm" py="xl">
        <Card shadow="sm" padding="xl" radius="lg" withBorder>
          <Stack align="center" gap="lg" py="md">
            <ThemeIcon size={80} radius="xl" color="teal" variant="light">
              <IconCheck size={40} />
            </ThemeIcon>
            <Title order={3} ta="center">Bank Account Connected</Title>
            <Text c="dimmed" ta="center">
              Your Bank Dhofar account is already connected. You can view your data on the dashboard.
            </Text>
            <Button color="violet" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </Stack>
        </Card>
      </Container>
    );
  }

  const handleConnect = async () => {
    setLoading(true);
    setError('');
    setStep(1);

    try {
      // Step 1: Create consent
      const consent = await createConsent();
      setStep(2);

      // Step 2: Redirect to BD Online for approval
      const redirectUrl = buildConsentRedirectUrl(consent.consent_id);

      // Brief pause so user can see the step progress
      await new Promise((r) => setTimeout(r, 800));
      setStep(3);

      // Redirect to Bank Dhofar Online
      window.location.href = redirectUrl;
    } catch (err: any) {
      setError(err.message || 'Failed to initiate bank connection');
      setLoading(false);
      setStep(0);
    }
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Title order={2}>Connect Bank Dhofar</Title>

        {error && (
          <Alert icon={<IconAlertCircle size={18} />} color="red" title="Connection Error" variant="light">
            {error}
          </Alert>
        )}

        <Card shadow="md" padding="xl" radius="lg" withBorder>
          <Group gap="lg" mb="xl">
            <Box
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #4D9134, #6ab04c)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconBuildingBank size={34} color="white" />
            </Box>
            <Box>
              <Group gap="xs">
                <Text fw={700} size="xl">Bank Dhofar</Text>
                <Badge color="green" size="sm" variant="filled">Supported</Badge>
              </Group>
              <Text size="xs" c="dimmed" mt={2}>Secure connection via Open Banking APIs</Text>
            </Box>
          </Group>

          <Paper p="md" radius="md" bg="gray.0" mb="xl">
            <Text fw={600} size="sm" mb="sm">Masroofi will request permission to:</Text>
            <Stack gap="sm">
              {PERMISSIONS.map((perm) => (
                <Group key={perm.label} gap="sm">
                  <ThemeIcon size={28} radius="xl" color="violet" variant="light">
                    <perm.icon size={14} />
                  </ThemeIcon>
                  <Text size="sm">{perm.label}</Text>
                </Group>
              ))}
            </Stack>
          </Paper>

          {loading && (
            <Paper p="md" radius="md" bg="violet.0" mb="xl">
              <Stepper
                active={step}
                size="sm"
                color="violet"
              >
                <Stepper.Step label="Creating consent" description="Requesting access" />
                <Stepper.Step label="Consent created" description="Preparing redirect" />
                <Stepper.Step label="Redirecting" description="To Bank Dhofar" />
              </Stepper>
            </Paper>
          )}

          <Stack gap="sm">
            <Button
              fullWidth
              size="lg"
              color="violet"
              loading={loading}
              leftSection={!loading ? <IconPlugConnected size={20} /> : undefined}
              rightSection={!loading ? <IconExternalLink size={16} /> : undefined}
              onClick={handleConnect}
            >
              {loading ? 'Connecting...' : 'Connect Bank Dhofar Account'}
            </Button>
            <Text size="xs" c="dimmed" ta="center">
              You will be redirected to Bank Dhofar Online to approve the connection.
            </Text>
          </Stack>
        </Card>

        <Paper p="lg" radius="md" withBorder>
          <Group gap="sm" mb="sm">
            <IconShieldCheck size={20} color="#00b894" />
            <Text fw={600} size="sm">Your security matters</Text>
          </Group>
          <List size="sm" spacing="xs" c="dimmed">
            <List.Item>Masroofi never sees your banking login credentials</List.Item>
            <List.Item>Access is read-only and can be revoked at any time</List.Item>
            <List.Item>Consent is valid for 90 days and can be renewed</List.Item>
            <List.Item>Compliant with Central Bank of Oman Open Banking regulations</List.Item>
          </List>
        </Paper>
      </Stack>
    </Container>
  );
}
