import {
  Box,
  Card,
  Container,
  Grid,
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
  ThemeIcon,
  Button,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  IconChartBar,
  IconClock,
  IconCalendarStats,
  IconTrendingUp,
  IconBuildingBank,
} from '@tabler/icons-react';
import { getAllTransactions } from '@/utils/api';
import { isBankConnected } from '@/utils/consent';
import {
  formatOMR,
  getMonthlyRevenue,
  getDailyVolume,
  getHourlyVolume,
  getRevenueByDayOfWeek,
  averageTransactionValue,
  getThisMonthTransactions,
  getLastMonthTransactions,
  percentageChange,
} from '@/utils/analytics';

function EmptyState() {
  const navigate = useNavigate();
  return (
    <Box py={60}>
      <Stack align="center" gap="lg">
        <ThemeIcon size={80} radius="xl" color="teal" variant="light">
          <IconBuildingBank size={40} />
        </ThemeIcon>
        <Text fw={700} size="xl" ta="center">Connect Your Bank to Get Started</Text>
        <Text size="sm" c="dimmed" ta="center">{'\u0627\u0631\u0628\u0637 \u062D\u0633\u0627\u0628\u0643 \u0627\u0644\u0628\u0646\u0643\u064A \u0644\u0644\u0628\u062F\u0621'}</Text>
        <Button color="teal" size="md" onClick={() => navigate('/connect')}>
          Connect Bank Dhofar
        </Button>
      </Stack>
    </Box>
  );
}

/** Pure-CSS horizontal bar chart */
function BarChart({ data, maxVal, color = '#00B894' }: { data: { label: string; value: number; sublabel?: string }[]; maxVal: number; color?: string }) {
  return (
    <Stack gap="xs">
      {data.map((item, idx) => {
        const widthPct = maxVal > 0 ? Math.max((item.value / maxVal) * 100, 2) : 2;
        return (
          <Group key={idx} gap="sm" wrap="nowrap" align="center">
            <Text size="xs" fw={500} c="dimmed" style={{ width: 36, flexShrink: 0, textAlign: 'right' }}>
              {item.label}
            </Text>
            <Box style={{ flex: 1, position: 'relative', height: 22 }}>
              <Box
                style={{
                  width: `${widthPct}%`,
                  height: '100%',
                  borderRadius: 4,
                  background: item.value > 0
                    ? `linear-gradient(90deg, ${color}, ${color}cc)`
                    : '#e9ecef',
                  transition: 'width 0.3s ease',
                }}
              />
            </Box>
            <Text size="xs" fw={600} c="dimmed" style={{ width: 60, flexShrink: 0, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {item.sublabel || item.value.toLocaleString()}
            </Text>
          </Group>
        );
      })}
    </Stack>
  );
}

export default function Analytics() {
  const connected = isBankConnected();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['all-transactions'],
    queryFn: getAllTransactions,
    enabled: connected,
  });

  if (!connected) {
    return (
      <Container size="lg" py="xl">
        <Title order={2} mb="lg">Analytics</Title>
        <EmptyState />
      </Container>
    );
  }

  const allTx = transactions || [];
  const monthlyRevenue = getMonthlyRevenue(allTx, 6);
  const dailyVolume = getDailyVolume(allTx, 30);
  const hourlyVolume = getHourlyVolume(allTx);
  const dayOfWeekRevenue = getRevenueByDayOfWeek(allTx);

  const thisMonthTx = getThisMonthTransactions(allTx);
  const lastMonthTx = getLastMonthTransactions(allTx);
  const thisAvg = averageTransactionValue(thisMonthTx);
  const lastAvg = averageTransactionValue(lastMonthTx);
  const avgChange = percentageChange(thisAvg, lastAvg);

  const maxMonthlyRev = Math.max(...monthlyRevenue.map((m) => m.revenue), 1);
  const maxDailyVol = Math.max(...dailyVolume.map((d) => d.count), 1);
  const maxHourlyVol = Math.max(...hourlyVolume.map((h) => h.count), 1);
  const maxDayOfWeekRev = Math.max(...dayOfWeekRevenue.map((d) => d.revenue), 1);

  // Filter to only business hours (6 AM - 11 PM) for cleaner display
  const businessHours = hourlyVolume.filter((h) => h.hour >= 6 && h.hour <= 22);

  const loading = isLoading;

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Box>
          <Title order={2}>Analytics</Title>
          <Text size="sm" c="dimmed">{'\u0627\u0644\u062A\u062D\u0644\u064A\u0644\u0627\u062A'} - Business Intelligence</Text>
        </Box>

        {/* Average Order Value */}
        <Paper shadow="sm" p="lg" radius="md" withBorder style={{ borderLeft: '4px solid #00B894' }}>
          <Group justify="space-between">
            <Box>
              <Text size="xs" tt="uppercase" fw={600} c="dimmed">Average Transaction Value</Text>
              <Text size="xs" c="dimmed">{'\u0645\u062A\u0648\u0633\u0637 \u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0629'}</Text>
            </Box>
            <ThemeIcon size={36} radius="md" variant="light" color="teal">
              <IconTrendingUp size={20} />
            </ThemeIcon>
          </Group>
          {loading ? (
            <Skeleton height={32} mt="sm" />
          ) : (
            <Group gap="md" mt="sm" align="flex-end">
              <Text size="xl" fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatOMR(thisAvg)}
              </Text>
              {avgChange !== 0 && (
                <Text size="sm" c={avgChange > 0 ? 'teal' : 'red'} fw={500}>
                  {avgChange > 0 ? '+' : ''}{avgChange.toFixed(1)}% vs last month
                </Text>
              )}
            </Group>
          )}
        </Paper>

        <Grid gutter="xl">
          {/* Monthly Revenue Trend */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="sm" radius="md" withBorder>
              <Group gap="sm" mb="md">
                <ThemeIcon size={28} radius="md" variant="light" color="teal">
                  <IconChartBar size={16} />
                </ThemeIcon>
                <Box>
                  <Text fw={600}>Monthly Revenue Trend</Text>
                  <Text size="xs" c="dimmed">{'\u0627\u062A\u062C\u0627\u0647 \u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0634\u0647\u0631\u064A\u0629'}</Text>
                </Box>
              </Group>
              {loading ? (
                <Stack gap="sm">
                  {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} height={22} />)}
                </Stack>
              ) : (
                <BarChart
                  data={monthlyRevenue.map((m) => ({
                    label: m.month,
                    value: m.revenue,
                    sublabel: formatOMR(m.revenue),
                  }))}
                  maxVal={maxMonthlyRev}
                  color="#00B894"
                />
              )}
            </Card>
          </Grid.Col>

          {/* Transaction Volume (last 30 days) */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="sm" radius="md" withBorder>
              <Group gap="sm" mb="md">
                <ThemeIcon size={28} radius="md" variant="light" color="blue">
                  <IconCalendarStats size={16} />
                </ThemeIcon>
                <Box>
                  <Text fw={600}>Transaction Volume (30 Days)</Text>
                  <Text size="xs" c="dimmed">{'\u062D\u062C\u0645 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A'}</Text>
                </Box>
              </Group>
              {loading ? (
                <Stack gap="xs">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => <Skeleton key={i} height={14} />)}
                </Stack>
              ) : (
                <Box>
                  {/* Mini sparkline using CSS bars */}
                  <Box style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 80 }}>
                    {dailyVolume.map((d, i) => {
                      const heightPct = maxDailyVol > 0 ? Math.max((d.count / maxDailyVol) * 100, 3) : 3;
                      return (
                        <Box
                          key={i}
                          style={{
                            flex: 1,
                            height: `${heightPct}%`,
                            borderRadius: 2,
                            background: d.count > 0 ? '#0984e3' : '#e9ecef',
                            transition: 'height 0.3s ease',
                          }}
                          title={`${d.date}: ${d.count} transactions`}
                        />
                      );
                    })}
                  </Box>
                  <Group justify="space-between" mt="xs">
                    <Text size="xs" c="dimmed">30 days ago</Text>
                    <Text size="xs" c="dimmed">Today</Text>
                  </Group>
                  <Group justify="center" mt="sm">
                    <Text size="sm" c="dimmed">
                      Total: <Text span fw={600} c="blue">{dailyVolume.reduce((s, d) => s + d.count, 0)}</Text> transactions
                    </Text>
                  </Group>
                </Box>
              )}
            </Card>
          </Grid.Col>
        </Grid>

        <Grid gutter="xl">
          {/* Peak Hours */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="sm" radius="md" withBorder>
              <Group gap="sm" mb="md">
                <ThemeIcon size={28} radius="md" variant="light" color="orange">
                  <IconClock size={16} />
                </ThemeIcon>
                <Box>
                  <Text fw={600}>Peak Hours</Text>
                  <Text size="xs" c="dimmed">{'\u0633\u0627\u0639\u0627\u062A \u0627\u0644\u0630\u0631\u0648\u0629'}</Text>
                </Box>
              </Group>
              {loading ? (
                <Stack gap="sm">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} height={22} />)}
                </Stack>
              ) : (
                <BarChart
                  data={businessHours.map((h) => ({
                    label: h.label.replace(' AM', 'a').replace(' PM', 'p'),
                    value: h.count,
                  }))}
                  maxVal={maxHourlyVol}
                  color="#e17055"
                />
              )}
            </Card>
          </Grid.Col>

          {/* Revenue by Day of Week */}
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="sm" radius="md" withBorder>
              <Group gap="sm" mb="md">
                <ThemeIcon size={28} radius="md" variant="light" color="grape">
                  <IconCalendarStats size={16} />
                </ThemeIcon>
                <Box>
                  <Text fw={600}>Revenue by Day of Week</Text>
                  <Text size="xs" c="dimmed">{'\u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u062D\u0633\u0628 \u0623\u064A\u0627\u0645 \u0627\u0644\u0623\u0633\u0628\u0648\u0639'}</Text>
                </Box>
              </Group>
              {loading ? (
                <Stack gap="sm">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} height={22} />)}
                </Stack>
              ) : (
                <BarChart
                  data={dayOfWeekRevenue.map((d) => ({
                    label: d.day.slice(0, 3),
                    value: d.revenue,
                    sublabel: formatOMR(d.revenue),
                  }))}
                  maxVal={maxDayOfWeekRev}
                  color="#6C5CE7"
                />
              )}
            </Card>
          </Grid.Col>
        </Grid>

        {/* Monthly Breakdown Table */}
        <Card shadow="sm" radius="md" withBorder>
          <Box mb="md">
            <Text fw={600}>Monthly Breakdown</Text>
            <Text size="xs" c="dimmed">{'\u0627\u0644\u062A\u0641\u0635\u064A\u0644 \u0627\u0644\u0634\u0647\u0631\u064A'}</Text>
          </Box>
          {loading ? (
            <Stack gap="sm">
              {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} height={40} />)}
            </Stack>
          ) : (
            <Stack gap="xs">
              {/* Header */}
              <Group justify="space-between" px="sm" py="xs" style={{ borderBottom: '2px solid var(--mantine-color-gray-3)' }}>
                <Text size="xs" fw={700} c="dimmed" style={{ width: 60 }}>Month</Text>
                <Text size="xs" fw={700} c="dimmed" style={{ width: 100, textAlign: 'right' }}>Revenue</Text>
                <Text size="xs" fw={700} c="dimmed" style={{ width: 100, textAlign: 'right' }}>Expenses</Text>
                <Text size="xs" fw={700} c="dimmed" style={{ width: 100, textAlign: 'right' }}>Net</Text>
                <Text size="xs" fw={700} c="dimmed" style={{ width: 40, textAlign: 'right' }}>Txn</Text>
              </Group>
              {monthlyRevenue.map((m) => {
                const net = m.revenue - m.expenses;
                return (
                  <Group
                    key={`${m.month}-${m.year}`}
                    justify="space-between"
                    px="sm"
                    py="xs"
                    style={{ borderBottom: '1px solid var(--mantine-color-gray-1)' }}
                  >
                    <Text size="sm" fw={500} style={{ width: 60 }}>{m.month}</Text>
                    <Text size="sm" fw={600} c="teal" style={{ width: 100, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      +{formatOMR(m.revenue)}
                    </Text>
                    <Text size="sm" fw={600} c="red" style={{ width: 100, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      -{formatOMR(m.expenses)}
                    </Text>
                    <Text size="sm" fw={700} c={net >= 0 ? 'teal' : 'red'} style={{ width: 100, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {net >= 0 ? '+' : ''}{formatOMR(net)}
                    </Text>
                    <Text size="sm" c="dimmed" style={{ width: 40, textAlign: 'right' }}>{m.count}</Text>
                  </Group>
                );
              })}
            </Stack>
          )}
        </Card>
      </Stack>
    </Container>
  );
}
