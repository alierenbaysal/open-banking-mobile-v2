import {
  Container,
  Title,
  Text,
  SimpleGrid,
  Card,
  ThemeIcon,
  Badge,
  Group,
  Stack,
  TextInput,
  Box,
  Divider,
} from '@mantine/core';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconBuildingBank,
  IconCreditCard,
  IconRepeat,
  IconShieldCheck,
  IconBell,
  IconSearch,
  IconSparkles,
  IconCar,
} from '@tabler/icons-react';

export type ApiKind = 'obie' | 'open-finance';

export interface ApiGroup {
  id: string;
  name: string;
  description: string;
  icon: typeof IconBuildingBank;
  color: string;
  version: string;
  endpointCount: number;
  basePath: string;
  kind: ApiKind;
  commercialModel?: string;
}

export const API_GROUPS: ApiGroup[] = [
  {
    id: 'ais',
    name: 'Account Information Services',
    description: 'Access account details, balances, transactions, statements, beneficiaries, and other account-related information on behalf of the account holder.',
    icon: IconBuildingBank,
    color: 'blue',
    version: 'v4.0',
    endpointCount: 23,
    basePath: '/open-banking/v4.0/aisp',
    kind: 'obie',
  },
  {
    id: 'pis',
    name: 'Payment Initiation Services',
    description: 'Initiate domestic payments, international payments, and scheduled payments. Manage payment consents and track payment status.',
    icon: IconCreditCard,
    color: 'green',
    version: 'v4.0',
    endpointCount: 18,
    basePath: '/open-banking/v4.0/pisp',
    kind: 'obie',
  },
  {
    id: 'cof',
    name: 'Confirmation of Funds',
    description: 'Verify that sufficient funds are available in the payer account before completing a transaction. Used by Card Based Payment Instrument Issuers (CBPII).',
    icon: IconShieldCheck,
    color: 'orange',
    version: 'v4.0',
    endpointCount: 4,
    basePath: '/open-banking/v4.0/cbpii',
    kind: 'obie',
  },
  {
    id: 'vrp',
    name: 'Variable Recurring Payments',
    description: 'Create and manage recurring payment mandates with variable amounts. Supports sweeping, subscriptions, and other periodic payment use cases.',
    icon: IconRepeat,
    color: 'violet',
    version: 'v4.0',
    endpointCount: 6,
    basePath: '/open-banking/v4.0/vrp',
    kind: 'obie',
  },
  {
    id: 'events',
    name: 'Events & Notifications',
    description: 'Subscribe to and manage real-time event notifications for account changes, payment status updates, and consent lifecycle events.',
    icon: IconBell,
    color: 'red',
    version: 'v4.0',
    endpointCount: 7,
    basePath: '/open-banking/v4.0/events',
    kind: 'obie',
  },
  // ─────────────────────────────────────────────────────────────
  // 6th section — Open Finance, beyond OBIE v4.0
  // ─────────────────────────────────────────────────────────────
  {
    id: 'auto-lending',
    name: 'Auto Loan Origination',
    description: 'Embedded auto-lending APIs for registered auto-lending TPPs (car dealers, DMS vendors). Create loan applications, receive real-time decisions, sign contracts and receive disbursement webhooks — all at the showroom.',
    icon: IconCar,
    color: 'yellow',
    version: 'v1.0',
    endpointCount: 15,
    basePath: '/auto-lending/v1',
    kind: 'open-finance',
    commercialModel: 'Per-dealer SaaS tier + per-disbursement fee',
  },
];

export default function ApiCatalog() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filter = (g: ApiGroup) =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.id.toLowerCase().includes(search.toLowerCase()) ||
    g.description.toLowerCase().includes(search.toLowerCase());

  const obieGroups = API_GROUPS.filter((g) => g.kind === 'obie' && filter(g));
  const openFinanceGroups = API_GROUPS.filter((g) => g.kind === 'open-finance' && filter(g));

  return (
    <Container size="lg">
      <Stack gap="xl">
        <div>
          <Text size="sm" fw={600} c="bankGreen" tt="uppercase" mb={4}>
            Bank Dhofar API Platform
          </Text>
          <Title order={2}>API Catalog</Title>
          <Text c="dimmed" mt="xs" maw={700}>
            Explore Bank Dhofar's full API surface. <strong>Open Banking</strong> APIs are OBIE
            v4.0 compliant and governed by CBO Open Banking regulations. <strong>Open Finance</strong> APIs
            are Bank Dhofar proprietary products that extend beyond the CBO mandate — subject to
            commercial TPP agreements.
          </Text>
        </div>

        <TextInput
          placeholder="Search APIs..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          maw={400}
        />

        {/* ─────────────────────────────────────────────────────── */}
        {/* Open Banking (OBIE v4.0) — CBO-mandated                */}
        {/* ─────────────────────────────────────────────────────── */}
        {obieGroups.length > 0 && (
          <Stack gap="md">
            <Group justify="space-between" align="flex-end">
              <div>
                <Text size="xs" fw={700} c="bankGreen" tt="uppercase" mb={2}>
                  Section 1 · CBO-mandated
                </Text>
                <Title order={3}>Open Banking (OBIE v4.0)</Title>
                <Text size="sm" c="dimmed" mt={2}>
                  Free to use under Central Bank of Oman Open Banking framework.
                </Text>
              </div>
              <Badge size="lg" variant="light" color="bankGreen">5 API groups · {obieGroups.reduce((a, b) => a + b.endpointCount, 0)} endpoints</Badge>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              {obieGroups.map((group) => (
                <ApiGroupCard key={group.id} group={group} onClick={() => navigate(`/apis/${group.id}`)} />
              ))}
            </SimpleGrid>
          </Stack>
        )}

        <Divider variant="dashed" my="md" />

        {/* ─────────────────────────────────────────────────────── */}
        {/* Open Finance — Beyond OBIE                             */}
        {/* ─────────────────────────────────────────────────────── */}
        {openFinanceGroups.length > 0 && (
          <Stack gap="md">
            <Group justify="space-between" align="flex-end">
              <div>
                <Group gap="xs" mb={2}>
                  <Text size="xs" fw={700} c="yellow.8" tt="uppercase">
                    Section 2 · Beyond OBIE
                  </Text>
                  <IconSparkles size={14} color="var(--mantine-color-yellow-6)" />
                </Group>
                <Title order={3}>Open Finance (Bank Dhofar Proprietary)</Title>
                <Text size="sm" c="dimmed" mt={2}>
                  Embedded products built on top of the Open Banking rails. Commercial terms apply;
                  not CBO-mandated.
                </Text>
              </div>
              <Badge size="lg" variant="filled" color="yellow" leftSection={<IconSparkles size={12} />}>
                NEW · Auto Lending
              </Badge>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              {openFinanceGroups.map((group) => (
                <ApiGroupCard
                  key={group.id}
                  group={group}
                  onClick={() => navigate(`/apis/${group.id}`)}
                  highlight
                />
              ))}
            </SimpleGrid>
          </Stack>
        )}

        {obieGroups.length === 0 && openFinanceGroups.length === 0 && (
          <Card withBorder p="xl" ta="center">
            <Text c="dimmed">No APIs match your search.</Text>
          </Card>
        )}
      </Stack>
    </Container>
  );
}

function ApiGroupCard({ group, onClick, highlight }: { group: ApiGroup; onClick: () => void; highlight?: boolean }) {
  return (
    <Card
      withBorder
      padding="xl"
      radius="md"
      style={{
        cursor: 'pointer',
        transition: 'transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
        borderColor: highlight ? 'var(--mantine-color-yellow-5)' : undefined,
        borderWidth: highlight ? 2 : 1,
        background: highlight
          ? 'linear-gradient(135deg, var(--mantine-color-yellow-0) 0%, #ffffff 70%)'
          : undefined,
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = '';
      }}
    >
      <Group justify="space-between" mb="md">
        <ThemeIcon size={48} radius="md" color={group.color} variant="light">
          <group.icon size={26} />
        </ThemeIcon>
        <Group gap="xs">
          <Badge variant={highlight ? 'filled' : 'light'} color={highlight ? 'yellow' : 'gray'} size="sm">
            {group.version}
          </Badge>
          <Badge variant="light" color={group.color}>
            {group.endpointCount} endpoints
          </Badge>
        </Group>
      </Group>
      <Text fw={600} size="lg" mb="xs">{group.name}</Text>
      <Text size="sm" c="dimmed" lh={1.6}>{group.description}</Text>
      {highlight && group.commercialModel && (
        <Box mt="md" p="xs" style={{ background: 'var(--mantine-color-yellow-0)', borderRadius: 6 }}>
          <Text size="xs" fw={600} c="yellow.9">
            Commercial model: <Text span fw={400} c="dark">{group.commercialModel}</Text>
          </Text>
        </Box>
      )}
      <Text size="xs" c="dimmed" mt="md" ff="monospace">
        {group.basePath}
      </Text>
    </Card>
  );
}
