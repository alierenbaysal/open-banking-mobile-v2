/**
 * ConsentDetail — single consent detail view with revoke capability and history timeline.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Stack,
  Title,
  Text,
  Card,
  Group,
  Button,
  Loader,
  Center,
  Badge,
  Box,
  Divider,
  Timeline,
  Modal,
  Alert,
  Paper,
  Textarea,
  Breadcrumbs,
  Anchor,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconShieldCheck,
  IconShieldOff,
  IconArrowLeft,
  IconClock,
  IconCheck,
  IconX,
  IconBuildingBank,
  IconHistory,
} from '@tabler/icons-react';
import PermissionDisplay from '@/components/PermissionDisplay';
import AccountCard from '@/components/AccountCard';
import { STATUS_CONFIG, CONSENT_TYPE_LABELS } from '@/components/ConsentCard';
import {
  getConsent,
  revokeConsent,
  getConsentHistory,
  getTPP,
  type Consent,
  type TPP,
  type ConsentHistoryEntry,
} from '@/utils/api';
import { getAccountById } from '@/utils/accounts';

export default function ConsentDetail() {
  const { consentId } = useParams<{ consentId: string }>();
  const navigate = useNavigate();

  const [consent, setConsent] = useState<Consent | null>(null);
  const [tpp, setTpp] = useState<TPP | null>(null);
  const [history, setHistory] = useState<ConsentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeOpened, { open: openRevoke, close: closeRevoke }] = useDisclosure(false);

  useEffect(() => {
    async function load() {
      if (!consentId) {
        navigate('/consents');
        return;
      }

      try {
        const [consentData, historyData] = await Promise.all([
          getConsent(consentId),
          getConsentHistory(consentId).catch(() => []),
        ]);
        setConsent(consentData);
        setHistory(historyData);

        // Load TPP details
        try {
          const tppData = await getTPP(consentData.tpp_id);
          setTpp(tppData);
        } catch {
          // Optional
        }
      } catch {
        notifications.show({
          title: 'Not Found',
          message: 'Consent not found.',
          color: 'red',
        });
        navigate('/consents');
      }

      setLoading(false);
    }
    load();
  }, [consentId, navigate]);

  const handleRevoke = async () => {
    if (!consentId) return;

    setRevoking(true);
    try {
      const updated = await revokeConsent(consentId, revokeReason || 'Customer revoked');
      setConsent(updated);
      closeRevoke();
      notifications.show({
        title: 'Consent Revoked',
        message: 'Third-party access has been removed.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      // Refresh history
      try {
        const h = await getConsentHistory(consentId);
        setHistory(h);
      } catch {
        // Non-critical
      }
    } catch (err) {
      notifications.show({
        title: 'Revocation Failed',
        message: err instanceof Error ? err.message : 'Failed to revoke consent.',
        color: 'red',
      });
    }
    setRevoking(false);
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader color="green" size="lg" />
      </Center>
    );
  }

  if (!consent) return null;

  const tppName = tpp?.tpp_name || consent.tpp_id;
  const statusConfig = STATUS_CONFIG[consent.status] || STATUS_CONFIG.AwaitingAuthorisation;
  const typeLabels = CONSENT_TYPE_LABELS[consent.consent_type] || {
    en: consent.consent_type,
    ar: '',
  };
  const StatusIcon = statusConfig.icon;
  const canRevoke = consent.status === 'Authorised';

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Stack gap="lg" maw={700} mx="auto">
      {/* Breadcrumbs */}
      <Breadcrumbs>
        <Anchor size="sm" onClick={() => navigate('/consents')}>
          Consents
        </Anchor>
        <Text size="sm" c="dimmed">
          {consent.consent_id.slice(0, 8)}...
        </Text>
      </Breadcrumbs>

      {/* Back button */}
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        onClick={() => navigate('/consents')}
        w="fit-content"
        color="gray"
      >
        Back to Consents
      </Button>

      {/* Status and TPP header */}
      <Card withBorder radius="md" padding="md">
        <Group justify="space-between" align="flex-start">
          <Group gap="md" wrap="nowrap">
            <Box
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                backgroundColor: `var(--mantine-color-${statusConfig.color}-0)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {tpp?.logo_uri ? (
                <img
                  src={tpp.logo_uri}
                  alt={tppName}
                  style={{ width: 32, height: 32, objectFit: 'contain' }}
                />
              ) : (
                <IconBuildingBank size={28} color={`var(--mantine-color-${statusConfig.color}-6)`} />
              )}
            </Box>
            <Box>
              <Text size="lg" fw={600}>
                {tppName}
              </Text>
              {tpp?.tpp_name_ar && (
                <Text size="sm" c="dimmed">
                  {tpp.tpp_name_ar}
                </Text>
              )}
              <Group gap="xs" mt={4}>
                <Badge color={statusConfig.color} variant="light" size="sm">
                  <Group gap={4}>
                    <StatusIcon size={12} />
                    {statusConfig.label}
                  </Group>
                </Badge>
                <Badge color="blue" variant="light" size="sm">
                  {typeLabels.en}
                </Badge>
              </Group>
            </Box>
          </Group>

          {canRevoke && (
            <Button
              color="red"
              variant="outline"
              size="sm"
              leftSection={<IconShieldOff size={16} />}
              onClick={openRevoke}
            >
              Revoke
            </Button>
          )}
        </Group>
      </Card>

      {/* Key dates */}
      <Card withBorder radius="md" padding="md">
        <Text fw={600} mb="sm">
          Timeline / \u0627\u0644\u062C\u062F\u0648\u0644 \u0627\u0644\u0632\u0645\u0646\u064A
        </Text>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Created
            </Text>
            <Text size="sm">
              {formatDate(consent.creation_time)}
            </Text>
          </Group>
          {consent.authorization_time && (
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Authorized
              </Text>
              <Text size="sm" c="green">
                {formatDate(consent.authorization_time)}
              </Text>
            </Group>
          )}
          {consent.expiration_time && (
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Expires
              </Text>
              <Text size="sm">
                {formatDate(consent.expiration_time)}
              </Text>
            </Group>
          )}
          {consent.revocation_time && (
            <>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Revoked
                </Text>
                <Text size="sm" c="red">
                  {formatDate(consent.revocation_time)}
                </Text>
              </Group>
              {consent.revocation_reason && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Reason
                  </Text>
                  <Text size="sm">
                    {consent.revocation_reason}
                  </Text>
                </Group>
              )}
            </>
          )}
        </Stack>
      </Card>

      {/* Consent ID */}
      <Paper p="sm" radius="md" withBorder>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Consent ID
          </Text>
          <Text size="xs" ff="monospace">
            {consent.consent_id}
          </Text>
        </Group>
      </Paper>

      {/* Permissions */}
      <Card withBorder radius="md" padding="md">
        <Text fw={600} mb="md">
          Permissions / \u0627\u0644\u0635\u0644\u0627\u062D\u064A\u0627\u062A
        </Text>
        <PermissionDisplay permissions={consent.permissions} />
      </Card>

      {/* Shared accounts */}
      {consent.selected_accounts && consent.selected_accounts.length > 0 && (
        <Card withBorder radius="md" padding="md">
          <Text fw={600} mb="md">
            Shared Accounts / \u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u0627\u0644\u0645\u0634\u062A\u0631\u0643\u0629
          </Text>
          <Stack gap="sm">
            {consent.selected_accounts.map((accountId) => {
              const account = getAccountById(accountId);
              if (account) {
                return (
                  <AccountCard key={accountId} account={account} compact />
                );
              }
              return (
                <Paper key={accountId} p="sm" radius="md" withBorder>
                  <Text size="sm" ff="monospace">
                    {accountId}
                  </Text>
                </Paper>
              );
            })}
          </Stack>
        </Card>
      )}

      {/* Audit history */}
      {history.length > 0 && (
        <Card withBorder radius="md" padding="md">
          <Group gap="xs" mb="md">
            <IconHistory size={18} color="var(--mantine-color-gray-6)" />
            <Text fw={600}>
              Audit History / \u0633\u062C\u0644 \u0627\u0644\u0645\u0631\u0627\u062C\u0639\u0629
            </Text>
          </Group>
          <Timeline active={history.length - 1} bulletSize={24} lineWidth={2}>
            {history.map((entry, index) => {
              const isPositive =
                entry.new_status === 'Authorised' || entry.event_type === 'created';
              const isNegative =
                entry.new_status === 'Rejected' || entry.new_status === 'Revoked';

              return (
                <Timeline.Item
                  key={entry.id}
                  bullet={
                    isPositive ? (
                      <IconCheck size={12} />
                    ) : isNegative ? (
                      <IconX size={12} />
                    ) : (
                      <IconClock size={12} />
                    )
                  }
                  color={isPositive ? 'green' : isNegative ? 'red' : 'blue'}
                  title={
                    <Text size="sm" fw={500}>
                      {entry.event_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Text>
                  }
                >
                  <Text size="xs" c="dimmed" mt={2}>
                    {formatDate(entry.event_time)}
                  </Text>
                  {entry.previous_status && entry.new_status && (
                    <Group gap="xs" mt={4}>
                      <Badge size="xs" variant="outline" color="gray">
                        {entry.previous_status}
                      </Badge>
                      <Text size="xs" c="dimmed">
                        &rarr;
                      </Text>
                      <Badge
                        size="xs"
                        variant="light"
                        color={isPositive ? 'green' : isNegative ? 'red' : 'blue'}
                      >
                        {entry.new_status}
                      </Badge>
                    </Group>
                  )}
                  <Text size="xs" c="dimmed" mt={2}>
                    by {entry.actor_type}
                    {entry.actor_id ? ` (${entry.actor_id})` : ''}
                  </Text>
                </Timeline.Item>
              );
            })}
          </Timeline>
        </Card>
      )}

      {/* Revoke modal */}
      <Modal
        opened={revokeOpened}
        onClose={closeRevoke}
        title="Revoke Consent"
        centered
        radius="md"
      >
        <Stack gap="md">
          <Alert
            variant="light"
            color="red"
            icon={<IconShieldOff size={16} />}
          >
            <Text size="sm">
              Revoking this consent will immediately stop{' '}
              <strong>{tppName}</strong> from accessing your account data.
              This action cannot be undone.
            </Text>
          </Alert>

          <Text size="sm" c="dimmed">
            {'\u0625\u0644\u063A\u0627\u0621 \u0647\u0630\u0647 \u0627\u0644\u0645\u0648\u0627\u0641\u0642\u0629 \u0633\u064A\u0648\u0642\u0641 \u0648\u0635\u0648\u0644 \u0627\u0644\u0637\u0631\u0641 \u0627\u0644\u062E\u0627\u0631\u062C\u064A \u0625\u0644\u0649 \u0628\u064A\u0627\u0646\u0627\u062A \u062D\u0633\u0627\u0628\u0643 \u0641\u0648\u0631\u064B\u0627.'}
          </Text>

          <Textarea
            label="Reason (optional)"
            placeholder="Why are you revoking this consent?"
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.currentTarget.value)}
            rows={3}
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={closeRevoke}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleRevoke}
              loading={revoking}
              leftSection={<IconShieldOff size={16} />}
            >
              Revoke Access
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
