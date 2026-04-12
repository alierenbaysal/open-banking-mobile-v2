/**
 * AccountPicker — multi-select accounts for consent authorization.
 * Highlights selected accounts with a check mark.
 */

import { Card, Group, Text, Checkbox, Stack, Box, Badge, Alert } from '@mantine/core';
import { IconWallet, IconInfoCircle } from '@tabler/icons-react';
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

interface AccountPickerProps {
  accounts: BankAccount[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  minSelect?: number;
}

export default function AccountPicker({
  accounts,
  selectedIds,
  onChange,
  minSelect = 1,
}: AccountPickerProps) {
  const toggleAccount = (accountId: string) => {
    if (selectedIds.includes(accountId)) {
      onChange(selectedIds.filter((id) => id !== accountId));
    } else {
      onChange([...selectedIds, accountId]);
    }
  };

  return (
    <Stack gap="sm">
      <Alert
        icon={<IconInfoCircle size={16} />}
        color="blue"
        variant="light"
        radius="md"
      >
        <Text size="sm">
          Select at least {minSelect} account{minSelect > 1 ? 's' : ''} to share with this service provider.
        </Text>
        <Text size="xs" c="dimmed" mt={2}>
          \u0627\u062E\u062A\u0631 \u062D\u0633\u0627\u0628\u064B\u0627 \u0648\u0627\u062D\u062F\u064B\u0627 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0644\u0644\u0645\u0634\u0627\u0631\u0643\u0629 \u0645\u0639 \u0645\u0632\u0648\u062F \u0627\u0644\u062E\u062F\u0645\u0629.
        </Text>
      </Alert>

      {accounts.map((account) => {
        const isSelected = selectedIds.includes(account.accountId);
        const color = TYPE_COLORS[account.type] || 'gray';

        return (
          <Card
            key={account.accountId}
            withBorder
            padding="md"
            radius="md"
            onClick={() => toggleAccount(account.accountId)}
            style={{
              cursor: 'pointer',
              borderColor: isSelected ? '#4D9134' : undefined,
              borderWidth: isSelected ? 2 : 1,
              backgroundColor: isSelected ? '#f0f9ed' : undefined,
              transition: 'all 150ms ease',
            }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Group gap="md" wrap="nowrap">
                <Checkbox
                  checked={isSelected}
                  onChange={() => toggleAccount(account.accountId)}
                  color="green"
                  radius="sm"
                />
                <Box
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: `var(--mantine-color-${color}-0)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <IconWallet size={20} color={`var(--mantine-color-${color}-6)`} />
                </Box>
                <Box>
                  <Text size="sm" fw={500}>
                    {account.description}
                  </Text>
                  <Text size="xs" c="dimmed" ff="monospace">
                    {maskIban(account.iban)}
                  </Text>
                  <Badge size="xs" color={color} variant="light" mt={4}>
                    {TYPE_LABELS[account.type]}
                  </Badge>
                </Box>
              </Group>
              <Box ta="right">
                <Text size="sm" fw={600}>
                  {formatBalance(account.balance, account.currency)}
                </Text>
                <Text size="xs" c="dimmed">
                  {account.currency}
                </Text>
              </Box>
            </Group>
          </Card>
        );
      })}

      {selectedIds.length < minSelect && (
        <Text size="xs" c="red">
          Please select at least {minSelect} account to continue.
        </Text>
      )}
    </Stack>
  );
}
