import { Card, Group, Text, Badge, Stack, Box } from '@mantine/core';
import { IconCreditCard, IconPigMoney, IconBriefcase, IconWallet } from '@tabler/icons-react';
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

function getAccountTypeConfig(subType: string): { color: string; gradient: string; Icon: typeof IconCreditCard; label: string } {
  const st = (subType || '').toLowerCase();
  if (st.includes('saving')) {
    return { color: '#0984e3', gradient: 'linear-gradient(135deg, #0984e3, #74b9ff)', Icon: IconPigMoney, label: 'Savings' };
  }
  if (st.includes('credit')) {
    return { color: '#e17055', gradient: 'linear-gradient(135deg, #e17055, #fab1a0)', Icon: IconCreditCard, label: 'Credit Card' };
  }
  if (st.includes('business') || st.includes('commercial')) {
    return { color: '#e67e22', gradient: 'linear-gradient(135deg, #e67e22, #f9ca24)', Icon: IconBriefcase, label: 'Business' };
  }
  // Default: current account
  return { color: '#00b894', gradient: 'linear-gradient(135deg, #00b894, #55efc4)', Icon: IconWallet, label: 'Current' };
}

export default function AccountCard({ account, balance, onClick }: AccountCardProps) {
  const iban = account.Account?.[0]?.Identification;
  const accountName = account.Nickname || account.Account?.[0]?.Name || 'Account';
  const subType = account.AccountSubType || account.AccountType || '';
  const currency = account.Currency || 'OMR';
  const config = getAccountTypeConfig(subType);
  const Icon = config.Icon;

  return (
    <Card
      shadow="sm"
      padding={0}
      radius="md"
      withBorder
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        overflow: 'hidden',
        borderLeft: `4px solid ${config.color}`,
      }}
      className={onClick ? 'hover-card' : ''}
    >
      <Box p="lg">
        <Group justify="space-between" mb="md" wrap="nowrap">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <Box
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: config.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon size={22} color="white" stroke={1.8} />
            </Box>
            <Stack gap={0} style={{ minWidth: 0 }}>
              <Text fw={600} size="sm" truncate="end">{accountName}</Text>
              <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                {maskIban(iban)}
              </Text>
            </Stack>
          </Group>
          <Badge color={config.color} variant="light" size="sm" style={{ flexShrink: 0 }}>
            {config.label}
          </Badge>
        </Group>

        <Box>
          <Text size="xs" c="dimmed" mb={4}>Available Balance / الرصيد المتاح</Text>
          <Text
            size="xl"
            fw={700}
            c={balance?.CreditDebitIndicator === 'Debit' ? 'red' : 'dark'}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {balance ? formatAmount(balance.Amount.Amount, balance.Amount.Currency) : formatAmount(undefined, currency)}
          </Text>
        </Box>
      </Box>
    </Card>
  );
}
