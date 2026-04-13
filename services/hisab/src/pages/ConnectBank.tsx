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
  { label: 'View account details', labelAr: '\u0639\u0631\u0636 \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u062D\u0633\u0627\u0628', icon: IconCreditCard },
  { label: 'View account balances', labelAr: '\u0639\u0631\u0636 \u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A', icon: IconEye },
  { label: 'View transaction history', labelAr: '\u0639\u0631\u0636 \u0633\u062C\u0644 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A', icon: IconReceipt },
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
              Your Bank Dhofar business account is already connected. You can view your data on the dashboard.
            </Text>
            <Button color="teal" onClick={() => navigate('/dashboard')}>
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
        <Box>
          <Title order={2}>Connect Bank Dhofar</Title>
          <Text size="sm" c="dimmed" mt={4}>{'\u0631\u0628\u0637 \u062D\u0633\u0627\u0628 \u0628\u0646\u0643 \u0638\u0641\u0627\u0631'}</Text>
        </Box>

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
              <Text size="sm" c="dimmed">{'\u0628\u0646\u0643 \u0638\u0641\u0627\u0631'}</Text>
              <Text size="xs" c="dimmed" mt={2}>Secure connection via Open Banking APIs</Text>
            </Box>
          </Group>

          <Paper p="md" radius="md" bg="gray.0" mb="xl">
            <Text fw={600} size="sm" mb="sm">Hisab will request permission to:</Text>
            <Stack gap="sm">
              {PERMISSIONS.map((perm) => (
                <Group key={perm.label} gap="sm">
                  <ThemeIcon size={28} radius="xl" color="teal" variant="light">
                    <perm.icon size={14} />
                  </ThemeIcon>
                  <Box>
                    <Text size="sm">{perm.label}</Text>
                    <Text size="xs" c="dimmed">{perm.labelAr}</Text>
                  </Box>
                </Group>
              ))}
            </Stack>
          </Paper>

          {loading && (
            <Paper p="md" radius="md" bg="teal.0" mb="xl">
              <Stepper
                active={step}
                size="sm"
                color="teal"
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
              color="teal"
              loading={loading}
              leftSection={!loading ? <IconPlugConnected size={20} /> : undefined}
              rightSection={!loading ? <IconExternalLink size={16} /> : undefined}
              onClick={handleConnect}
            >
              {loading ? 'Connecting...' : 'Connect Business Account'}
            </Button>
            <Text size="xs" c="dimmed" ta="center">
              You will be redirected to Bank Dhofar Online to approve the connection.
              <br />
              {'\u0633\u064A\u062A\u0645 \u0625\u0639\u0627\u062F\u0629 \u062A\u0648\u062C\u064A\u0647\u0643 \u0625\u0644\u0649 \u0628\u0646\u0643 \u0638\u0641\u0627\u0631 \u0639\u0628\u0631 \u0627\u0644\u0625\u0646\u062A\u0631\u0646\u062A \u0644\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0639\u0644\u0649 \u0627\u0644\u0627\u062A\u0635\u0627\u0644.'}
            </Text>
          </Stack>
        </Card>

        <Paper p="lg" radius="md" withBorder>
          <Group gap="sm" mb="sm">
            <IconShieldCheck size={20} color="#00B894" />
            <Text fw={600} size="sm">Your security matters</Text>
          </Group>
          <List size="sm" spacing="xs" c="dimmed">
            <List.Item>Hisab never sees your banking login credentials</List.Item>
            <List.Item>Access is read-only and can be revoked at any time</List.Item>
            <List.Item>Consent is valid for 90 days and can be renewed</List.Item>
            <List.Item>Compliant with Central Bank of Oman Open Banking regulations</List.Item>
          </List>
        </Paper>
      </Stack>
    </Container>
  );
}
