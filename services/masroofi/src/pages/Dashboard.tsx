import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Container,
  Grid,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
  Button,
  Skeleton,
  ThemeIcon,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import {
  IconCreditCard,
  IconArrowRight,
  IconTrendingUp,
  IconTrendingDown,
  IconWallet,
} from '@tabler/icons-react';
import { getAccounts, getAllBalances, getAllTransactions } from '@/utils/api';
import type { OBAccount, OBBalance, OBTransaction } from '@/utils/api';
import { isBankConnected } from '@/utils/consent';
import { buildSpendingSummary } from '@/utils/categories';
import AccountCard from '@/components/AccountCard';
import TransactionRow from '@/components/TransactionRow';
import BankConnectionCard from '@/components/BankConnectionCard';
import EmptyState from '@/components/EmptyState';
import SpendingChart from '@/components/SpendingChart';

function formatAmount(amount: number, currency: string = 'OMR'): string {
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${currency}`;
}

function computeTotalBalance(balances: OBBalance[]): { total: number; currency: string } {
  let total = 0;
  let currency = 'OMR';
  for (const b of balances) {
    const amt = parseFloat(b.Amount.Amount);
    if (b.CreditDebitIndicator === 'Debit') {
      total -= amt;
    } else {
      total += amt;
    }
    currency = b.Amount.Currency || currency;
  }
  return { total, currency };
}

function getRecentTransactions(transactions: OBTransaction[], limit: number = 5): OBTransaction[] {
  return [...transactions]
    .sort((a, b) => new Date(b.BookingDateTime).getTime() - new Date(a.BookingDateTime).getTime())
    .slice(0, limit);
}

function getThisMonthTransactions(transactions: OBTransaction[]): OBTransaction[] {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return transactions.filter((t) => new Date(t.BookingDateTime) >= startOfMonth);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const connected = isBankConnected();

  const { data: accounts, isLoading: loadingAccounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
    enabled: connected,
  });

  const { data: balances, isLoading: loadingBalances } = useQuery({
    queryKey: ['balances'],
    queryFn: getAllBalances,
    enabled: connected,
  });

  const { data: transactions, isLoading: loadingTx } = useQuery({
    queryKey: ['all-transactions'],
    queryFn: getAllTransactions,
    enabled: connected,
  });

  if (!connected) {
    return (
      <Container size="lg" py="xl">
        <Title order={2} mb="lg">Dashboard</Title>
        <EmptyState type="no-bank" />
      </Container>
    );
  }

  const { total: totalBalance, currency } = computeTotalBalance(balances || []);
  const recentTx = getRecentTransactions(transactions || []);
  const thisMonthTx = getThisMonthTransactions(transactions || []);
  const spendingSummary = buildSpendingSummary(thisMonthTx);
  const totalSpending = spendingSummary.reduce((s, v) => s + v.total, 0);
  const totalIncome = thisMonthTx
    .filter((t) => t.CreditDebitIndicator === 'Credit')
    .reduce((s, t) => s + parseFloat(t.Amount.Amount), 0);

  const loading = loadingAccounts || loadingBalances || loadingTx;

  // Build a balance lookup by account ID
  const balanceByAccount = new Map<string, OBBalance>();
  for (const b of balances || []) {
    if (!balanceByAccount.has(b.AccountId)) {
      balanceByAccount.set(b.AccountId, b);
    }
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={2}>Dashboard</Title>
            <Text size="sm" c="dimmed">لوحة المعلومات</Text>
          </Box>
        </Group>

        {/* Bank Connection Status */}
        <BankConnectionCard onDisconnect={() => window.location.reload()} />

        {/* Summary Cards */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
          <Paper shadow="sm" p="lg" radius="md" withBorder>
            <Group justify="space-between" mb="sm">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">Total Balance</Text>
              <ThemeIcon size={36} radius="md" variant="light" color="violet">
                <IconWallet size={20} />
              </ThemeIcon>
            </Group>
            {loading ? (
              <Skeleton height={32} />
            ) : (
              <Text size="xl" fw={700}>{formatAmount(totalBalance, currency)}</Text>
            )}
            <Text size="xs" c="dimmed" mt={4}>
              Across {accounts?.length || 0} accounts
            </Text>
          </Paper>

          <Paper shadow="sm" p="lg" radius="md" withBorder>
            <Group justify="space-between" mb="sm">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">This Month Income</Text>
              <ThemeIcon size={36} radius="md" variant="light" color="teal">
                <IconTrendingUp size={20} />
              </ThemeIcon>
            </Group>
            {loading ? (
              <Skeleton height={32} />
            ) : (
              <Text size="xl" fw={700} c="teal">
                +{formatAmount(totalIncome, currency)}
              </Text>
            )}
            <Text size="xs" c="dimmed" mt={4}>Credits this month</Text>
          </Paper>

          <Paper shadow="sm" p="lg" radius="md" withBorder>
            <Group justify="space-between" mb="sm">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">This Month Spending</Text>
              <ThemeIcon size={36} radius="md" variant="light" color="red">
                <IconTrendingDown size={20} />
              </ThemeIcon>
            </Group>
            {loading ? (
              <Skeleton height={32} />
            ) : (
              <Text size="xl" fw={700} c="red">
                -{formatAmount(totalSpending, currency)}
              </Text>
            )}
            <Text size="xs" c="dimmed" mt={4}>Debits this month</Text>
          </Paper>
        </SimpleGrid>

        {/* Accounts */}
        <Box>
          <Group justify="space-between" mb="md">
            <Box>
              <Text fw={600} size="lg">Your Accounts</Text>
              <Text size="xs" c="dimmed">حساباتك</Text>
            </Box>
            <Button
              variant="subtle"
              color="violet"
              rightSection={<IconArrowRight size={14} />}
              onClick={() => navigate('/accounts')}
            >
              View All
            </Button>
          </Group>
          {loading ? (
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {[1, 2].map((i) => (
                <Skeleton key={i} height={130} radius="md" />
              ))}
            </SimpleGrid>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {(accounts || []).map((account) => (
                <AccountCard
                  key={account.AccountId}
                  account={account}
                  balance={balanceByAccount.get(account.AccountId)}
                  onClick={() => navigate(`/accounts/${account.AccountId}/transactions`)}
                />
              ))}
            </SimpleGrid>
          )}
        </Box>

        <Grid gutter="xl">
          {/* Recent Transactions */}
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Card shadow="sm" radius="md" withBorder p={0}>
              <Group justify="space-between" p="md" pb="sm">
                <Box>
                  <Text fw={600}>Recent Transactions</Text>
                  <Text size="xs" c="dimmed">آخر المعاملات</Text>
                </Box>
                <Button
                  variant="subtle"
                  color="violet"
                  size="xs"
                  rightSection={<IconArrowRight size={14} />}
                  onClick={() => navigate('/transactions')}
                >
                  View All
                </Button>
              </Group>
              {loading ? (
                <Stack gap={0} px="md" pb="md">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} height={56} mb={4} />
                  ))}
                </Stack>
              ) : recentTx.length === 0 ? (
                <Box px="md" pb="xl" pt="md">
                  <Text c="dimmed" ta="center" size="sm">No transactions found</Text>
                </Box>
              ) : (
                <Stack gap={0}>
                  {recentTx.map((tx) => (
                    <TransactionRow key={tx.TransactionId} transaction={tx} />
                  ))}
                </Stack>
              )}
            </Card>
          </Grid.Col>

          {/* Spending Summary */}
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Card shadow="sm" radius="md" withBorder>
              <Group justify="space-between" mb="md">
                <Box>
                  <Text fw={600}>Spending This Month</Text>
                  <Text size="xs" c="dimmed">مصاريف هذا الشهر</Text>
                </Box>
                <Button
                  variant="subtle"
                  color="violet"
                  size="xs"
                  rightSection={<IconArrowRight size={14} />}
                  onClick={() => navigate('/spending')}
                >
                  Details
                </Button>
              </Group>
              {loading ? (
                <Stack gap="sm">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} height={40} />
                  ))}
                </Stack>
              ) : (
                <SpendingChart data={spendingSummary.slice(0, 5)} currency={currency} />
              )}
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
