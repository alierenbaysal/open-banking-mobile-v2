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
  RingProgress,
  Progress,
  Badge,
  Divider,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import {
  IconAlertCircle,
  IconTrendingDown,
  IconArrowUpRight,
  IconArrowDownRight,
  IconReceipt,
  IconPigMoney,
} from '@tabler/icons-react';
import { getAllTransactions } from '@/utils/api';
import type { OBTransaction } from '@/utils/api';
import { isBankConnected } from '@/utils/consent';
import { buildSpendingSummary, buildMerchantSummary, getCategoryEmoji } from '@/utils/categories';
// types used internally via the build* helpers
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
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function getMonthShortLabel(monthsBack: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  return d.toLocaleDateString('en-US', { month: 'short' });
}

export default function Spending() {
  const connected = isBankConnected();

  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ['all-transactions'],
    queryFn: getAllTransactions,
    enabled: connected,
  });

  const analysis = useMemo(() => {
    const allTx = transactions || [];

    // Current and past months
    const months = [0, 1, 2].map((m) => {
      const tx = getMonthTransactions(allTx, m);
      const summary = buildSpendingSummary(tx);
      const spending = summary.reduce((s, v) => s + v.total, 0);
      const income = tx
        .filter((t) => t.CreditDebitIndicator === 'Credit')
        .reduce((s, t) => s + parseFloat(t.Amount.Amount), 0);
      return { tx, summary, spending, income, label: getMonthLabel(m), shortLabel: getMonthShortLabel(m) };
    });

    const curr = allTx[0]?.Amount?.Currency || 'OMR';
    const merchants = buildMerchantSummary(months[0].tx, 10);

    return { months, currency: curr, merchants };
  }, [transactions]);

  if (!connected) {
    return (
      <Container size="lg" py="xl">
        <Title order={2} mb="lg">Spending</Title>
        <EmptyState type="no-bank" />
      </Container>
    );
  }

  const { months, currency, merchants } = analysis;
  const [thisMonth, lastMonth, twoMonthsAgo] = months;

  const changePercent = lastMonth.spending > 0
    ? ((thisMonth.spending - lastMonth.spending) / lastMonth.spending) * 100
    : 0;

  const savingsRate = thisMonth.income > 0
    ? ((thisMonth.income - thisMonth.spending) / thisMonth.income) * 100
    : 0;

  const maxMonthSpending = Math.max(thisMonth.spending, lastMonth.spending, twoMonthsAgo.spending, 1);

  // Ring segments for donut
  const ringSegments = thisMonth.summary.slice(0, 8).map((item) => ({
    value: Math.max(item.percentage, 1),
    color: item.category.color,
    tooltip: `${item.category.name}: ${item.percentage.toFixed(1)}%`,
  }));

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Box>
          <Title order={2}>Spending Analysis</Title>
          <Text size="sm" c="dimmed">{'\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641'} - {thisMonth.label}</Text>
        </Box>

        {error && (
          <Alert icon={<IconAlertCircle size={18} />} color="red" variant="light">
            Failed to load transactions: {(error as Error).message}
          </Alert>
        )}

        {/* ── Top Stats Row ── */}
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
          {/* This month spending */}
          <Paper
            shadow="sm"
            p="lg"
            radius="md"
            withBorder
            style={{ borderLeft: '4px solid #e17055' }}
          >
            <Group justify="space-between" mb="sm">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">This Month</Text>
              <ThemeIcon size={32} radius="md" variant="light" color="red">
                <IconTrendingDown size={18} />
              </ThemeIcon>
            </Group>
            {isLoading ? (
              <Skeleton height={28} />
            ) : (
              <Text size="lg" fw={700} c="red" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatAmount(thisMonth.spending, currency)}
              </Text>
            )}
            <Text size="xs" c="dimmed" mt={4}>
              {thisMonth.tx.filter((t) => t.CreditDebitIndicator === 'Debit').length} transactions
            </Text>
          </Paper>

          {/* Last month */}
          <Paper shadow="sm" p="lg" radius="md" withBorder>
            <Group justify="space-between" mb="sm">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">Last Month</Text>
              <ThemeIcon size={32} radius="md" variant="light" color="gray">
                <IconReceipt size={18} />
              </ThemeIcon>
            </Group>
            {isLoading ? (
              <Skeleton height={28} />
            ) : (
              <Text size="lg" fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>{formatAmount(lastMonth.spending, currency)}</Text>
            )}
            <Text size="xs" c="dimmed" mt={4}>{lastMonth.label}</Text>
          </Paper>

          {/* Change */}
          <Paper
            shadow="sm"
            p="lg"
            radius="md"
            withBorder
            style={{ borderLeft: `4px solid ${changePercent > 0 ? '#e17055' : '#00b894'}` }}
          >
            <Group justify="space-between" mb="sm">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">Change</Text>
              <ThemeIcon
                size={32}
                radius="md"
                variant="light"
                color={changePercent > 0 ? 'red' : 'teal'}
              >
                {changePercent > 0 ? <IconArrowUpRight size={18} /> : <IconArrowDownRight size={18} />}
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

          {/* Savings Rate */}
          <Paper
            shadow="sm"
            p="lg"
            radius="md"
            withBorder
            style={{ borderLeft: `4px solid ${savingsRate >= 20 ? '#00b894' : savingsRate >= 10 ? '#fdcb6e' : '#e17055'}` }}
          >
            <Group justify="space-between" mb="sm">
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">Savings Rate</Text>
              <ThemeIcon
                size={32}
                radius="md"
                variant="light"
                color={savingsRate >= 20 ? 'teal' : savingsRate >= 10 ? 'yellow' : 'red'}
              >
                <IconPigMoney size={18} />
              </ThemeIcon>
            </Group>
            {isLoading ? (
              <Skeleton height={28} />
            ) : (
              <Text
                size="lg"
                fw={700}
                c={savingsRate >= 20 ? 'teal' : savingsRate >= 10 ? 'yellow.8' : 'red'}
              >
                {savingsRate.toFixed(1)}%
              </Text>
            )}
            <Text size="xs" c="dimmed" mt={4}>
              {savingsRate >= 20 ? 'Excellent!' : savingsRate >= 10 ? 'Good' : 'Needs attention'}
            </Text>
          </Paper>
        </SimpleGrid>

        <Grid gutter="xl">
          {/* ── Left Column: Donut + Category Cards ── */}
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Stack gap="lg">
              {/* Donut Chart */}
              <Card shadow="sm" radius="md" withBorder>
                <Box mb="md">
                  <Text fw={600} size="lg">Spending Breakdown</Text>
                  <Text size="xs" c="dimmed">{'\u062A\u0641\u0635\u064A\u0644 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641'} - {thisMonth.label}</Text>
                </Box>
                {isLoading ? (
                  <Stack gap="md">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} height={40} />
                    ))}
                  </Stack>
                ) : thisMonth.summary.length > 0 ? (
                  <Stack gap="lg">
                    {/* Big donut */}
                    <Group justify="center" py="md">
                      <RingProgress
                        size={220}
                        thickness={22}
                        roundCaps
                        sections={ringSegments}
                        label={
                          <Box ta="center">
                            <Text size="xs" c="dimmed" lh={1}>Total Spent</Text>
                            <Text size="lg" fw={700} lh={1.3} style={{ fontVariantNumeric: 'tabular-nums' }}>
                              {formatAmount(thisMonth.spending, currency)}
                            </Text>
                            <Text size="xs" c="dimmed" lh={1}>
                              {thisMonth.summary.reduce((s, d) => s + d.count, 0)} txn
                            </Text>
                          </Box>
                        }
                      />
                    </Group>

                    {/* Category cards grid */}
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                      {thisMonth.summary.map((item) => {
                        const emoji = getCategoryEmoji(item.category.id);
                        return (
                          <Paper
                            key={item.category.id}
                            p="sm"
                            radius="md"
                            withBorder
                            style={{
                              borderLeftColor: item.category.color,
                              borderLeftWidth: 3,
                              transition: 'transform 0.15s, box-shadow 0.15s',
                            }}
                          >
                            <Group justify="space-between" mb={4} wrap="nowrap">
                              <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                                <Text size="xl" style={{ lineHeight: 1 }}>{emoji}</Text>
                                <Box style={{ minWidth: 0 }}>
                                  <Text size="sm" fw={600} truncate="end">{item.category.name}</Text>
                                  <Text size="xs" c="dimmed">{item.category.nameAr}</Text>
                                </Box>
                              </Group>
                              <Box style={{ textAlign: 'right', flexShrink: 0 }}>
                                <Text size="sm" fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
                                  {formatAmount(item.total, currency)}
                                </Text>
                                <Badge size="xs" variant="light" color={item.category.color}>
                                  {item.percentage.toFixed(1)}%
                                </Badge>
                              </Box>
                            </Group>
                            <Progress
                              value={item.percentage}
                              color={item.category.color}
                              size="xs"
                              radius="xl"
                              mt={4}
                            />
                          </Paper>
                        );
                      })}
                    </SimpleGrid>
                  </Stack>
                ) : (
                  <Text c="dimmed" ta="center" py="xl">No spending data this month</Text>
                )}
              </Card>
            </Stack>
          </Grid.Col>

          {/* ── Right Column: Merchants, Trend, Tips ── */}
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Stack gap="lg">
              {/* Monthly Trend — 3 month bar comparison */}
              <Card shadow="sm" radius="md" withBorder>
                <Text fw={600} size="sm" mb="md">Monthly Trend / {'\u0627\u0644\u0627\u062A\u062C\u0627\u0647 \u0627\u0644\u0634\u0647\u0631\u064A'}</Text>
                {isLoading ? (
                  <Skeleton height={100} />
                ) : (
                  <Stack gap="sm">
                    {months.map((m, i) => (
                      <Box key={i}>
                        <Group justify="space-between" mb={4}>
                          <Group gap="xs">
                            <Text size="sm" fw={i === 0 ? 600 : 400}>{m.shortLabel}</Text>
                            {i === 0 && <Badge size="xs" variant="filled" color="violet">Current</Badge>}
                          </Group>
                          <Text size="sm" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatAmount(m.spending, currency)}
                          </Text>
                        </Group>
                        <Box
                          style={{
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: 'var(--mantine-color-gray-1)',
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            style={{
                              height: '100%',
                              width: `${Math.max(2, (m.spending / maxMonthSpending) * 100)}%`,
                              borderRadius: 10,
                              background: i === 0
                                ? 'linear-gradient(90deg, #6C5CE7, #a29bfe)'
                                : i === 1
                                ? '#a29bfe'
                                : '#d0bfff',
                              transition: 'width 0.8s ease-out',
                            }}
                          />
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Card>

              {/* Top Merchants */}
              <Card shadow="sm" radius="md" withBorder>
                <Text fw={600} size="sm" mb="md">Top Merchants / {'\u0623\u0643\u062B\u0631 \u0627\u0644\u062A\u062C\u0627\u0631'}</Text>
                {isLoading ? (
                  <Stack gap="sm">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} height={36} />
                    ))}
                  </Stack>
                ) : merchants.length === 0 ? (
                  <Text c="dimmed" size="sm" ta="center" py="md">No merchant data</Text>
                ) : (
                  <Stack gap={0}>
                    {merchants.map((m, i) => (
                      <Group
                        key={i}
                        justify="space-between"
                        py="xs"
                        px="xs"
                        style={{
                          borderBottom: i < merchants.length - 1 ? '1px solid var(--mantine-color-gray-1)' : 'none',
                        }}
                        wrap="nowrap"
                      >
                        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                          <Box
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 6,
                              background: `${m.category.color}20`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Text size="xs">{getCategoryEmoji(m.category.id)}</Text>
                          </Box>
                          <Box style={{ minWidth: 0 }}>
                            <Text size="sm" fw={500} truncate="end">{m.name}</Text>
                            <Text size="xs" c="dimmed">{m.count} transaction{m.count !== 1 ? 's' : ''}</Text>
                          </Box>
                        </Group>
                        <Text size="sm" fw={600} style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          {formatAmount(m.total, currency)}
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                )}
              </Card>

              {/* Savings Insight Card */}
              {!isLoading && (
                <Card
                  shadow="sm"
                  radius="md"
                  withBorder
                  style={{
                    background: savingsRate >= 20
                      ? 'linear-gradient(135deg, #e8f8f5, #d4efdf)'
                      : savingsRate >= 10
                      ? 'linear-gradient(135deg, #fef9e7, #fdebd0)'
                      : 'linear-gradient(135deg, #fdedec, #fadbd8)',
                    border: 'none',
                  }}
                >
                  <Group gap="md" wrap="nowrap">
                    <RingProgress
                      size={80}
                      thickness={8}
                      roundCaps
                      sections={[
                        {
                          value: Math.min(Math.max(savingsRate, 0), 100),
                          color: savingsRate >= 20 ? '#00b894' : savingsRate >= 10 ? '#f39c12' : '#e17055',
                        },
                      ]}
                      label={
                        <Text size="xs" fw={700} ta="center" lh={1}>
                          {savingsRate.toFixed(0)}%
                        </Text>
                      }
                    />
                    <Box style={{ flex: 1 }}>
                      <Text fw={600} size="sm">
                        {savingsRate >= 20
                          ? 'Great Savings!'
                          : savingsRate >= 10
                          ? 'On Track'
                          : 'Room to Improve'}
                      </Text>
                      <Text size="xs" c="dimmed" mt={2}>
                        {savingsRate >= 20
                          ? 'You\'re saving well above the recommended 20%. Consider investing your surplus.'
                          : savingsRate >= 10
                          ? 'Good progress! Try reducing your top spending category to reach 20%.'
                          : 'Try setting a monthly spending budget for your top 3 categories.'}
                      </Text>
                      <Text size="xs" c="dimmed" mt={4}>
                        {savingsRate >= 20
                          ? '\u0645\u0639\u062F\u0644 \u0627\u062F\u062E\u0627\u0631 \u0645\u0645\u062A\u0627\u0632!'
                          : savingsRate >= 10
                          ? '\u0628\u062F\u0627\u064A\u0629 \u062C\u064A\u062F\u0629!'
                          : '\u062D\u0627\u0648\u0644 \u062A\u0642\u0644\u064A\u0644 \u0627\u0644\u0645\u0635\u0627\u0631\u064A\u0641'}
                      </Text>
                    </Box>
                  </Group>
                </Card>
              )}

              {/* Income vs Spending visual */}
              {!isLoading && (
                <Card shadow="sm" radius="md" withBorder>
                  <Text fw={600} size="sm" mb="md">Income vs Spending</Text>
                  <Group justify="space-around" mb="md">
                    <Box ta="center">
                      <Text size="xs" c="dimmed" mb={4}>Income</Text>
                      <Text size="lg" fw={700} c="teal" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatAmount(thisMonth.income, currency)}
                      </Text>
                    </Box>
                    <Divider orientation="vertical" />
                    <Box ta="center">
                      <Text size="xs" c="dimmed" mb={4}>Spending</Text>
                      <Text size="lg" fw={700} c="red" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatAmount(thisMonth.spending, currency)}
                      </Text>
                    </Box>
                  </Group>
                  <Progress.Root size="xl" radius="xl">
                    <Progress.Section
                      value={thisMonth.income > 0 ? (thisMonth.income / (thisMonth.income + thisMonth.spending)) * 100 : 50}
                      color="teal"
                    >
                      <Progress.Label>Income</Progress.Label>
                    </Progress.Section>
                    <Progress.Section
                      value={thisMonth.spending > 0 ? (thisMonth.spending / (thisMonth.income + thisMonth.spending)) * 100 : 50}
                      color="red"
                    >
                      <Progress.Label>Spending</Progress.Label>
                    </Progress.Section>
                  </Progress.Root>
                </Card>
              )}
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
