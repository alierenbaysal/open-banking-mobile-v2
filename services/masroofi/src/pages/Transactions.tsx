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
import { IconSearch, IconAlertCircle, IconArrowLeft, IconFilter } from '@tabler/icons-react';
import { getTransactions, getAllTransactions, getAccount } from '@/utils/api';
import type { OBTransaction } from '@/utils/api';
import { isBankConnected } from '@/utils/consent';
import TransactionRow from '@/components/TransactionRow';
import EmptyState from '@/components/EmptyState';

type FilterType = 'all' | 'credit' | 'debit';

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

    // Filter by credit/debit
    if (filter === 'credit') {
      result = result.filter((t) => t.CreditDebitIndicator === 'Credit');
    } else if (filter === 'debit') {
      result = result.filter((t) => t.CreditDebitIndicator === 'Debit');
    }

    // Filter by search text
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) =>
        (t.TransactionInformation || '').toLowerCase().includes(q) ||
        t.Amount.Amount.includes(q) ||
        t.TransactionId.toLowerCase().includes(q)
      );
    }

    // Filter by date range
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

    // Sort by date descending
    result = [...result].sort(
      (a, b) => new Date(b.BookingDateTime).getTime() - new Date(a.BookingDateTime).getTime()
    );

    return result;
  }, [transactions, filter, search, dateRange]);

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
            {accountId ? `Transactions` : 'All Transactions'}
          </Title>
          <Text size="sm" c="dimmed">
            {accountId && account
              ? `${account.Nickname || 'Account'} - ${account.Account?.[0]?.Identification || ''}`
              : 'المعاملات - All accounts'}
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
        <Group gap="xl">
          <Group gap="xs">
            <Text size="sm" c="dimmed">Showing:</Text>
            <Badge color="gray" variant="light">{filtered.length} transactions</Badge>
          </Group>
          <Group gap="xs">
            <Text size="sm" c="dimmed">Income:</Text>
            <Text size="sm" fw={600} c="teal">
              +{totalCredit.toLocaleString('en-US', { minimumFractionDigits: 3 })}
            </Text>
          </Group>
          <Group gap="xs">
            <Text size="sm" c="dimmed">Expenses:</Text>
            <Text size="sm" fw={600} c="red">
              -{totalDebit.toLocaleString('en-US', { minimumFractionDigits: 3 })}
            </Text>
          </Group>
        </Group>

        {/* Transaction List */}
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
              {filtered.map((tx) => (
                <TransactionRow key={tx.TransactionId} transaction={tx} />
              ))}
            </Stack>
          )}
        </Card>
      </Stack>
    </Container>
  );
}
