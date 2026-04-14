/**
 * AccountCard — displays a bank account with masked IBAN, balance, and type badge.
 */

import { Card, Group, Text, Badge, Box } from '@mantine/core';
import { IconWallet } from '@tabler/icons-react';
import { type BankAccount, maskIban, formatBalance } from '@/utils/accounts';

const TYPE_COLORS: Record<string, string> = {
  CurrentAccount: 'green',
  SavingsAccount: 'blue',
  BusinessAccount: 'grape',
};

const TYPE_LABELS: Record<string, string> = {
  CurrentAccount: 'Current',
  SavingsAccount: 'Savings',
  BusinessAccount: 'Business',
};

interface AccountCardProps {
  account: BankAccount;
  compact?: boolean;
}

export default function AccountCard({ account, compact = false }: AccountCardProps) {
  const color = TYPE_COLORS[account.type] || 'gray';
  const typeLabel = TYPE_LABELS[account.type] || account.type;

  if (compact) {
    return (
      <Card withBorder padding="sm" radius="md">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Box
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: `var(--mantine-color-${color}-0)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconWallet size={18} color={`var(--mantine-color-${color}-6)`} />
            </Box>
            <Box>
              <Text size="sm" fw={500}>
                {account.description}
              </Text>
              <Text size="xs" c="dimmed" ff="monospace">
                {maskIban(account.iban)}
              </Text>
            </Box>
          </Group>
          <Box ta="right">
            <Text size="sm" fw={600}>
              {formatBalance(account.balance, account.currency)}
            </Text>
            <Badge size="xs" color={color} variant="light">
              {typeLabel}
            </Badge>
          </Box>
        </Group>
      </Card>
    );
  }

  return (
    <Card withBorder padding="md" radius="md" shadow="sm">
      <Group justify="space-between" mb="xs">
        <Group gap="sm">
          <Box
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: `var(--mantine-color-${color}-0)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconWallet size={22} color={`var(--mantine-color-${color}-6)`} />
          </Box>
          <Text fw={600} size="sm">
            {account.description}
          </Text>
        </Group>
        <Badge color={color} variant="light" size="sm">
          {typeLabel}
        </Badge>
      </Group>

      <Box
        style={{
          backgroundColor: '#f8f9fa',
          borderRadius: 8,
          padding: '12px 14px',
        }}
      >
        <Text size="xs" c="dimmed" mb={4}>
          IBAN
        </Text>
        <Text size="sm" ff="monospace" mb="sm">
          {maskIban(account.iban)}
        </Text>
        <Text size="xs" c="dimmed" mb={4}>
          Available Balance
        </Text>
        <Text size="xl" fw={700} c="dark">
          {formatBalance(account.balance, account.currency)}
        </Text>
      </Box>
    </Card>
  );
}
