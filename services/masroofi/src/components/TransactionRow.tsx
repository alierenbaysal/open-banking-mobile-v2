import { Group, Text, Box, Badge } from '@mantine/core';
import {
  IconArrowUpRight,
  IconArrowDownLeft,
  IconBuildingBank,
  IconCash,
  IconCreditCard,
  IconReceipt,
  IconWorldWww,
} from '@tabler/icons-react';
import type { OBTransaction } from '@/utils/api';
import { categorizeTransaction, getCategoryEmoji } from '@/utils/categories';

interface TransactionRowProps {
  transaction: OBTransaction;
  showAccount?: boolean;
  runningBalance?: number | null;
}

function formatAmount(amount: string, currency: string): string {
  const num = parseFloat(amount);
  return `${num.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${currency}`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/** Pick an icon based on transaction description keywords. */
function getTransactionIcon(description: string | undefined, isCredit: boolean) {
  const desc = (description || '').toLowerCase();
  if (/salary|payroll|wage/i.test(desc)) return IconCash;
  if (/pos|point.?of.?sale|card/i.test(desc)) return IconCreditCard;
  if (/transfer|remittance|swift/i.test(desc)) return IconBuildingBank;
  if (/online|amazon|netflix|digital|app/i.test(desc)) return IconWorldWww;
  if (/bill|payment|utility/i.test(desc)) return IconReceipt;
  return isCredit ? IconArrowDownLeft : IconArrowUpRight;
}

export default function TransactionRow({ transaction, showAccount, runningBalance }: TransactionRowProps) {
  const isCredit = transaction.CreditDebitIndicator === 'Credit';
  const category = categorizeTransaction(transaction.TransactionInformation);
  const description = transaction.TransactionInformation || 'Transaction';
  const emoji = getCategoryEmoji(category.id);
  const Icon = getTransactionIcon(transaction.TransactionInformation, isCredit);

  return (
    <Group
      justify="space-between"
      py="sm"
      px="md"
      style={{
        borderBottom: '1px solid var(--mantine-color-gray-1)',
        transition: 'background 0.15s',
        cursor: 'default',
      }}
      wrap="nowrap"
    >
      {/* Left: icon + info */}
      <Group gap="sm" style={{ flex: 1, minWidth: 0 }} wrap="nowrap">
        <Box
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: isCredit
              ? 'linear-gradient(135deg, #e8f8f5, #b8f0e0)'
              : `linear-gradient(135deg, ${category.color}15, ${category.color}30)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={18} color={isCredit ? '#00b894' : category.color} stroke={1.8} />
        </Box>

        <Box style={{ minWidth: 0, flex: 1 }}>
          <Text size="sm" fw={500} truncate="end">{description}</Text>
          <Group gap={6} wrap="nowrap">
            <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
              {formatDate(transaction.BookingDateTime)}
            </Text>
            <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
              {formatTime(transaction.BookingDateTime)}
            </Text>
            <Badge
              size="xs"
              variant="light"
              color={category.color}
              styles={{ root: { textTransform: 'none', fontWeight: 500 } }}
            >
              {emoji} {category.name}
            </Badge>
          </Group>
        </Box>
      </Group>

      {/* Right: amount + running balance */}
      <Box style={{ textAlign: 'right', flexShrink: 0 }}>
        <Text
          size="sm"
          fw={700}
          c={isCredit ? 'teal' : 'red'}
          style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
        >
          {isCredit ? '+' : '-'}{formatAmount(transaction.Amount.Amount, transaction.Amount.Currency)}
        </Text>
        {runningBalance != null && (
          <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
            Bal: {runningBalance.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} {transaction.Amount.Currency}
          </Text>
        )}
      </Box>
    </Group>
  );
}
