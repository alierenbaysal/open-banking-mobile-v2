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
} from '@tabler/icons-react';
import AccountCard from '@/components/AccountCard';
import { getUser, getDisplayName, getEmail, type User } from '@/utils/auth';
import {
  getCustomerAccounts,
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
      const customerId = resolveCustomerId(email || u.profile.sub);
      const accts = getCustomerAccounts(customerId);
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
  const arabicGreeting = '\u0645\u0631\u062D\u0628\u0627';

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
              Total Balance / \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0631\u0635\u064A\u062F
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
                Accounts / \u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A
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
                Active Consents / \u0645\u0648\u0627\u0641\u0642\u0627\u062A \u0646\u0634\u0637\u0629
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
                Pending Approvals / \u0628\u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629
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
              {'\u062D\u0633\u0627\u0628\u0627\u062A\u0643'}
            </Text>
          </Box>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {accounts.map((account) => (
            <AccountCard key={account.accountId} account={account} />
          ))}
        </SimpleGrid>
      </Box>

      {/* Quick actions */}
      <Card withBorder radius="md" padding="md">
        <Group justify="space-between">
          <Box>
            <Text fw={600}>Open Banking Consents</Text>
            <Text size="sm" c="dimmed">
              Manage third-party access to your accounts /
              {' \u0625\u062F\u0627\u0631\u0629 \u0648\u0635\u0648\u0644 \u0627\u0644\u0623\u0637\u0631\u0627\u0641 \u0627\u0644\u062E\u0627\u0631\u062C\u064A\u0629 \u0625\u0644\u0649 \u062D\u0633\u0627\u0628\u0627\u062A\u0643'}
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
