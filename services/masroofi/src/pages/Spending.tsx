import { useMemo } from 'react';
import {
  Box,
  Card,
  Container,
  Grid,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
  Title,
  Alert,
  ThemeIcon,
  SimpleGrid,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { IconAlertCircle, IconTrendingDown, IconTrendingUp, IconChartPie } from '@tabler/icons-react';
import { getAllTransactions } from '@/utils/api';
import type { OBTransaction } from '@/utils/api';
import { isBankConnected } from '@/utils/consent';
import { buildSpendingSummary, categorizeTransaction } from '@/utils/categories';
import SpendingChart from '@/components/SpendingChart';
import EmptyState from '@/components/EmptyState';

function formatAmount(amount: number, currency: string = 'OMR'): string {
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${currency}`;
}

function getMonthTransactions(transactions: OBTransaction[], monthsBack: number = 0): OBTransaction[] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 0, 23, 59, 59);
  return transactions.filter((t) => {
    const d = new Date(t.BookingDateTime);
    return d >= start && d <= end;
  });
}

function getMonthLabel(monthsBack: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function Spending() {
  const connected = isBankConnected();

  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ['all-transactions'],
    queryFn: getAllTransactions,
    enabled: connected,
  });

  const { thisMonth, lastMonth, thisMonthSummary, lastMonthSummary, topCategory, currency } = useMemo(() => {
    const allTx = transactions || [];
    const thisTx = getMonthTransactions(allTx, 0);
    const lastTx = getMonthTransactions(allTx, 1);
    const thisSummary = buildSpendingSummary(thisTx);
    const lastSummary = buildSpendingSummary(lastTx);

    // Determine most-used currency
    const curr = allTx[0]?.Amount?.Currency || 'OMR';

    return {
      thisMonth: thisTx,
      lastMonth: lastTx,
      thisMonthSummary: thisSummary,
      lastMonthSummary: lastSummary,
      topCategory: thisSummary[0] || null,
      currency: curr,
    };
  }, [transactions]);

  if (!connected) {
    return (
      <Container size="lg" py="xl">
        <Title order={2} mb="lg">Spending</Title>
        <EmptyState type="no-bank" />
      </Container>
    );
  }

  const thisMonthTotal = thisMonthSummary.reduce((s, v) => s + v.total, 0);
  const lastMonthTotal = lastMonthSummary.reduce((s, v) => s + v.total, 0);
  const changePercent = lastMonthTotal > 0
    ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
    : 0;

  const thisMonthIncome = thisMonth
    .filter((t) => t.CreditDebitIndicator === 'Credit')
    .reduce((s, t) => s + parseFloat(t.Amount.Amount), 0);

  const savingsRate = thisMonthIncome > 0
    ? ((thisMonthIncome - thisMonthTotal) / thisMonthIncome) * 100
    : 0;

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Box>
          <Title order={2}>Spending Analysis</Title>
          <Text size="sm" c="dimmed">تحليل المصاريف - {getMonthLabel(0)}</Text>
        </Box>

        {error && (
          <Alert icon={<IconAlertCircle size={18} />} color="red" variant="light">
            Failed to load transactions: {(error as Error).message}
          </Alert>
        )}

        {/* Summary Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
          <Paper shadow="sm" p="lg" radius="md" withBorder>
            <Group justify="space-between" mb="sm">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">This Month</Text>
              <ThemeIcon size={32} radius="md" variant="light" color="red">
                <IconTrendingDown size={18} />
              </ThemeIcon>
            </Group>
            {isLoading ? (
              <Skeleton height={28} />
            ) : (
              <Text size="lg" fw={700} c="red">{formatAmount(thisMonthTotal, currency)}</Text>
            )}
            <Text size="xs" c="dimmed" mt={4}>{thisMonth.filter((t) => t.CreditDebitIndicator === 'Debit').length} transactions</Text>
          </Paper>

          <Paper shadow="sm" p="lg" radius="md" withBorder>
            <Group justify="space-between" mb="sm">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">Last Month</Text>
              <ThemeIcon size={32} radius="md" variant="light" color="gray">
                <IconTrendingDown size={18} />
              </ThemeIcon>
            </Group>
            {isLoading ? (
              <Skeleton height={28} />
            ) : (
              <Text size="lg" fw={700}>{formatAmount(lastMonthTotal, currency)}</Text>
            )}
            <Text size="xs" c="dimmed" mt={4}>{getMonthLabel(1)}</Text>
          </Paper>

          <Paper shadow="sm" p="lg" radius="md" withBorder>
            <Group justify="space-between" mb="sm">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">Change</Text>
              <ThemeIcon
                size={32}
                radius="md"
                variant="light"
                color={changePercent > 0 ? 'red' : 'teal'}
              >
                {changePercent > 0 ? <IconTrendingUp size={18} /> : <IconTrendingDown size={18} />}
              </ThemeIcon>
            </Group>
            {isLoading ? (
              <Skeleton height={28} />
            ) : (
              <Text
                size="lg"
                fw={700}
                c={changePercent > 0 ? 'red' : 'teal'}
              >
                {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
              </Text>
            )}
            <Text size="xs" c="dimmed" mt={4}>vs last month</Text>
          </Paper>

          <Paper shadow="sm" p="lg" radius="md" withBorder>
            <Group justify="space-between" mb="sm">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">Savings Rate</Text>
              <ThemeIcon size={32} radius="md" variant="light" color="teal">
                <IconChartPie size={18} />
              </ThemeIcon>
            </Group>
            {isLoading ? (
              <Skeleton height={28} />
            ) : (
              <Text
                size="lg"
                fw={700}
                c={savingsRate >= 0 ? 'teal' : 'red'}
              >
                {savingsRate.toFixed(1)}%
              </Text>
            )}
            <Text size="xs" c="dimmed" mt={4}>of income saved</Text>
          </Paper>
        </SimpleGrid>

        <Grid gutter="xl">
          {/* Spending Breakdown */}
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Card shadow="sm" radius="md" withBorder>
              <Box mb="lg">
                <Text fw={600} size="lg">Spending Breakdown</Text>
                <Text size="xs" c="dimmed">تفصيل المصاريف - {getMonthLabel(0)}</Text>
              </Box>
              {isLoading ? (
                <Stack gap="md">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} height={40} />
                  ))}
                </Stack>
              ) : thisMonthSummary.length > 0 ? (
                <SpendingChart data={thisMonthSummary} currency={currency} />
              ) : (
                <Text c="dimmed" ta="center" py="xl">No spending data this month</Text>
              )}
            </Card>
          </Grid.Col>

          {/* Insights */}
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Stack gap="lg">
              {/* Top Spending Category */}
              {topCategory && !isLoading && (
                <Card shadow="sm" radius="md" withBorder>
                  <Text fw={600} size="sm" mb="md">Top Spending Category</Text>
                  <Group gap="md">
                    <Box
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        backgroundColor: `${topCategory.category.color}20`,
                        border: `3px solid ${topCategory.category.color}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text fw={700} size="lg" style={{ color: topCategory.category.color }}>
                        {topCategory.percentage.toFixed(0)}%
                      </Text>
                    </Box>
                    <Box>
                      <Text fw={600}>{topCategory.category.name}</Text>
                      <Text size="xs" c="dimmed">{topCategory.category.nameAr}</Text>
                      <Text size="sm" fw={600} mt={2}>
                        {formatAmount(topCategory.total, currency)}
                      </Text>
                    </Box>
                  </Group>
                </Card>
              )}

              {/* Month Comparison */}
              <Card shadow="sm" radius="md" withBorder>
                <Text fw={600} size="sm" mb="md">Month-over-Month</Text>
                {isLoading ? (
                  <Skeleton height={80} />
                ) : (
                  <Stack gap="sm">
                    <Box>
                      <Group justify="space-between" mb={4}>
                        <Text size="sm">{getMonthLabel(0)}</Text>
                        <Text size="sm" fw={600}>{formatAmount(thisMonthTotal, currency)}</Text>
                      </Group>
                      <Box
                        style={{
                          height: 16,
                          borderRadius: 8,
                          backgroundColor: 'var(--mantine-color-gray-1)',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          style={{
                            height: '100%',
                            width: `${Math.min(100, lastMonthTotal > 0 ? (thisMonthTotal / Math.max(thisMonthTotal, lastMonthTotal)) * 100 : 50)}%`,
                            borderRadius: 8,
                            backgroundColor: '#6C5CE7',
                            transition: 'width 0.6s ease-out',
                          }}
                        />
                      </Box>
                    </Box>
                    <Box>
                      <Group justify="space-between" mb={4}>
                        <Text size="sm">{getMonthLabel(1)}</Text>
                        <Text size="sm" fw={600}>{formatAmount(lastMonthTotal, currency)}</Text>
                      </Group>
                      <Box
                        style={{
                          height: 16,
                          borderRadius: 8,
                          backgroundColor: 'var(--mantine-color-gray-1)',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          style={{
                            height: '100%',
                            width: `${Math.min(100, thisMonthTotal > 0 ? (lastMonthTotal / Math.max(thisMonthTotal, lastMonthTotal)) * 100 : 50)}%`,
                            borderRadius: 8,
                            backgroundColor: '#a29bfe',
                            transition: 'width 0.6s ease-out',
                          }}
                        />
                      </Box>
                    </Box>
                  </Stack>
                )}
              </Card>

              {/* Quick Tips */}
              <Card shadow="sm" radius="md" withBorder bg="violet.0">
                <Text fw={600} size="sm" mb="sm" c="violet.8">Savings Tip</Text>
                <Text size="sm" c="violet.7">
                  {savingsRate < 10
                    ? 'Try to save at least 10% of your monthly income. Set up automatic transfers to a savings account.'
                    : savingsRate < 20
                    ? 'Good start! Aim for 20% savings rate by reviewing your top spending categories.'
                    : 'Excellent savings rate! Consider investing your surplus in Bank Dhofar investment products.'}
                </Text>
                <Text size="xs" c="violet.5" mt="xs">
                  {savingsRate < 10
                    ? 'حاول ادخار 10% على الأقل من دخلك الشهري'
                    : savingsRate < 20
                    ? 'بداية جيدة! حاول الوصول لمعدل ادخار 20%'
                    : 'معدل ادخار ممتاز! فكر في استثمار الفائض'}
                </Text>
              </Card>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
