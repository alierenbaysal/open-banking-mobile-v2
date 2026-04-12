import { Card, Group, Text, Badge, Stack, Box } from '@mantine/core';
import { IconCreditCard } from '@tabler/icons-react';
import type { OBAccount, OBBalance } from '@/utils/api';

interface AccountCardProps {
  account: OBAccount;
  balance?: OBBalance;
  onClick?: () => void;
}

function maskIban(iban: string | undefined): string {
  if (!iban || iban.length < 8) return iban || '---';
  return `${iban.slice(0, 4)} **** **** ${iban.slice(-4)}`;
}

function formatAmount(amount: string | undefined, currency: string): string {
  if (!amount) return `0.000 ${currency}`;
  const num = parseFloat(amount);
  return `${num.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${currency}`;
}

function getAccountTypeColor(subType: string): string {
  switch (subType?.toLowerCase()) {
    case 'currentaccount':
    case 'current':
      return 'violet';
    case 'savings':
    case 'savingsaccount':
      return 'teal';
    case 'creditcard':
      return 'orange';
    default:
      return 'gray';
  }
}

export default function AccountCard({ account, balance, onClick }: AccountCardProps) {
  const iban = account.Account?.[0]?.Identification;
  const accountName = account.Nickname || account.Account?.[0]?.Name || 'Account';
  const subType = account.AccountSubType || account.AccountType || '';
  const currency = account.Currency || 'OMR';

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', transition: 'box-shadow 0.2s' }}
      className={onClick ? 'hover-card' : ''}
    >
      <Group justify="space-between" mb="sm">
        <Group gap="sm">
          <Box
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconCreditCard size={22} color="white" />
          </Box>
          <Stack gap={0}>
            <Text fw={600} size="sm">{accountName}</Text>
            <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>
              {maskIban(iban)}
            </Text>
          </Stack>
        </Group>
        <Badge color={getAccountTypeColor(subType)} variant="light" size="sm">
          {subType || 'Account'}
        </Badge>
      </Group>

      <Box mt="md">
        <Text size="xs" c="dimmed" mb={4}>Available Balance</Text>
        <Text
          size="xl"
          fw={700}
          c={balance?.CreditDebitIndicator === 'Debit' ? 'red' : 'dark'}
        >
          {balance ? formatAmount(balance.Amount.Amount, balance.Amount.Currency) : formatAmount(undefined, currency)}
        </Text>
      </Box>
    </Card>
  );
}
