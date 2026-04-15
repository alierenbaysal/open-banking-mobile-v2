/**
 * LoanScan — landing page when a customer scans a QR from a dealer's screen.
 *
 * URL: /loan/scan?a=<application_id>&d=<dealer_id>
 *
 * Flow:
 *   1. Extract application_id + dealer_id from URL.
 *   2. Require auth (redirect to login preserving params).
 *   3. Fetch scan-info from ob-loan-service (via nginx proxy).
 *   4. Show a consent screen with dealer + vehicle + requested amount.
 *   5. On approve → POST /internal/v1/loan-applications/{id}/customer-consent
 *      → redirects to /loan/offer/<id> with the computed decision.
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Stack, Card, Text, Title, Group, Button, Center, Loader, Alert, Box, Badge,
  Divider, ThemeIcon,
} from '@mantine/core';
import {
  IconShieldCheck, IconAlertTriangle, IconCar, IconCurrencyRiyal,
  IconLock, IconArrowRight, IconX,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getUser, type User } from '@/utils/auth';

interface ScanInfo {
  application_id: string;
  status: string;
  expired: boolean;
  dealer: { id: string; name: string };
  vehicle: { make: string; model: string; year: number; price: string };
  request: { amount: string; down_payment: string; tenor_months: number };
  environment: 'sandbox' | 'production';
}

export default function LoanScan() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const applicationId = searchParams.get('a');
  const [user, setUser] = useState<User | null>(null);
  const [info, setInfo] = useState<ScanInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const u = await getUser();
      if (!u) {
        const p = new URLSearchParams();
        if (applicationId) p.set('a', applicationId);
        navigate(`/login?loan_scan=${encodeURIComponent(`/loan/scan?${p}`)}`);
        return;
      }
      setUser(u);

      if (!applicationId) {
        setError('No application ID in the QR. Ask the dealer to generate a new one.');
        return;
      }

      try {
        const r = await fetch(`/api/loan/internal/v1/loan-applications/${applicationId}/scan-info`, {
          headers: { 'X-Internal-Token': 'bd-internal-loan-svc-token-CHANGE-ME' },
        });
        if (!r.ok) {
          const body = await r.text();
          setError(`Could not load application: ${r.status} ${body.slice(0, 120)}`);
          return;
        }
        const data = (await r.json()) as ScanInfo;
        setInfo(data);
      } catch (e) {
        setError((e as Error).message);
      }
    }
    load();
  }, [applicationId, navigate]);

  const handleApprove = async () => {
    if (!user || !info) return;
    setSubmitting(true);
    try {
      const maybeCid = (user as unknown as { customer_id?: unknown }).customer_id;
      const customerId =
        (typeof maybeCid === 'string' && maybeCid) ||
        (user.email?.includes('emrah') ? 'CUST-001'
        : user.email?.startsWith('fatima') ? 'CUST-002'
        : user.email?.startsWith('ahmed') ? 'CUST-003'
        : user.email?.startsWith('sara') ? 'CUST-004'
        : user.email || 'CUST-001');

      // Create a thin "loan-consent" record for audit consistency with OBIE.
      const fakeConsentId = crypto.randomUUID();

      const r = await fetch(
        `/api/loan/internal/v1/loan-applications/${info.application_id}/customer-consent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Token': 'bd-internal-loan-svc-token-CHANGE-ME',
          },
          body: JSON.stringify({ customer_id: customerId, consent_id: fakeConsentId }),
        },
      );
      if (!r.ok) {
        const body = await r.text();
        throw new Error(`Decision failed: HTTP ${r.status} ${body.slice(0, 200)}`);
      }
      // Decision engine ran synchronously server-side. Jump to offer page.
      navigate(`/loan/offer/${info.application_id}`);
    } catch (e) {
      notifications.show({
        title: 'Something went wrong',
        message: (e as Error).message,
        color: 'red',
        icon: <IconX size={16} />,
      });
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <Center h={500}>
        <Card withBorder radius="lg" padding="xl" maw={500}>
          <Stack align="center" gap="md">
            <IconAlertTriangle size={48} color="var(--mantine-color-orange-6)" />
            <Title order={3} ta="center">Unable to Process</Title>
            <Text c="dimmed" ta="center" size="sm">{error}</Text>
            <Button variant="light" color="green" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </Stack>
        </Card>
      </Center>
    );
  }

  if (!info) {
    return (
      <Center h={500}>
        <Stack align="center" gap="md">
          <Loader color="green" size="lg" />
          <Text c="dimmed">Loading loan request…</Text>
        </Stack>
      </Center>
    );
  }

  if (info.expired) {
    return (
      <Center h={500}>
        <Card withBorder radius="lg" padding="xl" maw={500}>
          <Stack align="center" gap="md">
            <IconAlertTriangle size={48} color="var(--mantine-color-orange-6)" />
            <Title order={3} ta="center">QR expired</Title>
            <Text c="dimmed" ta="center" size="sm">
              This showroom QR has expired. Please ask the dealer to generate a new one.
            </Text>
          </Stack>
        </Card>
      </Center>
    );
  }

  const price = Number(info.vehicle.price).toFixed(3);
  const requested = Number(info.request.amount).toFixed(3);
  const downPayment = Number(info.request.down_payment).toFixed(3);

  return (
    <Stack gap="lg" maw={640} mx="auto">
      <Card
        radius="lg" padding="lg"
        style={{ background: 'linear-gradient(135deg, #4D9134 0%, #3f7a2b 100%)' }}
      >
        <Stack align="center" gap="sm">
          <IconShieldCheck size={36} color="white" />
          <Title order={3} c="white" ta="center">Auto Loan Request</Title>
          <Text size="xs" c="rgba(255,255,255,0.8)">
            {info.environment === 'sandbox' ? 'SANDBOX · no real money moves' : 'Production'}
          </Text>
        </Stack>
      </Card>

      {/* Dealer */}
      <Card withBorder radius="md" padding="md">
        <Group gap="md" wrap="nowrap">
          <ThemeIcon size={56} radius={12} color="yellow" variant="light">
            <IconCar size={28} />
          </ThemeIcon>
          <Box>
            <Text size="lg" fw={600}>{info.dealer.name}</Text>
            <Text size="sm" c="dimmed">
              is requesting a pre-approval for an auto loan.
            </Text>
            <Badge variant="light" color="yellow" size="sm" mt={4}>
              Dealer ID: {info.dealer.id}
            </Badge>
          </Box>
        </Group>
      </Card>

      {/* Vehicle + request */}
      <Card withBorder radius="md" padding="md">
        <Stack gap="sm">
          <Group justify="space-between">
            <Text fw={600}>Vehicle</Text>
            <Text fw={500}>{info.vehicle.year} {info.vehicle.make} {info.vehicle.model}</Text>
          </Group>
          <Divider />
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Sticker price</Text>
            <Text fw={600}><IconCurrencyRiyal size={14} style={{ marginRight: 2 }} /> OMR {price}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Down payment</Text>
            <Text fw={500}>OMR {downPayment}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Loan amount</Text>
            <Text fw={700} c="#4D9134" size="lg">OMR {requested}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Tenor</Text>
            <Text fw={500}>{info.request.tenor_months} months</Text>
          </Group>
        </Stack>
      </Card>

      {/* Data sharing consent */}
      <Card withBorder radius="md" padding="md">
        <Stack gap="sm">
          <Group gap="xs">
            <IconLock size={18} color="var(--mantine-color-green-6)" />
            <Text fw={600}>What Bank Dhofar will check</Text>
          </Group>
          <Text size="sm" c="dimmed">
            To decide on your loan, Bank Dhofar will look at:
          </Text>
          <Stack gap={6}>
            <Group gap="xs"><IconShieldCheck size={14} color="#4D9134" /><Text size="sm">Your income over the last 3 months</Text></Group>
            <Group gap="xs"><IconShieldCheck size={14} color="#4D9134" /><Text size="sm">Your existing loan obligations</Text></Group>
            <Group gap="xs"><IconShieldCheck size={14} color="#4D9134" /><Text size="sm">Your Mala'a credit score</Text></Group>
          </Stack>
          <Alert color="blue" variant="light" mt="xs">
            <Text size="xs">
              Your details stay at the bank. The dealer only sees whether you were approved
              and, if so, the monthly instalment — never your income or debts.
            </Text>
          </Alert>
        </Stack>
      </Card>

      {/* Actions */}
      <Card withBorder radius="lg" padding="lg">
        <Stack gap="md">
          <Group grow>
            <Button
              size="lg" color="green" radius="md"
              leftSection={<IconShieldCheck size={20} />}
              rightSection={<IconArrowRight size={16} />}
              onClick={handleApprove} loading={submitting}
              style={{ backgroundColor: '#4D9134' }}
            >
              Approve & see offer
            </Button>
            <Button
              size="lg" variant="outline" color="red" radius="md"
              leftSection={<IconX size={20} />}
              disabled={submitting}
              onClick={() => navigate('/dashboard')}
            >
              Decline
            </Button>
          </Group>
          <Text size="xs" c="dimmed" ta="center">
            You can decline or revoke this consent at any time.
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
}
