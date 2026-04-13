import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Container,
  Group,
  SegmentedControl,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
  Alert,
  Badge,
  Button,
  Paper,
  Select,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { IconSearch, IconAlertCircle, IconArrowLeft, IconFilter, IconCalendar } from '@tabler/icons-react';
import { getTransactions, getAllTransactions, getAccount } from '@/utils/api';
import type { OBTransaction } from '@/utils/api';
import { isBankConnected } from '@/utils/consent';
import TransactionRow from '@/components/TransactionRow';
import EmptyState from '@/components/EmptyState';

type FilterType = 'all' | 'credit' | 'debit';

/** Format a date key for grouping: "Today", "Yesterday", or "Mon 7 Apr" */
function getDateGroupLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const txDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (txDay.getTime() === today.getTime()) return 'Today';
  if (txDay.getTime() === yesterday.getTime()) return 'Yesterday';

  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Get a canonical date key for grouping (YYYY-MM-DD). */
function getDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface DateGroup {
  key: string;
  label: string;
  transactions: OBTransaction[];
  dayTotal: { credit: number; debit: number };
}

export default function Transactions() {
  const { accountId } = useParams<{ accountId?: string }>();
  const navigate = useNavigate();
  const connected = isBankConnected();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [dateRange, setDateRange] = useState<string | null>(null);

  const { data: account } = useQuery({
    queryKey: ['account', accountId],
    queryFn: () => getAccount(accountId!),
    enabled: connected && !!accountId,
  });

  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ['transactions', accountId || 'all'],
    queryFn: () => accountId ? getTransactions(accountId) : getAllTransactions(),
    enabled: connected,
  });

  if (!connected) {
    return (
      <Container size="lg" py="xl">
        <Title order={2} mb="lg">Transactions</Title>
        <EmptyState type="no-bank" />
      </Container>
    );
  }

  const filtered = useMemo(() => {
    let result = transactions || [];

    if (filter === 'credit') {
      result = result.filter((t) => t.CreditDebitIndicator === 'Credit');
    } else if (filter === 'debit') {
      result = result.filter((t) => t.CreditDebitIndicator === 'Debit');
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) =>
        (t.TransactionInformation || '').toLowerCase().includes(q) ||
        t.Amount.Amount.includes(q) ||
        t.TransactionId.toLowerCase().includes(q)
      );
    }

    if (dateRange) {
      const now = new Date();
      let start: Date;
      switch (dateRange) {
        case '7d':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          start = new Date(0);
      }
      result = result.filter((t) => new Date(t.BookingDateTime) >= start);
    }

    result = [...result].sort(
      (a, b) => new Date(b.BookingDateTime).getTime() - new Date(a.BookingDateTime).getTime()
    );

    return result;
  }, [transactions, filter, search, dateRange]);

  // Group by date
  const dateGroups = useMemo((): DateGroup[] => {
    const groups = new Map<string, DateGroup>();
    for (const tx of filtered) {
      const key = getDateKey(tx.BookingDateTime);
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label: getDateGroupLabel(tx.BookingDateTime),
          transactions: [],
          dayTotal: { credit: 0, debit: 0 },
        });
      }
      const g = groups.get(key)!;
      g.transactions.push(tx);
      const amt = parseFloat(tx.Amount.Amount);
      if (tx.CreditDebitIndicator === 'Credit') {
        g.dayTotal.credit += amt;
      } else {
        g.dayTotal.debit += amt;
      }
    }
    return Array.from(groups.values());
  }, [filtered]);

  // Compute running balances (most recent first, so we work backward from the last known balance)
  const runningBalances = useMemo((): Map<string, number> => {
    const map = new Map<string, number>();
    // Try to use the balance from the most recent transaction
    const sorted = filtered;
    if (sorted.length === 0) return map;

    // Start from the last transaction's balance if available, otherwise just cumulate
    let balance = 0;
    const firstWithBalance = sorted.find((t) => t.Balance?.Amount?.Amount);
    if (firstWithBalance?.Balance?.Amount) {
      balance = parseFloat(firstWithBalance.Balance.Amount.Amount);
      if (firstWithBalance.Balance.CreditDebitIndicator === 'Debit') balance = -balance;
    }

    // Walk from most recent to oldest, subtracting each tx to get running balance
    map.set(sorted[0].TransactionId, balance);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const prevAmt = parseFloat(prev.Amount.Amount);
      if (prev.CreditDebitIndicator === 'Credit') {
        balance -= prevAmt;
      } else {
        balance += prevAmt;
      }
      map.set(sorted[i].TransactionId, balance);
    }
    return map;
  }, [filtered]);

  const totalCredit = filtered
    .filter((t) => t.CreditDebitIndicator === 'Credit')
    .reduce((s, t) => s + parseFloat(t.Amount.Amount), 0);

  const totalDebit = filtered
    .filter((t) => t.CreditDebitIndicator === 'Debit')
    .reduce((s, t) => s + parseFloat(t.Amount.Amount), 0);

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Box>
          <Group gap="md" mb="xs">
            {accountId && (
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                leftSection={<IconArrowLeft size={14} />}
                onClick={() => navigate('/accounts')}
              >
                Back to Accounts
              </Button>
            )}
          </Group>
          <Title order={2}>
            {accountId ? 'Transactions' : 'All Transactions'}
          </Title>
          <Text size="sm" c="dimmed">
            {accountId && account
              ? `${account.Nickname || 'Account'} - ${account.Account?.[0]?.Identification || ''}`
              : '\u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062A - All accounts'}
          </Text>
        </Box>

        {error && (
          <Alert icon={<IconAlertCircle size={18} />} color="red" variant="light">
            Failed to load transactions: {(error as Error).message}
          </Alert>
        )}

        {/* Filters */}
        <Paper p="md" radius="md" withBorder>
          <Group gap="md" wrap="wrap">
            <TextInput
              placeholder="Search transactions..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ flex: 1, minWidth: 200 }}
            />
            <SegmentedControl
              value={filter}
              onChange={(v) => setFilter(v as FilterType)}
              data={[
                { label: 'All', value: 'all' },
                { label: 'Income', value: 'credit' },
                { label: 'Expenses', value: 'debit' },
              ]}
              color="violet"
            />
            <Select
              placeholder="Date range"
              clearable
              leftSection={<IconFilter size={16} />}
              value={dateRange}
              onChange={setDateRange}
              data={[
                { label: 'Last 7 days', value: '7d' },
                { label: 'Last 30 days', value: '30d' },
                { label: 'Last 90 days', value: '90d' },
              ]}
              style={{ width: 160 }}
            />
          </Group>
        </Paper>

        {/* Summary row */}
        <Paper p="md" radius="md" withBorder>
          <Group justify="space-between" wrap="wrap">
            <Group gap="xl">
              <Group gap="xs">
                <Badge color="gray" variant="light" size="lg">{filtered.length}</Badge>
                <Text size="sm" c="dimmed">transactions</Text>
              </Group>
            </Group>
            <Group gap="xl">
              <Box ta="right">
                <Text size="xs" c="dimmed">Total Income</Text>
                <Text size="sm" fw={700} c="teal" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  +{totalCredit.toLocaleString('en-US', { minimumFractionDigits: 3 })}
                </Text>
              </Box>
              <Box ta="right">
                <Text size="xs" c="dimmed">Total Expenses</Text>
                <Text size="sm" fw={700} c="red" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  -{totalDebit.toLocaleString('en-US', { minimumFractionDigits: 3 })}
                </Text>
              </Box>
              <Box ta="right">
                <Text size="xs" c="dimmed">Net</Text>
                <Text
                  size="sm"
                  fw={700}
                  c={totalCredit - totalDebit >= 0 ? 'teal' : 'red'}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {(totalCredit - totalDebit) >= 0 ? '+' : ''}{(totalCredit - totalDebit).toLocaleString('en-US', { minimumFractionDigits: 3 })}
                </Text>
              </Box>
            </Group>
          </Group>
        </Paper>

        {/* Transaction List grouped by date */}
        <Card shadow="sm" radius="md" withBorder p={0}>
          {isLoading ? (
            <Stack gap={0} p="md">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} height={56} mb={4} />
              ))}
            </Stack>
          ) : filtered.length === 0 ? (
            <Box py="xl" px="md">
              <EmptyState
                type="no-data"
                title="No Transactions Found"
                description={search ? 'No transactions match your search. Try different keywords.' : 'No transactions available for this period.'}
              />
            </Box>
          ) : (
            <Stack gap={0}>
              {dateGroups.map((group, gi) => (
                <Box key={group.key}>
                  {/* Date group header */}
                  <Group
                    justify="space-between"
                    px="md"
                    py="xs"
                    style={{
                      background: 'var(--mantine-color-gray-0)',
                      borderBottom: '1px solid var(--mantine-color-gray-2)',
                      ...(gi > 0 ? { borderTop: '1px solid var(--mantine-color-gray-2)' } : {}),
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                    }}
                  >
                    <Group gap="xs">
                      <IconCalendar size={14} color="var(--mantine-color-dimmed)" />
                      <Text size="sm" fw={600} c="dimmed">{group.label}</Text>
                      <Badge size="xs" variant="light" color="gray">{group.transactions.length}</Badge>
                    </Group>
                    <Group gap="md">
                      {group.dayTotal.credit > 0 && (
                        <Text size="xs" c="teal" fw={500}>
                          +{group.dayTotal.credit.toLocaleString('en-US', { minimumFractionDigits: 3 })}
                        </Text>
                      )}
                      {group.dayTotal.debit > 0 && (
                        <Text size="xs" c="red" fw={500}>
                          -{group.dayTotal.debit.toLocaleString('en-US', { minimumFractionDigits: 3 })}
                        </Text>
                      )}
                    </Group>
                  </Group>

                  {/* Transactions in this group */}
                  {group.transactions.map((tx) => (
                    <TransactionRow
                      key={tx.TransactionId}
                      transaction={tx}
                      runningBalance={runningBalances.get(tx.TransactionId) ?? null}
                    />
                  ))}
                </Box>
              ))}
            </Stack>
          )}
        </Card>
      </Stack>
    </Container>
  );
}
