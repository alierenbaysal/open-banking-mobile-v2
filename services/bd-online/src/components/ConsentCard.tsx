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
    labelAr: '\u0642\u064A\u062F \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631',
    color: 'yellow',
    icon: IconClock,
  },
  Authorised: {
    label: 'Active',
    labelAr: '\u0646\u0634\u0637',
    color: 'green',
    icon: IconShieldCheck,
  },
  Rejected: {
    label: 'Rejected',
    labelAr: '\u0645\u0631\u0641\u0648\u0636',
    color: 'red',
    icon: IconX,
  },
  Consumed: {
    label: 'Consumed',
    labelAr: '\u0645\u0633\u062A\u062E\u062F\u0645',
    color: 'gray',
    icon: IconCheck,
  },
  Revoked: {
    label: 'Revoked',
    labelAr: '\u0645\u0644\u063A\u0649',
    color: 'orange',
    icon: IconShieldOff,
  },
  Expired: {
    label: 'Expired',
    labelAr: '\u0645\u0646\u062A\u0647\u064A',
    color: 'gray',
    icon: IconBan,
  },
};

const CONSENT_TYPE_LABELS: Record<string, { en: string; ar: string }> = {
  'account-access': {
    en: 'Account Information',
    ar: '\u0645\u0639\u0644\u0648\u0645\u0627\u062A \u0627\u0644\u062D\u0633\u0627\u0628',
  },
  'domestic-payment': {
    en: 'Payment',
    ar: '\u062F\u0641\u0639',
  },
  'scheduled-payment': {
    en: 'Scheduled Payment',
    ar: '\u062F\u0641\u0639 \u0645\u062C\u062F\u0648\u0644',
  },
  'standing-order': {
    en: 'Standing Order',
    ar: '\u0623\u0645\u0631 \u062F\u0627\u0626\u0645',
  },
  'domestic-vrp': {
    en: 'Variable Recurring Payment',
    ar: '\u062F\u0641\u0639 \u0645\u062A\u0643\u0631\u0631 \u0645\u062A\u063A\u064A\u0631',
  },
  'funds-confirmation': {
    en: 'Funds Confirmation',
    ar: '\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0623\u0645\u0648\u0627\u0644',
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

  const createdDate = new Date(consent.creation_time).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

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
          Permissions / \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A
        </Text>
        <Text size="xs" lineClamp={1}>
          {getPermissionSummary(consent.permissions)}
        </Text>
      </Box>

      <Group justify="space-between" mt="sm">
        <Text size="xs" c="dimmed">
          Created: {createdDate}
        </Text>
        {expiryDate && (
          <Text size="xs" c="dimmed">
            Expires: {expiryDate}
          </Text>
        )}
      </Group>

      {consent.selected_accounts && consent.selected_accounts.length > 0 && (
        <Text size="xs" c="dimmed" mt={4}>
          {consent.selected_accounts.length} account{consent.selected_accounts.length > 1 ? 's' : ''} shared
        </Text>
      )}
    </Card>
  );
}

export { STATUS_CONFIG, CONSENT_TYPE_LABELS };
