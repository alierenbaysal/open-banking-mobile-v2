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
  IconArrowRight,
  IconTrendingUp,
  IconTrendingDown,
  IconWallet,
  IconArrowUpRight,
  IconArrowDownRight,
} from '@tabler/icons-react';
import { getAccounts, getAllBalances, getAllTransactions } from '@/utils/api';
import type { OBBalance, OBTransaction } from '@/utils/api';
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

function getMonthTransactions(transactions: OBTransaction[], monthsBack: number): OBTransaction[] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 0, 23, 59, 59);
  return transactions.filter((t) => {
    const d = new Date(t.BookingDateTime);
    return d >= start && d <= end;
  });
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

  const thisMonthTx = getMonthTransactions(transactions || [], 0);
  const lastMonthTx = getMonthTransactions(transactions || [], 1);

  const spendingSummary = buildSpendingSummary(thisMonthTx);
  const totalSpending = spendingSummary.reduce((s, v) => s + v.total, 0);
  const totalIncome = thisMonthTx
    .filter((t) => t.CreditDebitIndicator === 'Credit')
    .reduce((s, t) => s + parseFloat(t.Amount.Amount), 0);

  const lastMonthSpending = buildSpendingSummary(lastMonthTx).reduce((s, v) => s + v.total, 0);
  const monthChange = lastMonthSpending > 0
    ? ((totalSpending - lastMonthSpending) / lastMonthSpending) * 100
    : 0;

  const netDifference = totalIncome - totalSpending;

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
            <Text size="sm" c="dimmed">{'\u0644\u0648\u062D\u0629 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A'}</Text>
          </Box>
        </Group>

        {/* Bank Connection Status */}
        <BankConnectionCard onDisconnect={() => window.location.reload()} />

        {/* ── Hero Balance Card ── */}
        <Paper
          shadow="md"
          p="xl"
          radius="lg"
          style={{
            background: 'linear-gradient(135deg, #6C5CE7 0%, #a29bfe 50%, #6C5CE7 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative circles */}
          <Box style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <Box style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

          <Stack gap="xs" style={{ position: 'relative', zIndex: 1 }}>
            <Group gap="xs" align="center">
              <IconWallet size={20} color="rgba(255,255,255,0.8)" />
              <Text size="sm" c="rgba(255,255,255,0.8)" fw={500}>Total Balance / \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0631\u0635\u064A\u062F</Text>
            </Group>
            {loading ? (
              <Skeleton height={48} width="60%" style={{ opacity: 0.3 }} />
            ) : (
              <Text size="2.4rem" fw={800} c="white" style={{ letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                {formatAmount(totalBalance, currency)}
              </Text>
            )}
            <Group gap="lg" mt="xs">
              <Text size="sm" c="rgba(255,255,255,0.7)">
                {accounts?.length || 0} account{(accounts?.length || 0) !== 1 ? 's' : ''}
              </Text>
              {!loading && monthChange !== 0 && (
                <Group gap={4}>
                  {monthChange > 0 ? (
                    <IconArrowUpRight size={16} color="#ff7675" />
                  ) : (
                    <IconArrowDownRight size={16} color="#55efc4" />
                  )}
                  <Text size="sm" c={monthChange > 0 ? '#ff7675' : '#55efc4'} fw={600}>
                    {Math.abs(monthChange).toFixed(1)}% spending vs last month
                  </Text>
                </Group>
              )}
            </Group>
          </Stack>
        </Paper>

        {/* ── Income vs Spending ── */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
          <Paper
            shadow="sm"
            p="lg"
            radius="md"
            withBorder
            style={{ borderLeft: '4px solid #00b894' }}
          >
            <Group justify="space-between" mb="sm">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">Income This Month</Text>
              <ThemeIcon size={36} radius="md" variant="light" color="teal">
                <IconTrendingUp size={20} />
              </ThemeIcon>
            </Group>
            {loading ? (
              <Skeleton height={32} />
            ) : (
              <Text size="xl" fw={700} c="teal" style={{ fontVariantNumeric: 'tabular-nums' }}>
                +{formatAmount(totalIncome, currency)}
              </Text>
            )}
            <Text size="xs" c="dimmed" mt={4}>\u0627\u0644\u062F\u062E\u0644 \u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631</Text>
          </Paper>

          <Paper
            shadow="sm"
            p="lg"
            radius="md"
            withBorder
            style={{ borderLeft: '4px solid #e17055' }}
          >
            <Group justify="space-between" mb="sm">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">Spending This Month</Text>
              <ThemeIcon size={36} radius="md" variant="light" color="red">
                <IconTrendingDown size={20} />
              </ThemeIcon>
            </Group>
            {loading ? (
              <Skeleton height={32} />
            ) : (
              <Text size="xl" fw={700} c="red" style={{ fontVariantNumeric: 'tabular-nums' }}>
                -{formatAmount(totalSpending, currency)}
              </Text>
            )}
            <Text size="xs" c="dimmed" mt={4}>\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A \u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631</Text>
          </Paper>

          <Paper
            shadow="sm"
            p="lg"
            radius="md"
            withBorder
            style={{ borderLeft: `4px solid ${netDifference >= 0 ? '#00b894' : '#e17055'}` }}
          >
            <Group justify="space-between" mb="sm">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">Net Difference</Text>
              <ThemeIcon
                size={36}
                radius="md"
                variant="light"
                color={netDifference >= 0 ? 'teal' : 'red'}
              >
                {netDifference >= 0 ? <IconTrendingUp size={20} /> : <IconTrendingDown size={20} />}
              </ThemeIcon>
            </Group>
            {loading ? (
              <Skeleton height={32} />
            ) : (
              <Text
                size="xl"
                fw={700}
                c={netDifference >= 0 ? 'teal' : 'red'}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {netDifference >= 0 ? '+' : ''}{formatAmount(netDifference, currency)}
              </Text>
            )}
            <Text size="xs" c="dimmed" mt={4}>
              {netDifference >= 0 ? '\u0641\u0627\u0626\u0636 \u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631' : '\u0639\u062C\u0632 \u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631'}
            </Text>
          </Paper>
        </SimpleGrid>

        {/* ── Account Cards ── */}
        <Box>
          <Group justify="space-between" mb="md">
            <Box>
              <Text fw={600} size="lg">Your Accounts</Text>
              <Text size="xs" c="dimmed">\u062D\u0633\u0627\u0628\u0627\u062A\u0643</Text>
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
          {/* ── Recent Transactions ── */}
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Card shadow="sm" radius="md" withBorder p={0}>
              <Group justify="space-between" p="md" pb="sm">
                <Box>
                  <Text fw={600}>Recent Transactions</Text>
                  <Text size="xs" c="dimmed">\u0622\u062E\u0631 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A</Text>
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

          {/* ── Spending Mini Chart ── */}
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Card shadow="sm" radius="md" withBorder>
              <Group justify="space-between" mb="md">
                <Box>
                  <Text fw={600}>Spending This Month</Text>
                  <Text size="xs" c="dimmed">\u0645\u0635\u0627\u0631\u064A\u0641 \u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631</Text>
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
                <SpendingChart data={spendingSummary.slice(0, 5)} currency={currency} compact />
              )}
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
