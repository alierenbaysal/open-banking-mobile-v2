import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Text,
  Stack,
  Button,
  Box,
  Loader,
  Alert,
  Paper,
  Group,
  Divider,
  ThemeIcon,
} from '@mantine/core';
import { IconArrowLeft, IconAlertCircle, IconCircleCheck } from '@tabler/icons-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import CartDrawer from '@/components/CartDrawer';
import { useCart } from '@/App';
import { formatOMR } from '@/utils/products';
import {
  MERCHANT,
  validateState,
  getStoredConsentId,
  getStoredOrderRef,
  clearPaymentContext,
} from '@/utils/payment';
import dayjs from 'dayjs';

type PaymentStatus = 'processing' | 'success' | 'error';

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { total, clear } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const [status, setStatus] = useState<PaymentStatus>('processing');
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [orderRef, setOrderRef] = useState('');
  const [consentId, setConsentId] = useState('');

  useEffect(() => {
    const processCallback = async () => {
      try {
        const callbackConsentId = searchParams.get('consent_id');
        const state = searchParams.get('state');
        const errorParam = searchParams.get('error');

        // Check if user rejected the consent
        if (errorParam) {
          setErrorMessage(
            errorParam === 'access_denied'
              ? 'You cancelled the payment. No money was charged.'
              : `Payment failed: ${errorParam}`
          );
          setStatus('error');
          return;
        }

        // Validate state parameter for CSRF protection
        if (state && !validateState(state)) {
          setErrorMessage('Invalid state parameter. Payment may have been tampered with.');
          setStatus('error');
          return;
        }

        // Retrieve stored payment context
        const storedConsentId = callbackConsentId || getStoredConsentId() || '';
        const storedOrderRef = getStoredOrderRef() || '';

        if (!storedConsentId) {
          setErrorMessage('No payment consent found. Please try again from checkout.');
          setStatus('error');
          return;
        }

        setConsentId(storedConsentId);
        setOrderRef(storedOrderRef);
        setPaymentAmount(total);

        // 1. Fetch consent details to find the customer's source account
        const consentResp = await fetch(`/api/consent/${storedConsentId}`);
        if (!consentResp.ok) {
          throw new Error('Failed to retrieve consent details');
        }
        const consent = await consentResp.json();
        const sourceAccount = consent.selected_accounts?.[0];

        if (!sourceAccount) {
          throw new Error('No bank account was selected during consent approval');
        }

        // 2. Execute the actual transfer: debit customer, credit merchant
        const transferResp = await fetch('/api/banking/transfers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_account_id: sourceAccount,
            target_account_id: MERCHANT.accountId,
            amount: parseFloat(total.toFixed(3)),
            currency: 'OMR',
            customer_id: consent.customer_id,
            reference: storedOrderRef,
            description: `Payment to Salalah Souq - ${storedOrderRef}`,
          }),
        });

        if (!transferResp.ok) {
          const errBody = await transferResp.json().catch(() => null);
          throw new Error(errBody?.detail || 'Payment transfer failed');
        }

        // Payment confirmed -- clear cart and payment context
        clear();
        clearPaymentContext();
        setStatus('success');
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'An unexpected error occurred.'
        );
        setStatus('error');
      }
    };

    processCallback();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <Header onCartOpen={() => setCartOpen(true)} />
      <CartDrawer opened={cartOpen} onClose={() => setCartOpen(false)} />

      <Container size="sm" py={60}>
        {status === 'processing' && (
          <Stack align="center" gap="lg" py={60}>
            <Loader size="xl" color="orange" />
            <Title order={2}>Processing Payment...</Title>
            <Text c="dimmed" size="lg" dir="rtl">
              {'\u062C\u0627\u0631\u064A \u0645\u0639\u0627\u0644\u062C\u0629 \u0627\u0644\u062F\u0641\u0639...'}
            </Text>
            <Text c="dimmed" size="sm">
              Please do not close this window.
            </Text>
          </Stack>
        )}

        {status === 'success' && (
          <Stack gap="xl">
            {/* Receipt */}
            <Paper
              shadow="md"
              radius="lg"
              p="xl"
              withBorder
              maw={480}
              mx="auto"
              style={{
                borderTop: '4px solid #00b894',
                background: 'white',
              }}
            >
              <Stack align="center" gap="md" mb="lg">
                <ThemeIcon size={64} radius="xl" color="teal" variant="light">
                  <IconCircleCheck size={40} stroke={1.5} />
                </ThemeIcon>
                <Text size="xl" fw={700} c="teal.7">
                  Payment Successful
                </Text>
                <Text size="sm" c="dimmed" dir="rtl">
                  {'\u062A\u0645\u062A \u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u062F\u0641\u0639 \u0628\u0646\u062C\u0627\u062D'}
                </Text>
              </Stack>

              <Box
                py="lg"
                px="md"
                mb="md"
                style={{
                  background: 'linear-gradient(135deg, #fff4e6, #ffe8cc)',
                  borderRadius: 12,
                  textAlign: 'center',
                }}
              >
                <Text size="xs" c="dimmed" tt="uppercase" fw={500} mb={4}>
                  Amount Paid
                </Text>
                <Text
                  size="2rem"
                  fw={700}
                  c="dark"
                  style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}
                >
                  {formatOMR(paymentAmount)}
                </Text>
              </Box>

              <Stack gap="sm">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Merchant</Text>
                  <Text size="sm" fw={500}>{MERCHANT.name}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">IBAN</Text>
                  <Text size="sm" fw={500} style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {MERCHANT.iban}
                  </Text>
                </Group>
                <Divider />
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Reference</Text>
                  <Text size="sm" fw={600} style={{ color: '#D35400', fontFamily: 'monospace' }}>
                    {orderRef}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Consent ID</Text>
                  <Text size="sm" style={{ fontFamily: 'monospace', fontSize: 11 }}>
                    {consentId.length > 16 ? `${consentId.slice(0, 8)}...${consentId.slice(-8)}` : consentId}
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Date</Text>
                  <Text size="sm" fw={500}>{dayjs().format('DD MMM YYYY, HH:mm')}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Status</Text>
                  <Text size="sm" fw={600} c="teal.7">Completed</Text>
                </Group>
              </Stack>

              <Divider my="md" />
              <Text size="xs" c="dimmed" ta="center">
                Powered by Sadad Payment Gateway — Bank Dhofar Open Banking
              </Text>
            </Paper>

            <Button
              variant="light"
              color="orange"
              size="lg"
              fullWidth
              maw={480}
              mx="auto"
              leftSection={<IconArrowLeft size={18} />}
              onClick={() => navigate('/')}
            >
              Back to Store
            </Button>
          </Stack>
        )}

        {status === 'error' && (
          <Stack align="center" gap="lg" py={40}>
            <Paper shadow="sm" radius="lg" p="xl" withBorder maw={480} w="100%">
              <Stack align="center" gap="md">
                <Alert
                  icon={<IconAlertCircle size={20} />}
                  title="Payment Failed"
                  color="red"
                  w="100%"
                >
                  {errorMessage}
                </Alert>
                <Text size="sm" c="dimmed" ta="center">
                  Your bank account has not been charged.
                  You can try again or return to the store.
                </Text>
                <Button
                  variant="filled"
                  color="orange"
                  onClick={() => navigate('/checkout')}
                  fullWidth
                >
                  Try Again
                </Button>
                <Button
                  variant="subtle"
                  color="gray"
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={() => navigate('/')}
                  fullWidth
                >
                  Back to Store
                </Button>
              </Stack>
            </Paper>
          </Stack>
        )}
      </Container>
    </Box>
  );
}
