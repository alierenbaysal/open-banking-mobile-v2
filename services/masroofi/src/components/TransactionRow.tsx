import { Group, Text, Box, Badge } from '@mantine/core';
import { IconArrowUpRight, IconArrowDownLeft } from '@tabler/icons-react';
import type { OBTransaction } from '@/utils/api';
import { categorizeTransaction } from '@/utils/categories';

interface TransactionRowProps {
  transaction: OBTransaction;
  showAccount?: boolean;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatAmount(amount: string, currency: string): string {
  const num = parseFloat(amount);
  return `${num.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${currency}`;
}

export default function TransactionRow({ transaction, showAccount }: TransactionRowProps) {
  const isCredit = transaction.CreditDebitIndicator === 'Credit';
  const category = categorizeTransaction(transaction.TransactionInformation);
  const description = transaction.TransactionInformation || 'Transaction';

  return (
    <Group
      justify="space-between"
      py="sm"
      px="md"
      style={{
        borderBottom: '1px solid var(--mantine-color-gray-2)',
        transition: 'background 0.15s',
      }}
    >
      <Group gap="sm" style={{ flex: 1, minWidth: 0 }}>
        <Box
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: isCredit ? '#e8f8f5' : '#fef0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {isCredit ? (
            <IconArrowDownLeft size={18} color="#00b894" />
          ) : (
            <IconArrowUpRight size={18} color="#e17055" />
          )}
        </Box>
        <Box style={{ minWidth: 0, flex: 1 }}>
          <Text size="sm" fw={500} truncate="end">{description}</Text>
          <Group gap={6}>
            <Text size="xs" c="dimmed">{formatDate(transaction.BookingDateTime)}</Text>
            <Badge
              size="xs"
              variant="dot"
              color={category.color}
              styles={{ root: { textTransform: 'none' } }}
            >
              {category.name}
            </Badge>
          </Group>
        </Box>
      </Group>

      <Text
        size="sm"
        fw={600}
        c={isCredit ? 'teal' : 'red'}
        style={{ whiteSpace: 'nowrap' }}
      >
        {isCredit ? '+' : '-'}{formatAmount(transaction.Amount.Amount, transaction.Amount.Currency)}
      </Text>
    </Group>
  );
}
