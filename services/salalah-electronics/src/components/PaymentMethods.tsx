import { useState } from 'react';
import {
  Paper,
  Text,
  Group,
  Stack,
  Button,
  Box,
  Loader,
  Badge,
  Alert,
  ThemeIcon,
} from '@mantine/core';
import {
  IconBuildingBank,
  IconCreditCard,
  IconBrandApple,
  IconLock,
  IconAlertCircle,
  IconShieldCheck,
} from '@tabler/icons-react';
import { formatOMR } from '@/utils/products';
import {
  createPaymentConsent,
  buildPaymentRedirectUrl,
  storePaymentContext,
  generateOrderRef,
} from '@/utils/payment';

interface PaymentMethodsProps {
  total: number;
  disabled?: boolean;
}

export default function PaymentMethods({ total, disabled }: PaymentMethodsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayWithBD = async () => {
    if (disabled) return;

    setLoading(true);
    setError(null);

    try {
      const orderRef = generateOrderRef();

      // 1. Create domestic-payment consent via Sadad gateway
      const consent = await createPaymentConsent(total, orderRef);

      // 2. Store context for callback
      storePaymentContext(consent.consent_id, orderRef);

      // 3. Redirect to BD Online for approval
      const redirectUrl = buildPaymentRedirectUrl(consent.consent_id);
      window.location.href = redirectUrl;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to initiate payment. Please try again.'
      );
      setLoading(false);
    }
  };

  return (
    <Paper shadow="sm" radius="md" p="lg" withBorder>
      <Stack gap="md">
        <Group gap="xs" mb="md">
          <ThemeIcon size="lg" color="blue" variant="light" radius="xl">
            <IconShieldCheck size={20} />
          </ThemeIcon>
          <Box>
            <Text fw={700} size="md">Sadad Payment Gateway</Text>
            <Text size="xs" c="dimmed">{'\u0633\u062F\u0627\u062F \u2014 \u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u062F\u0641\u0639 \u0627\u0644\u0622\u0645\u0646\u0629'}</Text>
          </Box>
        </Group>
        <Text size="sm" c="dimmed" mb="md">
          Choose your payment method / {'\u0627\u062E\u062A\u0631 \u0637\u0631\u064A\u0642\u0629 \u0627\u0644\u062F\u0641\u0639'}
        </Text>

        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Payment Error"
            color="red"
            withCloseButton
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        {/* Pay with Bank Dhofar -- LIVE */}
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{
            borderColor: '#D35400',
            borderWidth: 2,
            background: 'linear-gradient(135deg, #fff9f5 0%, #fff4e6 100%)',
          }}
        >
          <Group justify="space-between" align="flex-start" mb="sm">
            <Group gap="sm">
              <Box
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #00695c, #00897b)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconBuildingBank size={22} color="white" stroke={1.5} />
              </Box>
              <Box>
                <Text fw={600} size="md">
                  Pay with Bank Dhofar
                </Text>
                <Text size="xs" c="dimmed">
                  Pay directly from your bank account
                </Text>
              </Box>
            </Group>
            <Badge color="teal" variant="light" size="sm">
              Powered by Sadad
            </Badge>
          </Group>

          <Button
            fullWidth
            size="xl"
            radius="md"
            color="teal"
            leftSection={
              loading ? (
                <Loader size={20} color="white" />
              ) : (
                <IconBuildingBank size={22} />
              )
            }
            onClick={handlePayWithBD}
            disabled={loading || disabled}
            style={{
              height: 56,
              fontSize: 17,
            }}
          >
            {loading
              ? 'Creating payment...'
              : `Pay ${formatOMR(total)}`}
          </Button>
        </Paper>

        {/* Bank Muscat -- COMING SOON */}
        <Paper p="md" radius="md" withBorder style={{ opacity: 0.5, cursor: 'not-allowed' }}>
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <Box style={{ width: 40, height: 40, borderRadius: 8, background: '#e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconBuildingBank size={22} color="#868e96" stroke={1.5} />
              </Box>
              <Box>
                <Text fw={600} size="md" c="dimmed">Bank Muscat</Text>
                <Text size="xs" c="dimmed">Pay from your Bank Muscat account</Text>
              </Box>
            </Group>
            <Badge color="gray" variant="light" size="sm">COMING SOON</Badge>
          </Group>
        </Paper>

        {/* Sohar International -- COMING SOON */}
        <Paper p="md" radius="md" withBorder style={{ opacity: 0.5, cursor: 'not-allowed' }}>
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <Box style={{ width: 40, height: 40, borderRadius: 8, background: '#e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconBuildingBank size={22} color="#868e96" stroke={1.5} />
              </Box>
              <Box>
                <Text fw={600} size="md" c="dimmed">Sohar International</Text>
                <Text size="xs" c="dimmed">Pay from your Sohar International account</Text>
              </Box>
            </Group>
            <Badge color="gray" variant="light" size="sm">COMING SOON</Badge>
          </Group>
        </Paper>

        {/* Pay with Card -- COMING SOON */}
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{ opacity: 0.5, cursor: 'not-allowed' }}
        >
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <Box
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: '#e9ecef',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconCreditCard size={22} color="#868e96" stroke={1.5} />
              </Box>
              <Box>
                <Text fw={600} size="md" c="dimmed">
                  Pay with Card
                </Text>
                <Text size="xs" c="dimmed">
                  Visa / Mastercard
                </Text>
              </Box>
            </Group>
            <Badge color="gray" variant="light" size="sm">
              COMING SOON
            </Badge>
          </Group>
        </Paper>

        {/* Pay with Apple Pay -- COMING SOON */}
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{ opacity: 0.5, cursor: 'not-allowed' }}
        >
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <Box
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: '#e9ecef',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconBrandApple size={22} color="#868e96" stroke={1.5} />
              </Box>
              <Box>
                <Text fw={600} size="md" c="dimmed">
                  Pay with Apple Pay
                </Text>
              </Box>
            </Group>
            <Badge color="gray" variant="light" size="sm">
              COMING SOON
            </Badge>
          </Group>
        </Paper>

        {/* Security badge */}
        <Group justify="center" gap="xs" mt="xs">
          <IconLock size={14} color="#868e96" />
          <Text size="xs" c="dimmed">
            Secured by Sadad Payment Gateway — Powered by Bank Dhofar Open Banking
          </Text>
        </Group>
      </Stack>
    </Paper>
  );
}
