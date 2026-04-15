/**
 * LoanOffer — customer sees the decision + signs with an OTP.
 *
 * URL: /loan/offer/:applicationId
 *
 * Polls /api/loan/internal/v1/loan-applications/{id}/customer-view every 1.5s.
 * When approved → shows offer + PIN-pad for signing.
 * On sign → POST /internal/v1/loan-applications/{id}/sign, which runs
 * disbursement synchronously. Then flips to the success state.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Stack, Card, Text, Title, Group, Button, Center, Loader, Alert, Box, Divider,
  PinInput, ThemeIcon,
} from '@mantine/core';
import {
  IconCheck, IconShieldCheck, IconCurrencyRiyal, IconClock, IconX, IconArrowRight,
  IconCircleDashed, IconSparkles,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getUser, type User } from '@/utils/auth';

interface CustomerView {
  application_id: string;
  status: string;
  customer_id: string | null;
  vehicle: { make: string; model: string; year: number };
  requested_amount: { amount: string; currency: string };
  down_payment: { amount: string; currency: string };
  requested_tenor_months: number;
  decision: {
    decision: 'approved' | 'declined' | 'conditional';
    approved_amount?: { amount: string; currency: string } | null;
    interest_rate?: number | null;
    tenor_months?: number | null;
    monthly_installment?: { amount: string; currency: string } | null;
    total_repayable?: { amount: string; currency: string } | null;
    decline_reasons?: string[] | null;
    decided_at?: string;
    valid_until?: string;
  } | null;
  environment: 'sandbox' | 'production';
}

const INTERNAL_HEADER = { 'X-Internal-Token': 'bd-internal-loan-svc-token-CHANGE-ME' } as const;

function customerIdFromUser(u: User | null): string {
  const maybeCid = (u as unknown as { customer_id?: unknown } | null)?.customer_id;
  if (typeof maybeCid === 'string' && maybeCid) return maybeCid;
  const e = u?.email ?? '';
  if (e.includes('emrah')) return 'CUST-001';
  if (e.startsWith('fatima')) return 'CUST-002';
  if (e.startsWith('ahmed')) return 'CUST-003';
  if (e.startsWith('sara')) return 'CUST-004';
  return 'CUST-001';
}

export default function LoanOffer() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [app, setApp] = useState<CustomerView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    getUser().then((u) => { if (u) setUser(u); else navigate('/login'); });
  }, [navigate]);

  useEffect(() => {
    if (!applicationId) return;
    let cancelled = false;
    const fetchApp = async () => {
      try {
        const r = await fetch(
          `/api/loan/internal/v1/loan-applications/${applicationId}/customer-view`,
          { headers: INTERNAL_HEADER },
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as CustomerView;
        if (!cancelled) setApp(data);
      } catch (e) {
        if (!cancelled && !app) setError((e as Error).message);
      }
    };
    fetchApp();
    const timer = setInterval(fetchApp, 1500);
    return () => { cancelled = true; clearInterval(timer); };

  }, [applicationId]);

  const handleSign = async () => {
    if (!app || !applicationId || otp.length !== 6) return;
    setSigning(true);
    try {
      const r = await fetch(
        `/api/loan/internal/v1/loan-applications/${applicationId}/sign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...INTERNAL_HEADER },
          body: JSON.stringify({
            customer_id: customerIdFromUser(user),
            signature_otp: otp,
            signature_proof: {
              method: 'otp_biometric',
              device: navigator.userAgent.slice(0, 100),
              signed_at: new Date().toISOString(),
            },
          }),
        },
      );
      if (!r.ok) {
        const body = await r.text();
        throw new Error(body.slice(0, 240));
      }
      notifications.show({
        title: 'Contract signed',
        message: 'Funds are on their way to the dealer.',
        color: 'green', icon: <IconCheck size={16} />,
      });
    } catch (e) {
      notifications.show({
        title: 'Signature failed',
        message: (e as Error).message,
        color: 'red', icon: <IconX size={16} />,
      });
      setSigning(false);
    }
  };

  if (error && !app) return <Center h={500}><Alert color="red">{error}</Alert></Center>;
  if (!app) {
    return (
      <Center h={500}>
        <Stack align="center" gap="md"><Loader color="green" size="lg" /><Text c="dimmed">Loading your offer…</Text></Stack>
      </Center>
    );
  }

  const decision = app.decision;
  const status = app.status;

  if (status === 'pending_decision' || !decision) {
    return (
      <Center h={500}>
        <Card withBorder radius="lg" padding="xl" maw={480}>
          <Stack align="center" gap="md">
            <ThemeIcon size={64} radius={32} color="green" variant="light"><IconCircleDashed size={32} /></ThemeIcon>
            <Title order={3} ta="center">Running your check…</Title>
            <Text c="dimmed" ta="center" size="sm">
              Bank Dhofar is pulling your income history and calculating affordability.
              Usually under a second.
            </Text>
            <Loader color="green" />
          </Stack>
        </Card>
      </Center>
    );
  }

  if (decision.decision === 'declined') {
    return (
      <Center h={500}>
        <Card withBorder radius="lg" padding="xl" maw={520}>
          <Stack align="center" gap="md">
            <ThemeIcon size={64} radius={32} color="red" variant="light"><IconX size={32} /></ThemeIcon>
            <Title order={3} ta="center">We couldn't approve this loan</Title>
            <Text c="dimmed" ta="center" size="sm">
              {decision.decline_reasons?.length
                ? `Reasons: ${decision.decline_reasons.join(', ').replace(/_/g, ' ')}.`
                : 'Please contact the branch for a manual review.'}
            </Text>
            <Button color="green" variant="light" onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
          </Stack>
        </Card>
      </Center>
    );
  }

  if (status === 'disbursed') {
    return (
      <Stack gap="lg" maw={560} mx="auto">
        <Card radius="lg" padding="xl" style={{ background: 'linear-gradient(135deg, #4D9134, #3f7a2b)' }}>
          <Stack align="center" gap="md">
            <ThemeIcon size={72} radius={36} variant="filled" color="white">
              <IconSparkles size={36} color="#4D9134" />
            </ThemeIcon>
            <Title order={2} c="white" ta="center">You're driving home</Title>
            <Text c="rgba(255,255,255,0.9)" ta="center">
              We've paid the dealer. Your standing order is set up for monthly repayments.
            </Text>
          </Stack>
        </Card>
        <Card withBorder radius="md" padding="md">
          <Stack gap="sm">
            <Group justify="space-between"><Text size="sm" c="dimmed">Loan amount</Text><Text fw={700}>OMR {decision.approved_amount?.amount}</Text></Group>
            <Group justify="space-between"><Text size="sm" c="dimmed">Monthly</Text><Text fw={700} c="#4D9134">OMR {decision.monthly_installment?.amount}</Text></Group>
            <Group justify="space-between"><Text size="sm" c="dimmed">Rate</Text><Text fw={500}>{decision.interest_rate}% APR</Text></Group>
            <Group justify="space-between"><Text size="sm" c="dimmed">Tenor</Text><Text fw={500}>{decision.tenor_months} months</Text></Group>
          </Stack>
        </Card>
        <Button color="green" size="lg" onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
      </Stack>
    );
  }

  // APPROVED — offer + OTP sign
  return (
    <Stack gap="lg" maw={640} mx="auto">
      <Card radius="lg" padding="lg" style={{ background: 'linear-gradient(135deg, #4D9134, #3f7a2b)' }}>
        <Stack align="center" gap="sm">
          <IconShieldCheck size={36} color="white" />
          <Title order={3} c="white" ta="center">Pre-approved</Title>
          <Text size="sm" c="rgba(255,255,255,0.8)">
            Valid for 10 minutes · Offer ends in {applicationId?.slice(-4)}
          </Text>
        </Stack>
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Group justify="space-between" align="flex-end">
            <Box>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Monthly instalment</Text>
              <Text fw={800} size="40" c="#4D9134">
                <IconCurrencyRiyal size={26} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {decision.monthly_installment?.amount}
              </Text>
            </Box>
            <Box ta="right">
              <Text size="xs" c="dimmed">For {decision.tenor_months} months</Text>
              <Text size="xs" c="dimmed">@ {decision.interest_rate}% APR</Text>
            </Box>
          </Group>
          <Divider />
          <Group justify="space-between"><Text size="sm" c="dimmed">Loan principal</Text><Text fw={600}>OMR {decision.approved_amount?.amount}</Text></Group>
          <Group justify="space-between"><Text size="sm" c="dimmed">Total you'll repay</Text><Text fw={600}>OMR {decision.total_repayable?.amount}</Text></Group>
          {decision.valid_until && (
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Offer expires</Text>
              <Text fw={500}>
                <IconClock size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {new Date(decision.valid_until).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </Group>
          )}
        </Stack>
      </Card>

      <Card withBorder radius="md" padding="lg">
        <Stack gap="md">
          <Group gap="xs"><IconShieldCheck size={18} color="var(--mantine-color-green-6)" /><Text fw={600}>Sign the contract</Text></Group>
          <Alert color="blue" variant="light">
            <Text size="sm">
              Enter any 6-digit code in sandbox (production will use Theqa digital signature).
            </Text>
          </Alert>
          <Group justify="center"><PinInput length={6} value={otp} onChange={setOtp} type="number" size="lg" /></Group>
          <Button
            size="lg" color="green" radius="md"
            leftSection={<IconCheck size={20} />} rightSection={<IconArrowRight size={16} />}
            onClick={handleSign} loading={signing}
            disabled={otp.length !== 6}
            style={{ backgroundColor: '#4D9134' }}
          >
            Sign & disburse
          </Button>
          <Text size="xs" c="dimmed" ta="center">
            By signing, you authorise Bank Dhofar to disburse OMR {decision.approved_amount?.amount} to the
            dealer and set up a monthly standing order from your salary account.
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
}
