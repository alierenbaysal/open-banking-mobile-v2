/**
 * Dashboard — customer home page.
 * Shows welcome message, account summary, active consents count, quick links.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Title,
  Text,
  SimpleGrid,
  Card,
  Group,
  Stack,
  Box,
  Badge,
  Button,
  ThemeIcon,
  Loader,
  Center,
} from '@mantine/core';
import {
  IconShieldCheck,
  IconArrowRight,
  IconBuildingBank,
  IconClock,
  IconArrowsExchange,
} from '@tabler/icons-react';
import AccountCard from '@/components/AccountCard';
import { getUser, getDisplayName, getEmail, type User } from '@/utils/auth';
import {
  fetchCustomerAccounts,
  resolveCustomerId,
  formatBalance,
  type BankAccount,
} from '@/utils/accounts';
import { listConsents, type Consent } from '@/utils/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const u = await getUser();
      if (!u) {
        navigate('/login');
        return;
      }
      setUser(u);

      const email = getEmail(u);
      const customerId = u.customer_id || resolveCustomerId(email || String(u.profile.sub || u.sub));
      const accts = await fetchCustomerAccounts(customerId);
      setAccounts(accts);

      // Try to load consents (may fail if API not available)
      try {
        const data = await listConsents(customerId);
        setConsents(data);
      } catch {
        // Consent list endpoint may not be implemented
      }

      setLoading(false);
    }
    load();
  }, [navigate]);

  if (loading) {
    return (
      <Center h={400}>
        <Loader color="green" size="lg" />
      </Center>
    );
  }

  const displayName = user ? getDisplayName(user) : 'Customer';
  const firstName = displayName.split(' ')[0];

  // Arabic greeting based on first name
  const arabicGreeting = 'مرحبا';

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const activeConsents = consents.filter((c) => c.status === 'Authorised').length;
  const pendingConsents = consents.filter((c) => c.status === 'AwaitingAuthorisation').length;

  return (
    <Stack gap="lg">
      {/* Welcome banner */}
      <Card
        radius="lg"
        padding="lg"
        style={{
          background: 'linear-gradient(135deg, #4D9134 0%, #3f7a2b 100%)',
          color: 'white',
        }}
      >
        <Group justify="space-between" align="flex-start">
          <Box>
            <Text size="sm" c="rgba(255,255,255,0.8)">
              {arabicGreeting} / Welcome back
            </Text>
            <Title order={2} c="white" mt={4}>
              {firstName}
            </Title>
            <Text size="sm" c="rgba(255,255,255,0.7)" mt={8}>
              Here is your account overview for today.
            </Text>
          </Box>
          <Box ta="right">
            <Text size="xs" c="rgba(255,255,255,0.6)">
              Total Balance / إجمالي الرصيد
            </Text>
            <Text size="xl" fw={700} c="white" mt={4}>
              {formatBalance(totalBalance)}
            </Text>
          </Box>
        </Group>
      </Card>

      {/* Stats cards */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Card withBorder radius="md" padding="md">
          <Group gap="sm">
            <ThemeIcon size="lg" color="green" variant="light" radius="md">
              <IconBuildingBank size={20} />
            </ThemeIcon>
            <Box>
              <Text size="xs" c="dimmed">
                Accounts / الحسابات
              </Text>
              <Text size="xl" fw={700}>
                {accounts.length}
              </Text>
            </Box>
          </Group>
        </Card>

        <Card withBorder radius="md" padding="md">
          <Group gap="sm">
            <ThemeIcon size="lg" color="blue" variant="light" radius="md">
              <IconShieldCheck size={20} />
            </ThemeIcon>
            <Box>
              <Text size="xs" c="dimmed">
                Active Consents / موافقات نشطة
              </Text>
              <Text size="xl" fw={700}>
                {activeConsents}
              </Text>
            </Box>
          </Group>
        </Card>

        <Card withBorder radius="md" padding="md">
          <Group gap="sm">
            <ThemeIcon size="lg" color="yellow" variant="light" radius="md">
              <IconClock size={20} />
            </ThemeIcon>
            <Box>
              <Text size="xs" c="dimmed">
                Pending Approvals / بانتظار الموافقة
              </Text>
              <Group gap="xs" align="baseline">
                <Text size="xl" fw={700}>
                  {pendingConsents}
                </Text>
                {pendingConsents > 0 && (
                  <Badge color="yellow" variant="filled" size="sm">
                    Action needed
                  </Badge>
                )}
              </Group>
            </Box>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Accounts section */}
      <Box>
        <Group justify="space-between" mb="md">
          <Box>
            <Title order={4}>Your Accounts</Title>
            <Text size="sm" c="dimmed">
              {'حساباتك'}
            </Text>
          </Box>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {accounts.map((account) => (
            <AccountCard key={account.accountId} account={account} />
          ))}
        </SimpleGrid>
      </Box>

      {/* Quick transfer */}
      <Card withBorder radius="md" padding="md">
        <Group justify="space-between">
          <Group gap="sm">
            <ThemeIcon size="lg" color="green" variant="light" radius="md">
              <IconArrowsExchange size={20} />
            </ThemeIcon>
            <Box>
              <Text fw={600}>Quick Transfer / تحويل سريع</Text>
              <Text size="sm" c="dimmed">
                Transfer between your accounts or to another beneficiary
              </Text>
            </Box>
          </Group>
          <Button
            variant="filled"
            color="green"
            rightSection={<IconArrowRight size={16} />}
            onClick={() => navigate('/transfer')}
            style={{ backgroundColor: '#4D9134' }}
          >
            Transfer Now
          </Button>
        </Group>
      </Card>

      {/* Quick actions */}
      <Card withBorder radius="md" padding="md">
        <Group justify="space-between">
          <Box>
            <Text fw={600}>Open Banking Consents</Text>
            <Text size="sm" c="dimmed">
              Manage third-party access to your accounts /
              {' إدارة وصول الأطراف الخارجية إلى حساباتك'}
            </Text>
          </Box>
          <Button
            variant="light"
            color="green"
            rightSection={<IconArrowRight size={16} />}
            onClick={() => navigate('/consents')}
          >
            View All Consents
          </Button>
        </Group>
      </Card>
    </Stack>
  );
}
