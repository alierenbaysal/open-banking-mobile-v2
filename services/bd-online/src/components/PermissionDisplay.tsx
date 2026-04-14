/**
 * PermissionDisplay — renders OBIE permissions in human-readable English.
 */

import { Box, Group, Text, ThemeIcon, Stack, Paper } from '@mantine/core';
import {
  IconEye,
  IconCreditCard,
  IconReceipt,
  IconUsers,
  IconBuildingBank,
  IconShieldCheck,
  IconCalendar,
  IconFileText,
} from '@tabler/icons-react';

interface PermissionInfo {
  label: string;
  description: string;
  icon: typeof IconEye;
  color: string;
  category: string;
}

/**
 * OBIE permission code to human-readable mapping.
 */
const PERMISSION_MAP: Record<string, PermissionInfo> = {
  // Account Information
  ReadAccountsBasic: {
    label: 'View Account Names',
    description: 'See your account names and types',
    icon: IconBuildingBank,
    color: 'blue',
    category: 'Account Information',
  },
  ReadAccountsDetail: {
    label: 'View Account Details',
    description: 'See your account numbers, sort codes, and IBANs',
    icon: IconBuildingBank,
    color: 'blue',
    category: 'Account Information',
  },
  ReadBalances: {
    label: 'View Balances',
    description: 'See your current account balances',
    icon: IconCreditCard,
    color: 'green',
    category: 'Account Information',
  },
  ReadTransactionsBasic: {
    label: 'View Transaction History',
    description: 'See your transaction amounts and dates',
    icon: IconReceipt,
    color: 'orange',
    category: 'Transactions',
  },
  ReadTransactionsDetail: {
    label: 'View Transaction Details',
    description: 'See full transaction details including merchant names',
    icon: IconReceipt,
    color: 'orange',
    category: 'Transactions',
  },
  ReadTransactionsCredits: {
    label: 'View Credit Transactions',
    description: 'See incoming payments and credits',
    icon: IconReceipt,
    color: 'teal',
    category: 'Transactions',
  },
  ReadTransactionsDebits: {
    label: 'View Debit Transactions',
    description: 'See outgoing payments and debits',
    icon: IconReceipt,
    color: 'red',
    category: 'Transactions',
  },
  ReadBeneficiariesBasic: {
    label: 'View Saved Payees',
    description: 'See your saved payee names',
    icon: IconUsers,
    color: 'grape',
    category: 'Beneficiaries',
  },
  ReadBeneficiariesDetail: {
    label: 'View Payee Details',
    description: 'See your saved payee account details',
    icon: IconUsers,
    color: 'grape',
    category: 'Beneficiaries',
  },
  ReadDirectDebits: {
    label: 'View Direct Debits',
    description: 'See your direct debit mandates',
    icon: IconFileText,
    color: 'cyan',
    category: 'Standing Arrangements',
  },
  ReadStandingOrdersBasic: {
    label: 'View Standing Orders',
    description: 'See your standing order amounts and schedules',
    icon: IconCalendar,
    color: 'indigo',
    category: 'Standing Arrangements',
  },
  ReadStandingOrdersDetail: {
    label: 'View Standing Order Details',
    description: 'See full standing order details including payee info',
    icon: IconCalendar,
    color: 'indigo',
    category: 'Standing Arrangements',
  },
  ReadProducts: {
    label: 'View Product Information',
    description: 'See your account product details and features',
    icon: IconShieldCheck,
    color: 'lime',
    category: 'Account Information',
  },
  ReadOffers: {
    label: 'View Account Offers',
    description: 'See available offers on your accounts',
    icon: IconShieldCheck,
    color: 'yellow',
    category: 'Account Information',
  },
  ReadParty: {
    label: 'View Personal Information',
    description: 'See your name, address, and contact details',
    icon: IconUsers,
    color: 'pink',
    category: 'Personal Information',
  },
  ReadPartyPSU: {
    label: 'View Identity Details',
    description: 'See your identity verification details',
    icon: IconUsers,
    color: 'pink',
    category: 'Personal Information',
  },
  ReadScheduledPaymentsBasic: {
    label: 'View Scheduled Payments',
    description: 'See your upcoming scheduled payments',
    icon: IconCalendar,
    color: 'violet',
    category: 'Payments',
  },
  ReadScheduledPaymentsDetail: {
    label: 'View Scheduled Payment Details',
    description: 'See full details of scheduled payments',
    icon: IconCalendar,
    color: 'violet',
    category: 'Payments',
  },
  ReadStatementsBasic: {
    label: 'View Statement Summaries',
    description: 'See your statement dates and totals',
    icon: IconFileText,
    color: 'gray',
    category: 'Statements',
  },
  ReadStatementsDetail: {
    label: 'View Full Statements',
    description: 'See your complete bank statements',
    icon: IconFileText,
    color: 'gray',
    category: 'Statements',
  },
  ReadPAN: {
    label: 'View Card Numbers',
    description: 'See your full card numbers (PAN)',
    icon: IconCreditCard,
    color: 'red',
    category: 'Cards',
  },
};

interface PermissionDisplayProps {
  permissions: string[];
  compact?: boolean;
}

export default function PermissionDisplay({ permissions, compact = false }: PermissionDisplayProps) {
  // Group permissions by category
  const grouped = new Map<string, { permission: string; info: PermissionInfo }[]>();

  for (const perm of permissions) {
    const info = PERMISSION_MAP[perm];
    if (!info) continue;
    const existing = grouped.get(info.category) || [];
    existing.push({ permission: perm, info });
    grouped.set(info.category, existing);
  }

  // Handle unknown permissions
  const unknownPerms = permissions.filter((p) => !PERMISSION_MAP[p]);

  if (compact) {
    return (
      <Stack gap={4}>
        {permissions.map((perm) => {
          const info = PERMISSION_MAP[perm];
          return (
            <Group key={perm} gap="xs" wrap="nowrap">
              <ThemeIcon
                size="xs"
                color={info?.color || 'gray'}
                variant="light"
                radius="sm"
              >
                {info ? <info.icon size={10} /> : <IconEye size={10} />}
              </ThemeIcon>
              <Text size="xs">
                {info?.label || perm}
              </Text>
            </Group>
          );
        })}
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      {Array.from(grouped.entries()).map(([category, items]) => (
        <Box key={category}>
          <Text size="sm" fw={600} c="dimmed" mb="xs">
            {category}
          </Text>
          <Stack gap="xs">
            {items.map(({ permission, info }) => (
              <Paper key={permission} p="sm" radius="md" withBorder>
                <Group gap="sm" wrap="nowrap">
                  <ThemeIcon
                    size="md"
                    color={info.color}
                    variant="light"
                    radius="md"
                  >
                    <info.icon size={16} />
                  </ThemeIcon>
                  <Box style={{ flex: 1 }}>
                    <Text size="sm" fw={500}>
                      {info.label}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {info.description}
                    </Text>
                  </Box>
                </Group>
              </Paper>
            ))}
          </Stack>
        </Box>
      ))}

      {unknownPerms.length > 0 && (
        <Box>
          <Text size="sm" fw={600} c="dimmed" mb="xs">
            Other Permissions
          </Text>
          <Stack gap="xs">
            {unknownPerms.map((perm) => (
              <Paper key={perm} p="sm" radius="md" withBorder>
                <Group gap="sm">
                  <ThemeIcon size="md" color="gray" variant="light" radius="md">
                    <IconShieldCheck size={16} />
                  </ThemeIcon>
                  <Text size="sm" ff="monospace">
                    {perm}
                  </Text>
                </Group>
              </Paper>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}

/** Get a short summary of permissions for card display. */
export function getPermissionSummary(permissions: string[]): string {
  const categories = new Set<string>();
  for (const perm of permissions) {
    const info = PERMISSION_MAP[perm];
    if (info) categories.add(info.category);
  }
  if (categories.size === 0) return `${permissions.length} permission(s)`;
  return Array.from(categories).join(', ');
}
