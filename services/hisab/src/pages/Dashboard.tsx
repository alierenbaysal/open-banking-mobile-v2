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
  Progress,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import {
  IconArrowRight,
  IconTrendingUp,
  IconTrendingDown,
  IconCash,
  IconReceipt,
  IconArrowUpRight,
  IconArrowDownRight,
  IconUsers,
  IconBuildingBank,
} from '@tabler/icons-react';
import { getAccounts, getAllBalances, getAllTransactions } from '@/utils/api';
import type { OBTransaction } from '@/utils/api';
import { isBankConnected } from '@/utils/consent';
import {
  formatOMR,
  getThisMonthTransactions,
  getLastMonthTransactions,
  getTodayTransactions,
  sumCredits,
  sumDebits,
  countTransactions,
  averageTransactionValue,
  getDailyRevenue,
  getTopCustomers,
  percentageChange,
} from '@/utils/analytics';
import StatCard from '@/components/StatCard';
import RevenueChart from '@/components/RevenueChart';
import TransactionRow from '@/components/TransactionRow';

function EmptyState() {
  const navigate = useNavigate();
  return (
    <Box py={60}>
      <Stack align="center" gap="lg">
        <ThemeIcon size={80} radius="xl" color="teal" variant="light">
          <IconBuildingBank size={40} />
        </ThemeIcon>
        <Stack gap={4} align="center">
          <Text fw={700} size="xl" ta="center">Connect Your Bank to Get Started</Text>
          <Text size="sm" c="dimmed" ta="center">{'\u0627\u0631\u0628\u0637 \u062D\u0633\u0627\u0628\u0643 \u0627\u0644\u0628\u0646\u0643\u064A \u0644\u0644\u0628\u062F\u0621'}</Text>
        </Stack>
        <Text size="sm" c="dimmed" ta="center" maw={500}>
          Link your Bank Dhofar business account to see revenue analytics, cash flow,
          and customer insights.
        </Text>
        <Button color="teal" size="md" onClick={() => navigate('/connect')}>
          Connect Bank Dhofar
        </Button>
      </Stack>
    </Box>
  );
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
        <EmptyState />
      </Container>
    );
  }

  const allTx = transactions || [];
  const thisMonthTx = getThisMonthTransactions(allTx);
  const lastMonthTx = getLastMonthTransactions(allTx);
  const todayTx = getTodayTransactions(allTx);

  const thisMonthRevenue = sumCredits(thisMonthTx);
  const lastMonthRevenue = sumCredits(lastMonthTx);
  const revenueChange = percentageChange(thisMonthRevenue, lastMonthRevenue);

  const todayRevenue = sumCredits(todayTx);
  const totalTxCount = countTransactions(thisMonthTx);
  const avgTxValue = averageTransactionValue(thisMonthTx);

  const dailyRevenue = getDailyRevenue(allTx, 7);
  const topCustomers = getTopCustomers(allTx, 5);

  const thisMonthIncome = sumCredits(thisMonthTx);
  const thisMonthExpenses = sumDebits(thisMonthTx);
  const cashFlowTotal = thisMonthIncome + thisMonthExpenses;
  const incomePct = cashFlowTotal > 0 ? (thisMonthIncome / cashFlowTotal) * 100 : 50;

  const recentTx = [...allTx]
    .sort((a, b) => new Date(b.BookingDateTime).getTime() - new Date(a.BookingDateTime).getTime())
    .slice(0, 10);

  const loading = loadingAccounts || loadingBalances || loadingTx;

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={2}>Dashboard</Title>
            <Text size="sm" c="dimmed">{'\u0644\u0648\u062D\u0629 \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062A'}</Text>
          </Box>
        </Group>

        {/* Revenue Hero Card */}
        <Paper
          shadow="md"
          p="xl"
          radius="lg"
          style={{
            background: 'linear-gradient(135deg, #00B894 0%, #00CEC9 50%, #00B894 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative circles */}
          <Box style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <Box style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

          <Stack gap="xs" style={{ position: 'relative', zIndex: 1 }}>
            <Group gap="xs" align="center">
              <IconCash size={20} color="rgba(255,255,255,0.8)" />
              <Text size="sm" c="rgba(255,255,255,0.8)" fw={500}>
                Revenue This Month / {'\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631'}
              </Text>
            </Group>
            {loading ? (
              <Skeleton height={48} width="60%" style={{ opacity: 0.3 }} />
            ) : (
              <Text size="2.4rem" fw={800} c="white" style={{ letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                {formatOMR(thisMonthRevenue)}
              </Text>
            )}
            <Group gap="lg" mt="xs">
              <Text size="sm" c="rgba(255,255,255,0.7)">
                {accounts?.length || 0} account{(accounts?.length || 0) !== 1 ? 's' : ''}
              </Text>
              {!loading && revenueChange !== 0 && (
                <Group gap={4}>
                  {revenueChange > 0 ? (
                    <IconArrowUpRight size={16} color="#55efc4" />
                  ) : (
                    <IconArrowDownRight size={16} color="#ff7675" />
                  )}
                  <Text size="sm" c={revenueChange > 0 ? '#55efc4' : '#ff7675'} fw={600}>
                    {Math.abs(revenueChange).toFixed(1)}% vs last month
                  </Text>
                </Group>
              )}
            </Group>
          </Stack>
        </Paper>

        {/* 3 Summary Cards */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
          <StatCard
            title="Today's Revenue"
            titleAr={'\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u064A\u0648\u0645'}
            value={loading ? '...' : formatOMR(todayRevenue)}
            icon={IconTrendingUp}
            color="teal"
            borderColor="#00B894"
            loading={loading}
          />
          <StatCard
            title="Total Transactions"
            titleAr={'\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A'}
            value={loading ? '...' : totalTxCount.toString()}
            icon={IconReceipt}
            color="blue"
            borderColor="#0984e3"
            loading={loading}
          />
          <StatCard
            title="Avg Transaction Value"
            titleAr={'\u0645\u062A\u0648\u0633\u0637 \u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629'}
            value={loading ? '...' : formatOMR(avgTxValue)}
            icon={IconCash}
            color="grape"
            borderColor="#6C5CE7"
            loading={loading}
          />
        </SimpleGrid>

        <Grid gutter="xl">
          {/* Revenue Chart */}
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Card shadow="sm" radius="md" withBorder>
              <Group justify="space-between" mb="md">
                <Box>
                  <Text fw={600}>Daily Revenue (Last 7 Days)</Text>
                  <Text size="xs" c="dimmed">{'\u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u064A\u0648\u0645\u064A\u0629'}</Text>
                </Box>
                <Button
                  variant="subtle"
                  color="teal"
                  size="xs"
                  rightSection={<IconArrowRight size={14} />}
                  onClick={() => navigate('/analytics')}
                >
                  View Analytics
                </Button>
              </Group>
              {loading ? (
                <Stack gap="sm">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <Skeleton key={i} height={28} />
                  ))}
                </Stack>
              ) : (
                <RevenueChart data={dailyRevenue} />
              )}
            </Card>
          </Grid.Col>

          {/* Top Customers */}
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Card shadow="sm" radius="md" withBorder>
              <Group justify="space-between" mb="md">
                <Box>
                  <Text fw={600}>Top Customers</Text>
                  <Text size="xs" c="dimmed">{'\u0623\u0641\u0636\u0644 \u0627\u0644\u0639\u0645\u0644\u0627\u0621'}</Text>
                </Box>
                <ThemeIcon size={28} radius="md" variant="light" color="teal">
                  <IconUsers size={16} />
                </ThemeIcon>
              </Group>
              {loading ? (
                <Stack gap="sm">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} height={40} />
                  ))}
                </Stack>
              ) : topCustomers.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="lg">No customer data yet</Text>
              ) : (
                <Stack gap="sm">
                  {topCustomers.map((customer, idx) => (
                    <Group key={customer.name} justify="space-between" wrap="nowrap">
                      <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                        <Box
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: idx === 0 ? '#00B894' : idx === 1 ? '#00CEC9' : '#e9ecef',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Text size="xs" fw={700} c={idx < 2 ? 'white' : 'dimmed'}>
                            {idx + 1}
                          </Text>
                        </Box>
                        <Box style={{ minWidth: 0 }}>
                          <Text size="sm" fw={500} truncate="end">{customer.name}</Text>
                          <Text size="xs" c="dimmed">{customer.transactionCount} transactions</Text>
                        </Box>
                      </Group>
                      <Text size="sm" fw={700} c="teal" style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {formatOMR(customer.totalAmount)}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              )}
            </Card>
          </Grid.Col>
        </Grid>

        {/* Recent Transactions + Cash Flow */}
        <Grid gutter="xl">
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Card shadow="sm" radius="md" withBorder p={0}>
              <Group justify="space-between" p="md" pb="sm">
                <Box>
                  <Text fw={600}>Recent Transactions</Text>
                  <Text size="xs" c="dimmed">{'\u0622\u062E\u0631 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A'}</Text>
                </Box>
                <Button
                  variant="subtle"
                  color="teal"
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

          {/* Cash Flow Summary */}
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Card shadow="sm" radius="md" withBorder>
              <Box mb="md">
                <Text fw={600}>Cash Flow This Month</Text>
                <Text size="xs" c="dimmed">{'\u0627\u0644\u062A\u062F\u0641\u0642 \u0627\u0644\u0646\u0642\u062F\u064A \u0647\u0630\u0627 \u0627\u0644\u0634\u0647\u0631'}</Text>
              </Box>
              {loading ? (
                <Stack gap="md">
                  <Skeleton height={32} />
                  <Skeleton height={12} />
                  <Skeleton height={32} />
                </Stack>
              ) : (
                <Stack gap="lg">
                  {/* Stacked bar */}
                  <Box>
                    <Group justify="space-between" mb={6}>
                      <Text size="xs" fw={500} c="teal">Income</Text>
                      <Text size="xs" fw={500} c="red">Expenses</Text>
                    </Group>
                    <Box style={{ display: 'flex', height: 24, borderRadius: 8, overflow: 'hidden' }}>
                      <Box
                        style={{
                          width: `${incomePct}%`,
                          background: 'linear-gradient(90deg, #00B894, #00CEC9)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                      <Box
                        style={{
                          width: `${100 - incomePct}%`,
                          background: 'linear-gradient(90deg, #e17055, #d63031)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Breakdown */}
                  <Stack gap="sm">
                    <Paper p="sm" radius="md" withBorder style={{ borderLeftColor: '#00B894', borderLeftWidth: 3 }}>
                      <Group justify="space-between">
                        <Group gap="xs">
                          <IconTrendingUp size={16} color="#00B894" />
                          <Box>
                            <Text size="sm" fw={500}>Income</Text>
                            <Text size="xs" c="dimmed">{'\u0627\u0644\u062F\u062E\u0644'}</Text>
                          </Box>
                        </Group>
                        <Text size="sm" fw={700} c="teal" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          +{formatOMR(thisMonthIncome)}
                        </Text>
                      </Group>
                    </Paper>

                    <Paper p="sm" radius="md" withBorder style={{ borderLeftColor: '#e17055', borderLeftWidth: 3 }}>
                      <Group justify="space-between">
                        <Group gap="xs">
                          <IconTrendingDown size={16} color="#e17055" />
                          <Box>
                            <Text size="sm" fw={500}>Expenses</Text>
                            <Text size="xs" c="dimmed">{'\u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062A'}</Text>
                          </Box>
                        </Group>
                        <Text size="sm" fw={700} c="red" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          -{formatOMR(thisMonthExpenses)}
                        </Text>
                      </Group>
                    </Paper>

                    <Paper p="sm" radius="md" bg={thisMonthIncome - thisMonthExpenses >= 0 ? 'teal.0' : 'red.0'}>
                      <Group justify="space-between">
                        <Text size="sm" fw={600}>Net Cash Flow</Text>
                        <Text
                          size="sm"
                          fw={700}
                          c={thisMonthIncome - thisMonthExpenses >= 0 ? 'teal' : 'red'}
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                          {thisMonthIncome - thisMonthExpenses >= 0 ? '+' : ''}{formatOMR(thisMonthIncome - thisMonthExpenses)}
                        </Text>
                      </Group>
                    </Paper>
                  </Stack>
                </Stack>
              )}
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
