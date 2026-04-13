/**
 * ConsentCard — compact summary card for a consent in list view.
 */

import { Card, Group, Text, Badge, Box, Stack } from '@mantine/core';
import {
  IconShieldCheck,
  IconShieldOff,
  IconClock,
  IconCheck,
  IconX,
  IconBan,
} from '@tabler/icons-react';
import { type Consent, type ConsentStatus } from '@/utils/api';
import { getPermissionSummary } from './PermissionDisplay';

const STATUS_CONFIG: Record<
  ConsentStatus,
  { label: string; labelAr: string; color: string; icon: typeof IconCheck }
> = {
  AwaitingAuthorisation: {
    label: 'Pending',
    labelAr: 'قيد الانتظار',
    color: 'yellow',
    icon: IconClock,
  },
  Authorised: {
    label: 'Active',
    labelAr: 'نشط',
    color: 'green',
    icon: IconShieldCheck,
  },
  Rejected: {
    label: 'Rejected',
    labelAr: 'مرفوض',
    color: 'red',
    icon: IconX,
  },
  Consumed: {
    label: 'Consumed',
    labelAr: 'مستخدم',
    color: 'gray',
    icon: IconCheck,
  },
  Revoked: {
    label: 'Revoked',
    labelAr: 'ملغى',
    color: 'orange',
    icon: IconShieldOff,
  },
  Expired: {
    label: 'Expired',
    labelAr: 'منتهي',
    color: 'gray',
    icon: IconBan,
  },
};

const CONSENT_TYPE_LABELS: Record<string, { en: string; ar: string }> = {
  'account-access': {
    en: 'Account Information',
    ar: 'معلومات الحساب',
  },
  'domestic-payment': {
    en: 'Payment',
    ar: 'دفع',
  },
  'scheduled-payment': {
    en: 'Scheduled Payment',
    ar: 'دفع مجدول',
  },
  'standing-order': {
    en: 'Standing Order',
    ar: 'أمر دائم',
  },
  'domestic-vrp': {
    en: 'Variable Recurring Payment',
    ar: 'دفع متكرر متغير',
  },
  'funds-confirmation': {
    en: 'Funds Confirmation',
    ar: 'تأكيد الأموال',
  },
};

interface ConsentCardProps {
  consent: Consent;
  tppName?: string;
  onClick?: () => void;
}

export default function ConsentCard({ consent, tppName, onClick }: ConsentCardProps) {
  const statusConfig = STATUS_CONFIG[consent.status] || STATUS_CONFIG.AwaitingAuthorisation;
  const typeLabels = CONSENT_TYPE_LABELS[consent.consent_type] || {
    en: consent.consent_type,
    ar: '',
  };
  const StatusIcon = statusConfig.icon;

  const createdDate = consent.creation_time
    ? new Date(consent.creation_time).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const expiryDate = consent.expiration_time
    ? new Date(consent.expiration_time).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <Card
      withBorder
      padding="md"
      radius="md"
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 150ms ease',
      }}
      className={onClick ? 'consent-card-hover' : undefined}
    >
      <Group justify="space-between" mb="sm">
        <Group gap="sm">
          <Box
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              backgroundColor: `var(--mantine-color-${statusConfig.color}-0)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <StatusIcon size={20} color={`var(--mantine-color-${statusConfig.color}-6)`} />
          </Box>
          <Stack gap={2}>
            <Text size="sm" fw={600}>
              {tppName || consent.tpp_id}
            </Text>
            <Group gap="xs">
              <Badge size="xs" variant="light" color="blue">
                {typeLabels.en}
              </Badge>
              <Badge size="xs" variant="light" color={statusConfig.color}>
                {statusConfig.label}
              </Badge>
            </Group>
          </Stack>
        </Group>
      </Group>

      <Box
        style={{
          backgroundColor: '#f8f9fa',
          borderRadius: 6,
          padding: '8px 10px',
        }}
      >
        <Text size="xs" c="dimmed" mb={2}>
          Permissions / الصلاحيات
        </Text>
        <Text size="xs" lineClamp={1}>
          {getPermissionSummary(consent.permissions || [])}
        </Text>
      </Box>

      <Group justify="space-between" mt="sm">
        {createdDate && (
          <Text size="xs" c="dimmed">
            Created: {createdDate}
          </Text>
        )}
        {expiryDate && (
          <Text size="xs" c="dimmed">
            Expires: {expiryDate}
          </Text>
        )}
      </Group>

      {consent.selected_accounts?.length ? (
        <Text size="xs" c="dimmed" mt={4}>
          {consent.selected_accounts.length} account{consent.selected_accounts.length > 1 ? 's' : ''} shared
        </Text>
      ) : null}
    </Card>
  );
}

export { STATUS_CONFIG, CONSENT_TYPE_LABELS };
