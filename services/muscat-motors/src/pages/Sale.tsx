import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Stack,
  Text,
  Group,
  Badge,
  Button,
  Title,
  Box,
  Stepper,
  Slider,
  NumberInput,
  Divider,
  Grid,
  ThemeIcon,
  CopyButton,
  ActionIcon,
  Loader,
  Alert,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconCircleCheck,
  IconCircleDashed,
  IconQrcode,
  IconRefresh,
  IconBuildingBank,
  IconSignature,
  IconCash,
  IconArrowLeft,
  IconCopy,
  IconCheck,
  IconX,
  IconAlertCircle,
} from '@tabler/icons-react';
import { QRCodeSVG } from 'qrcode.react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getCarById, estimateMonthly } from '@/utils/inventory';
import { createApplication, getApplication, fmtMoney, toMoney, cancelApplication } from '@/utils/api';
import { getCurrentSalesperson } from '@/utils/auth';
import { statusMeta, statusStepIndex } from '@/utils/status';
import type { Application, Car } from '@/utils/types';

export default function Sale() {
  const navigate = useNavigate();
  const { applicationId: routeAppId } = useParams();
  const [searchParams] = useSearchParams();
  const carId = searchParams.get('car');

  // If route has applicationId, we're resuming an existing sale
  const [activeAppId, setActiveAppId] = useState<string | null>(routeAppId ?? null);

  // Load app if we have an ID
  const appQuery = useQuery({
    queryKey: ['application', activeAppId],
    queryFn: () => getApplication(activeAppId!),
    enabled: !!activeAppId,
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      // Stop polling in terminal states
      if (!s) return 1500;
      if (['disbursed', 'declined', 'expired', 'cancelled'].includes(s)) return false;
      return 1500;
    },
  });

  const app = appQuery.data;

  // Pre-configuration state (only used before app is created)
  const car: Car | undefined = useMemo(() => {
    if (app) {
      return {
        id: 'from-app',
        make: app.vehicle.make,
        model: app.vehicle.model,
        year: app.vehicle.year,
        condition: app.vehicle.condition,
        segment: '—',
        priceOmr: Number(app.vehicle.price.amount),
        stock: 1,
        emoji: '🚗',
        accent: '#ffc107',
      };
    }
    return carId ? getCarById(carId) : undefined;
  }, [app, carId]);

  const [downPct, setDownPct] = useState(30);
  const [tenor, setTenor] = useState(60);

  const monthlyEstimate = useMemo(() => {
    if (!car) return 0;
    return estimateMonthly(car.priceOmr, downPct, tenor);
  }, [car, downPct, tenor]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!car) throw new Error('No car selected');
      const sp = getCurrentSalesperson();
      const price = car.priceOmr;
      const down = Math.round(price * (downPct / 100));
      const requested = price - down;
      const body = {
        dealer_reference: `MM-${Date.now()}`,
        branch_code: sp?.branch ?? 'MM-HQ',
        salesperson_email: sp?.email ?? 'sales@muscatmotors.om',
        vehicle: {
          make: car.make,
          model: car.model,
          year: car.year,
          condition: car.condition,
          price: toMoney(price),
        },
        requested_amount: toMoney(requested),
        down_payment: toMoney(down),
        requested_tenor_months: tenor,
      };
      return createApplication(body);
    },
    onSuccess: (created) => {
      setActiveAppId(created.application_id);
      notifications.show({
        color: 'yellow',
        title: 'Application created',
        message: 'Ask the customer to scan the QR with their BD Online app.',
      });
    },
    onError: (err: Error) => {
      notifications.show({
        color: 'red',
        title: 'Failed to create application',
        message: err.message,
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!activeAppId) return;
      return cancelApplication(activeAppId, 'Cancelled by salesperson');
    },
    onSuccess: () => {
      notifications.show({ color: 'gray', title: 'Cancelled', message: 'Application cancelled.' });
      navigate('/inventory');
    },
  });

  // If no car and no app, bounce back
  useEffect(() => {
    if (!car && !activeAppId) {
      navigate('/inventory', { replace: true });
    }
  }, [car, activeAppId, navigate]);

  if (!car) {
    return (
      <Container size="md" py="xl">
        <Loader color="yellow" />
      </Container>
    );
  }

  const activeStep = app ? statusStepIndex(app.status) : 0;

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <Group justify="space-between">
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/inventory')}
            styles={{ root: { color: '#a1a1aa' } }}
          >
            Back to inventory
          </Button>
          {app && (
            <Group gap="xs">
              <Badge color={statusMeta(app.status).color} variant="light" size="lg">
                {statusMeta(app.status).label}
              </Badge>
              <Text size="xs" c="#71717a">
                ID: {app.application_id.slice(0, 8)}…
              </Text>
            </Group>
          )}
        </Group>

        <Paper
          radius="lg"
          p="xl"
          style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid #27272a' }}
        >
          <Stepper
            active={activeStep}
            color="yellow"
            styles={{
              stepLabel: { color: '#fafafa', fontWeight: 600 },
              stepDescription: { color: '#a1a1aa' },
            }}
          >
            <Stepper.Step label="Configure" description="Loan structure" icon={<IconQrcode size={18} />} />
            <Stepper.Step label="Customer" description="Scan QR" icon={<IconQrcode size={18} />} />
            <Stepper.Step
              label="Decision"
              description="Bank approval"
              icon={<IconBuildingBank size={18} />}
            />
            <Stepper.Step label="Sign" description="Contract" icon={<IconSignature size={18} />} />
            <Stepper.Step label="Disbursed" description="Money sent" icon={<IconCash size={18} />} />
          </Stepper>
        </Paper>

        {!app && <ConfigurePanel
          car={car}
          downPct={downPct}
          setDownPct={setDownPct}
          tenor={tenor}
          setTenor={setTenor}
          monthlyEstimate={monthlyEstimate}
          onCreate={() => createMutation.mutate()}
          submitting={createMutation.isPending}
        />}

        {app && (
          <Grid gutter="lg">
            <Grid.Col span={{ base: 12, md: 5 }}>
              <QRPanel app={app} car={car} />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 7 }}>
              <StatusPanel app={app} onCancel={() => cancelMutation.mutate()} cancelling={cancelMutation.isPending} />
            </Grid.Col>
          </Grid>
        )}
      </Stack>
    </Container>
  );
}

// ─── Configure panel ─────────────────────────────────────────────────────

function ConfigurePanel(props: {
  car: Car;
  downPct: number;
  setDownPct: (v: number) => void;
  tenor: number;
  setTenor: (v: number) => void;
  monthlyEstimate: number;
  onCreate: () => void;
  submitting: boolean;
}) {
  const { car, downPct, setDownPct, tenor, setTenor, monthlyEstimate, onCreate, submitting } = props;

  const price = car.priceOmr;
  const downOmr = Math.round(price * (downPct / 100));
  const loanAmt = price - downOmr;

  return (
    <Grid gutter="lg">
      <Grid.Col span={{ base: 12, md: 5 }}>
        <Paper
          p="xl"
          radius="lg"
          style={{
            background: `radial-gradient(circle at 50% 20%,${car.accent}55, transparent 60%), linear-gradient(180deg,#18181b,#0f0f11)`,
            border: '1px solid #27272a',
            textAlign: 'center',
          }}
        >
          <Text fz={96} lh={1}>
            {car.emoji}
          </Text>
          <Title order={3} c="#fafafa" mt="sm">
            {car.make} {car.model}
          </Title>
          <Text c="#a1a1aa" size="sm">
            {car.year} · {car.segment}
          </Text>
          <Group justify="center" mt="md" gap={6} align="baseline">
            <Text fw={800} size="28px" className="gold-gradient-text">
              {price.toLocaleString()}
            </Text>
            <Text c="#a1a1aa" fw={600}>
              OMR
            </Text>
          </Group>
          <Badge mt="sm" color={car.condition === 'new' ? 'teal' : 'grape'}>
            {car.condition.toUpperCase()}
          </Badge>
        </Paper>
      </Grid.Col>

      <Grid.Col span={{ base: 12, md: 7 }}>
        <Paper p="xl" radius="lg" style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid #27272a' }}>
          <Stack gap="lg">
            <Box>
              <Title order={4} c="#fafafa">
                Structure the loan
              </Title>
              <Text size="sm" c="#a1a1aa">
                Adjust down payment and tenor. Final terms are decided by Bank Dhofar.
              </Text>
            </Box>

            <Box>
              <Group justify="space-between" mb={6}>
                <Text size="sm" c="#d4d4d8" fw={600}>
                  Down payment
                </Text>
                <Text size="sm" c="#ffc107" fw={700}>
                  {downPct}% · {downOmr.toLocaleString()} OMR
                </Text>
              </Group>
              <Slider
                color="yellow"
                min={20}
                max={50}
                step={5}
                value={downPct}
                onChange={setDownPct}
                marks={[
                  { value: 20, label: '20%' },
                  { value: 30, label: '30%' },
                  { value: 40, label: '40%' },
                  { value: 50, label: '50%' },
                ]}
                styles={{ markLabel: { color: '#71717a' } }}
              />
            </Box>

            <NumberInput
              label="Tenor (months)"
              description="12–84 months"
              min={12}
              max={84}
              step={12}
              value={tenor}
              onChange={(v) => setTenor(Number(v) || 12)}
              styles={{
                label: { color: '#d4d4d8', fontWeight: 600 },
                description: { color: '#71717a' },
                input: { background: '#18181b', color: '#fafafa', borderColor: '#3f3f46' },
              }}
            />

            <Divider color="#27272a" />

            <Grid gutter="md">
              <Grid.Col span={6}>
                <StatBlock label="Loan amount" value={`${loanAmt.toLocaleString()} OMR`} gold />
              </Grid.Col>
              <Grid.Col span={6}>
                <StatBlock
                  label="Est. monthly"
                  value={`${monthlyEstimate.toLocaleString(undefined, { maximumFractionDigits: 0 })} OMR`}
                />
              </Grid.Col>
            </Grid>

            <Button
              fullWidth
              size="lg"
              variant="gradient"
              gradient={{ from: '#ffc107', to: '#c9961d', deg: 90 }}
              leftSection={<IconQrcode size={20} />}
              onClick={onCreate}
              loading={submitting}
              styles={{ root: { color: '#18181b', fontWeight: 700 } }}
            >
              Generate QR for customer
            </Button>
          </Stack>
        </Paper>
      </Grid.Col>
    </Grid>
  );
}

function StatBlock({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <Paper p="md" radius="md" style={{ background: '#18181b', border: '1px solid #27272a' }}>
      <Text size="xs" c="#71717a" tt="uppercase" fw={700} mb={4}>
        {label}
      </Text>
      <Text size="xl" fw={800} className={gold ? 'gold-gradient-text' : undefined} c={gold ? undefined : '#fafafa'}>
        {value}
      </Text>
    </Paper>
  );
}

// ─── QR panel ────────────────────────────────────────────────────────────

function QRPanel({ app, car }: { app: Application; car: Car }) {
  const isPending = app.status === 'pending_consent';

  return (
    <Paper p="xl" radius="lg" style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid #27272a' }}>
      <Stack align="center" gap="md">
        <Group justify="space-between" w="100%">
          <Text fw={700} c="#fafafa">
            Customer QR code
          </Text>
          {isPending && (
            <Group gap={6}>
              <span className="live-dot pulse-gold" />
              <Text size="xs" c="#ffc107" fw={600}>
                LIVE
              </Text>
            </Group>
          )}
        </Group>

        <Box
          p="lg"
          style={{
            background: 'white',
            borderRadius: 16,
            boxShadow: '0 12px 40px -12px rgba(255,193,7,0.4)',
          }}
        >
          <QRCodeSVG value={app.qr.payload} size={240} level="M" includeMargin={false} />
        </Box>

        <Text size="sm" c="#a1a1aa" ta="center">
          Customer opens BD Online app → Scan → Approve consent
        </Text>

        <CopyButton value={app.qr.payload}>
          {({ copied, copy }) => (
            <Group gap="xs">
              <Text size="xs" c="#71717a" style={{ wordBreak: 'break-all', maxWidth: 260 }} ta="center">
                {app.qr.payload}
              </Text>
              <ActionIcon variant="subtle" color={copied ? 'green' : 'gray'} onClick={copy}>
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              </ActionIcon>
            </Group>
          )}
        </CopyButton>

        <Divider color="#27272a" w="100%" my="xs" />

        <Group gap="xs" justify="space-between" w="100%">
          <Box>
            <Text size="xs" c="#71717a" fw={700} tt="uppercase">
              Vehicle
            </Text>
            <Text size="sm" c="#fafafa" fw={600}>
              {car.make} {car.model} · {car.year}
            </Text>
          </Box>
          <Box ta="right">
            <Text size="xs" c="#71717a" fw={700} tt="uppercase">
              Price
            </Text>
            <Text size="sm" c="#ffc107" fw={700}>
              {fmtMoney(app.vehicle.price)}
            </Text>
          </Box>
        </Group>
      </Stack>
    </Paper>
  );
}

// ─── Status panel ────────────────────────────────────────────────────────

function StatusPanel({
  app,
  onCancel,
  cancelling,
}: {
  app: Application;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const meta = statusMeta(app.status);
  const decision = app.decision;
  const terminal = ['disbursed', 'declined', 'expired', 'cancelled'].includes(app.status);

  return (
    <Paper p="xl" radius="lg" style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid #27272a' }}>
      <Stack gap="lg">
        <Group justify="space-between">
          <Box>
            <Text fw={700} c="#fafafa" size="lg">
              Live status
            </Text>
            <Text size="sm" c="#a1a1aa">
              Poll every 1.5s
            </Text>
          </Box>
          <Badge color={meta.color} variant="light" size="lg" leftSection={!terminal ? <span className="live-dot pulse-gold" /> : undefined}>
            {meta.label}
          </Badge>
        </Group>

        <Stack gap="xs">
          <StatusRow
            done={['pending_decision', 'decided', 'contracted', 'disbursed'].includes(app.status)}
            active={app.status === 'pending_consent'}
            label="Customer scans & gives consent"
            hint="BD Online app: open camera, scan QR, tap Approve"
          />
          <StatusRow
            done={['decided', 'contracted', 'disbursed'].includes(app.status)}
            active={app.status === 'pending_decision'}
            label="Bank credit decision"
            hint="Scoring engine runs DBR, credit bureau, and policy checks"
          />
          <StatusRow
            done={['contracted', 'disbursed'].includes(app.status)}
            active={app.status === 'decided'}
            label="Customer signs contract"
            hint="Theqa / OTP + biometric"
          />
          <StatusRow done={app.status === 'disbursed'} active={app.status === 'contracted'} label="Disbursement" hint="Transfer from Bank Dhofar to dealer account" />
        </Stack>

        {decision && (
          <Paper
            p="md"
            radius="md"
            style={{
              background: decision.decision === 'approved' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              border: decision.decision === 'approved' ? '1px solid #10b981' : '1px solid #ef4444',
            }}
          >
            <Group justify="space-between" mb="xs">
              <Group gap="xs">
                <ThemeIcon variant="light" color={decision.decision === 'approved' ? 'teal' : 'red'} size="lg" radius="xl">
                  {decision.decision === 'approved' ? <IconCircleCheck size={18} /> : <IconX size={18} />}
                </ThemeIcon>
                <Text fw={700} c="#fafafa">
                  {decision.decision === 'approved' ? 'Approved' : 'Declined'}
                </Text>
              </Group>
              <Text size="xs" c="#71717a">
                Valid until {new Date(decision.valid_until).toLocaleDateString()}
              </Text>
            </Group>

            {decision.decision === 'approved' ? (
              <Grid gutter="sm" mt="sm">
                <Grid.Col span={6}>
                  <StatBlock label="Approved amount" value={fmtMoney(decision.approved_amount)} gold />
                </Grid.Col>
                <Grid.Col span={6}>
                  <StatBlock label="Interest rate" value={`${decision.interest_rate ?? '—'}%`} />
                </Grid.Col>
                <Grid.Col span={6}>
                  <StatBlock label="Monthly" value={fmtMoney(decision.monthly_installment)} />
                </Grid.Col>
                <Grid.Col span={6}>
                  <StatBlock label="Tenor" value={`${decision.tenor_months ?? '—'} mo`} />
                </Grid.Col>
                <Grid.Col span={12}>
                  <StatBlock label="Total repayable" value={fmtMoney(decision.total_repayable)} />
                </Grid.Col>
              </Grid>
            ) : (
              <Stack gap="xs" mt="xs">
                {(decision.decline_reasons ?? []).map((r, i) => (
                  <Text key={i} size="sm" c="#fca5a5">
                    • {r}
                  </Text>
                ))}
              </Stack>
            )}
          </Paper>
        )}

        {app.status === 'disbursed' && (
          <Alert
            icon={<IconCheck size={20} />}
            color="green"
            variant="light"
            title="Disbursed — customer can drive away!"
            styles={{ root: { background: 'rgba(16,185,129,0.1)', borderColor: '#10b981' } }}
          >
            The loan has been transferred to Muscat Motors' dealer account. Standing order is set up for monthly repayments.
          </Alert>
        )}

        {app.status === 'declined' && (
          <Alert
            icon={<IconAlertCircle size={20} />}
            color="red"
            variant="light"
            title="Application declined"
          >
            The customer can reapply later or try with a different down payment / tenor.
          </Alert>
        )}

        <Group justify="space-between">
          <Button
            variant="subtle"
            color="gray"
            leftSection={<IconRefresh size={16} />}
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
          {!terminal && (
            <Button variant="outline" color="red" onClick={onCancel} loading={cancelling}>
              Cancel application
            </Button>
          )}
        </Group>
      </Stack>
    </Paper>
  );
}

function StatusRow({ done, active, label, hint }: { done: boolean; active: boolean; label: string; hint: string }) {
  const color = done ? 'teal' : active ? 'yellow' : 'gray';
  return (
    <Group align="flex-start" gap="sm" p="sm" style={{ borderRadius: 10, background: active ? 'rgba(255,193,7,0.08)' : 'transparent' }}>
      <ThemeIcon variant="light" color={color} size="lg" radius="xl">
        {done ? <IconCircleCheck size={18} /> : <IconCircleDashed size={18} />}
      </ThemeIcon>
      <Box flex={1}>
        <Text fw={600} c={active ? '#ffc107' : done ? '#fafafa' : '#a1a1aa'}>
          {label}
        </Text>
        <Text size="xs" c="#71717a">
          {hint}
        </Text>
      </Box>
      {active && (
        <Group gap={4}>
          <Loader size="xs" color="yellow" />
        </Group>
      )}
    </Group>
  );
}
