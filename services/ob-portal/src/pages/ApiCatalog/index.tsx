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
} from '@tabler/icons-react';

export interface ApiGroup {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  icon: typeof IconBuildingBank;
  color: string;
  version: string;
  endpointCount: number;
  basePath: string;
}

export const API_GROUPS: ApiGroup[] = [
  {
    id: 'ais',
    name: 'Account Information Services',
    nameAr: 'خدمات معلومات الحساب',
    description: 'Access account details, balances, transactions, statements, beneficiaries, and other account-related information on behalf of the account holder.',
    icon: IconBuildingBank,
    color: 'blue',
    version: 'v4.0',
    endpointCount: 23,
    basePath: '/open-banking/v4.0/aisp',
  },
  {
    id: 'pis',
    name: 'Payment Initiation Services',
    nameAr: 'خدمات بدء الدفع',
    description: 'Initiate domestic payments, international payments, and scheduled payments. Manage payment consents and track payment status.',
    icon: IconCreditCard,
    color: 'green',
    version: 'v4.0',
    endpointCount: 18,
    basePath: '/open-banking/v4.0/pisp',
  },
  {
    id: 'cof',
    name: 'Confirmation of Funds',
    nameAr: 'تأكيد الأموال',
    description: 'Verify that sufficient funds are available in the payer account before completing a transaction. Used by Card Based Payment Instrument Issuers (CBPII).',
    icon: IconShieldCheck,
    color: 'orange',
    version: 'v4.0',
    endpointCount: 4,
    basePath: '/open-banking/v4.0/cbpii',
  },
  {
    id: 'vrp',
    name: 'Variable Recurring Payments',
    nameAr: 'المدفوعات المتكررة المتغيرة',
    description: 'Create and manage recurring payment mandates with variable amounts. Supports sweeping, subscriptions, and other periodic payment use cases.',
    icon: IconRepeat,
    color: 'violet',
    version: 'v4.0',
    endpointCount: 6,
    basePath: '/open-banking/v4.0/vrp',
  },
  {
    id: 'events',
    name: 'Events & Notifications',
    nameAr: 'الأحداث والإشعارات',
    description: 'Subscribe to and manage real-time event notifications for account changes, payment status updates, and consent lifecycle events.',
    icon: IconBell,
    color: 'red',
    version: 'v4.0',
    endpointCount: 7,
    basePath: '/open-banking/v4.0/events',
  },
];

export default function ApiCatalog() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = API_GROUPS.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.id.toLowerCase().includes(search.toLowerCase()) ||
      g.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Container size="lg">
      <Stack gap="lg">
        <div>
          <Text size="sm" fw={600} c="bankGreen" tt="uppercase" mb={4}>
            Open Banking
          </Text>
          <Title order={2}>API Catalog</Title>
          <Text c="dimmed" mt="xs" maw={600}>
            Explore Bank Dhofar's Open Banking APIs. All endpoints are OBIE v4.0 compliant
            and available in the sandbox environment.
          </Text>
        </div>

        <TextInput
          placeholder="Search APIs..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          maw={400}
        />

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          {filtered.map((group) => (
            <Card
              key={group.id}
              withBorder
              padding="xl"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/apis/${group.id}`)}
            >
              <Group justify="space-between" mb="md">
                <ThemeIcon size={48} radius="md" color={group.color} variant="light">
                  <group.icon size={26} />
                </ThemeIcon>
                <Group gap="xs">
                  <Badge variant="light" color="gray" size="sm">
                    {group.version}
                  </Badge>
                  <Badge variant="light" color={group.color}>
                    {group.endpointCount} endpoints
                  </Badge>
                </Group>
              </Group>
              <Text fw={600} size="lg" mb={2}>{group.name}</Text>
              <Text size="sm" c="dimmed" dir="rtl" mb="sm" style={{ fontFamily: 'serif' }}>
                {group.nameAr}
              </Text>
              <Text size="sm" c="dimmed" lh={1.6}>{group.description}</Text>
              <Text size="xs" c="dimmed" mt="md" ff="monospace">
                {group.basePath}
              </Text>
            </Card>
          ))}
        </SimpleGrid>

        {filtered.length === 0 && (
          <Card withBorder p="xl" ta="center">
            <Text c="dimmed">No APIs match your search.</Text>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
