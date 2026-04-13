/**
 * ConsentApproval — THE key page in the OAuth2 consent authorization flow.
 *
 * URL: /consent/approve?consent_id=xxx&redirect_uri=xxx&state=xxx&client_id=xxx
 *
 * Flow:
 * 1. Fetches consent from consent-service
 * 2. Fetches TPP info
 * 3. Shows TPP name, permissions, account picker
 * 4. Customer approves or rejects
 * 5. Redirects back to fintech with auth code or error
 */

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Stack,
  Title,
  Text,
  Card,
  Group,
  Button,
  Loader,
  Center,
  Alert,
  Box,
  Divider,
  Badge,
  Paper,
  Modal,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconShieldCheck,
  IconShieldOff,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconBuildingBank,
  IconArrowRight,
  IconCurrencyRiyal,
} from '@tabler/icons-react';
import AccountPicker from '@/components/AccountPicker';
import PermissionDisplay from '@/components/PermissionDisplay';
import { getUser, getDisplayName, getEmail, type User } from '@/utils/auth';
import {
  getConsent,
  authorizeConsent,
  rejectConsent,
  getTPP,
  type Consent,
  type TPP,
} from '@/utils/api';
import {
  getCustomerAccounts,
  resolveCustomerId,
  formatBalance,
  type BankAccount,
} from '@/utils/accounts';
import { CONSENT_TYPE_LABELS } from '@/components/ConsentCard';

export default function ConsentApproval() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const consentId = searchParams.get('consent_id');
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');

  const [consent, setConsent] = useState<Consent | null>(null);
  const [tpp, setTpp] = useState<TPP | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [customerId, setCustomerId] = useState<string>('');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectOpened, { open: openReject, close: closeReject }] = useDisclosure(false);

  useEffect(() => {
    async function load() {
      // Verify user is authenticated
      const u = await getUser();
      if (!u) {
        // Redirect to login, preserving consent params
        const params = new URLSearchParams();
        if (consentId) params.set('consent_id', consentId);
        if (redirectUri) params.set('redirect_uri', redirectUri);
        if (state) params.set('state', state);
        navigate(`/login?${params.toString()}`);
        return;
      }
      setUser(u);

      const email = getEmail(u);
      const custId = u.customer_id || resolveCustomerId(email || String(u.profile.sub || u.sub));
      setCustomerId(custId);
      setAccounts(getCustomerAccounts(custId));

      if (!consentId) {
        setError('No consent ID provided. Please start the authorization flow from your service provider.');
        setLoading(false);
        return;
      }

      try {
        // Fetch consent details
        const consentData = await getConsent(consentId);
        setConsent(consentData);

        // Verify consent is in the right state
        if (consentData.status !== 'AwaitingAuthorisation') {
          setError(
            `This consent has already been ${consentData.status.toLowerCase()}. No action is needed.`,
          );
          setLoading(false);
          return;
        }

        // Fetch TPP info
        try {
          const tppData = await getTPP(consentData.tpp_id);
          setTpp(tppData);
        } catch {
          // TPP info is nice-to-have, not critical
        }
      } catch (err) {
        setError('Unable to load consent details. The consent may not exist or has expired.');
      }

      setLoading(false);
    }

    load();
  }, [consentId, redirectUri, state, navigate]);

  const handleRedirect = useCallback(
    (authCode?: string, errorCode?: string) => {
      if (!redirectUri) {
        // No redirect URI — stay on the page
        navigate('/dashboard');
        return;
      }

      const url = new URL(redirectUri);
      if (authCode) {
        url.searchParams.set('code', authCode);
      }
      if (errorCode) {
        url.searchParams.set('error', errorCode);
      }
      if (state) {
        url.searchParams.set('state', state);
      }
      window.location.href = url.toString();
    },
    [redirectUri, state, navigate],
  );

  const handleApprove = async () => {
    if (!consent || !consentId) return;

    // For AIS consents, require at least one account
    if (consent.consent_type === 'account-access' && selectedAccounts.length === 0) {
      notifications.show({
        title: 'Select Accounts',
        message: 'Please select at least one account to share.',
        color: 'yellow',
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await authorizeConsent(consentId, {
        customer_id: customerId,
        selected_accounts: selectedAccounts.length > 0 ? selectedAccounts : undefined,
      });

      notifications.show({
        title: 'Consent Approved',
        message: 'You have authorized access to your account information.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });

      // Generate a pseudo auth code from the consent ID for the redirect
      // In production, the consent service would return a real authorization code
      const authCode = `authz_${consentId?.slice(0, 8)}`;
      handleRedirect(authCode);
    } catch (err) {
      notifications.show({
        title: 'Authorization Failed',
        message: err instanceof Error ? err.message : 'Failed to authorize consent.',
        color: 'red',
      });
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!consent || !consentId) return;

    setSubmitting(true);
    closeReject();
    try {
      await rejectConsent(consentId, {
        customer_id: customerId,
        reason: 'Customer declined',
      });

      notifications.show({
        title: 'Consent Rejected',
        message: 'You have declined this consent request.',
        color: 'orange',
        icon: <IconX size={16} />,
      });

      handleRedirect(undefined, 'access_denied');
    } catch (err) {
      notifications.show({
        title: 'Rejection Failed',
        message: err instanceof Error ? err.message : 'Failed to reject consent.',
        color: 'red',
      });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Center h={500}>
        <Stack align="center" gap="md">
          <Loader color="green" size="lg" />
          <Text c="dimmed">Loading consent details...</Text>
        </Stack>
      </Center>
    );
  }

  if (error) {
    return (
      <Center h={500}>
        <Card withBorder radius="lg" padding="xl" maw={500} w="100%">
          <Stack align="center" gap="md">
            <IconAlertTriangle size={48} color="var(--mantine-color-orange-6)" />
            <Title order={3} ta="center">
              Unable to Process
            </Title>
            <Text c="dimmed" ta="center" size="sm">
              {error}
            </Text>
            <Button
              variant="light"
              color="green"
              onClick={() => navigate('/dashboard')}
            >
              Go to Dashboard
            </Button>
          </Stack>
        </Card>
      </Center>
    );
  }

  if (!consent) return null;

  const tppName = tpp?.tpp_name || consent.tpp_id;
  const tppNameAr = tpp?.tpp_name_ar || '';
  const typeLabels = CONSENT_TYPE_LABELS[consent.consent_type] || {
    en: consent.consent_type,
    ar: '',
  };
  const isPayment =
    consent.consent_type === 'domestic-payment' ||
    consent.consent_type === 'scheduled-payment' ||
    consent.consent_type === 'standing-order';

  const paymentAmount = consent.payment_details?.instructed_amount as
    | { amount: string; currency: string }
    | undefined;
  const creditorAccount = consent.payment_details?.creditor_account as Record<string, string> | undefined;
  const creditorName = creditorAccount?.name;
  const paymentRef = consent.payment_details?.reference as string | undefined;

  return (
    <Stack gap="lg" maw={700} mx="auto">
      {/* Header */}
      <Card
        radius="lg"
        padding="lg"
        style={{
          background: 'linear-gradient(135deg, #4D9134 0%, #3f7a2b 100%)',
        }}
      >
        <Stack align="center" gap="sm">
          <IconShieldCheck size={36} color="white" />
          <Title order={3} c="white" ta="center">
            Authorize Access
          </Title>
          <Text size="sm" c="rgba(255,255,255,0.8)" ta="center">
            {'تفويض الوصول'}
          </Text>
        </Stack>
      </Card>

      {/* TPP info */}
      <Card withBorder radius="md" padding="md">
        <Group gap="md" wrap="nowrap">
          <Box
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              backgroundColor: '#f0f9ed',
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
                style={{ width: 36, height: 36, objectFit: 'contain' }}
              />
            ) : (
              <IconBuildingBank size={28} color="#4D9134" />
            )}
          </Box>
          <Box>
            <Group gap="xs" align="baseline">
              <Text size="lg" fw={600}>
                {tppName}
              </Text>
              {tppNameAr && (
                <Text size="sm" c="dimmed">
                  {tppNameAr}
                </Text>
              )}
            </Group>
            <Text size="sm" c="dimmed">
              is requesting access to your account
            </Text>
            <Group gap="xs" mt={4}>
              <Badge variant="light" color="blue" size="sm">
                {typeLabels.en}
              </Badge>
              {tpp?.is_aisp && (
                <Badge variant="light" color="green" size="xs">
                  AISP
                </Badge>
              )}
              {tpp?.is_pisp && (
                <Badge variant="light" color="orange" size="xs">
                  PISP
                </Badge>
              )}
            </Group>
          </Box>
        </Group>
      </Card>

      {/* Payment details (for payment consents) */}
      {isPayment && paymentAmount && (
        <Card withBorder radius="md" padding="md" style={{ borderColor: '#e8590c' }}>
          <Stack gap="sm">
            <Group gap="xs">
              <IconCurrencyRiyal size={20} color="var(--mantine-color-orange-6)" />
              <Text fw={600}>Payment Details / تفاصيل الدفع</Text>
            </Group>
            <Divider />
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Amount
              </Text>
              <Text size="lg" fw={700}>
                {paymentAmount.currency} {paymentAmount.amount}
              </Text>
            </Group>
            {creditorName && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  To
                </Text>
                <Text size="sm" fw={500}>
                  {creditorName}
                </Text>
              </Group>
            )}
            {paymentRef && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Reference
                </Text>
                <Text size="sm" ff="monospace">
                  {paymentRef}
                </Text>
              </Group>
            )}
          </Stack>
        </Card>
      )}

      {/* Permissions */}
      <Card withBorder radius="md" padding="md">
        <Stack gap="md">
          <Box>
            <Text fw={600}>
              Requested Permissions
            </Text>
            <Text size="xs" c="dimmed">
              {'الصلاحيات المطلوبة'}
              {' '}&mdash; This service will be able to:
            </Text>
          </Box>
          <PermissionDisplay permissions={consent.permissions} />
        </Stack>
      </Card>

      {/* Expiry info */}
      {consent.expiration_time && (
        <Paper p="sm" radius="md" withBorder>
          <Group gap="xs">
            <Text size="sm" c="dimmed">
              This consent will expire on:
            </Text>
            <Text size="sm" fw={500}>
              {new Date(consent.expiration_time).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </Group>
        </Paper>
      )}

      {/* Account picker (for AIS and VRP consents) */}
      {(consent.consent_type === 'account-access' ||
        consent.consent_type === 'domestic-vrp') && (
        <Card withBorder radius="md" padding="md">
          <Stack gap="md">
            <Box>
              <Text fw={600}>
                Select Accounts to Share
              </Text>
              <Text size="xs" c="dimmed">
                {'اختر الحسابات للمشاركة'}
              </Text>
            </Box>
            <AccountPicker
              accounts={accounts}
              selectedIds={selectedAccounts}
              onChange={setSelectedAccounts}
              minSelect={1}
            />
          </Stack>
        </Card>
      )}

      {/* Action buttons */}
      <Card withBorder radius="lg" padding="lg">
        <Stack gap="md">
          <Alert
            variant="light"
            color="blue"
            radius="md"
            icon={<IconShieldCheck size={16} />}
          >
            <Text size="sm">
              By approving, you allow <strong>{tppName}</strong> to access the selected data
              from your Bank Dhofar accounts. You can revoke this consent at any time.
            </Text>
          </Alert>

          <Group grow>
            <Button
              size="lg"
              color="green"
              radius="md"
              leftSection={<IconCheck size={20} />}
              rightSection={<IconArrowRight size={16} />}
              onClick={handleApprove}
              loading={submitting}
              disabled={
                (consent.consent_type === 'account-access' && selectedAccounts.length === 0) ||
                submitting
              }
              style={{ backgroundColor: '#4D9134' }}
            >
              Approve
            </Button>
            <Button
              size="lg"
              variant="outline"
              color="red"
              radius="md"
              leftSection={<IconX size={20} />}
              onClick={openReject}
              disabled={submitting}
            >
              Decline
            </Button>
          </Group>

          <Text size="xs" c="dimmed" ta="center">
            Your data is protected under the Central Bank of Oman Open Banking regulations.
          </Text>
        </Stack>
      </Card>

      {/* Reject confirmation modal */}
      <Modal
        opened={rejectOpened}
        onClose={closeReject}
        title="Decline Consent"
        centered
        radius="md"
      >
        <Stack gap="md">
          <Alert
            variant="light"
            color="orange"
            icon={<IconShieldOff size={16} />}
          >
            <Text size="sm">
              Are you sure you want to decline this request from{' '}
              <strong>{tppName}</strong>? You will be redirected back to the service provider.
            </Text>
          </Alert>
          <Text size="sm" c="dimmed">
            {'هل أنت متأكد من رفض هذا الطلب؟'}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeReject}>
              Cancel
            </Button>
            <Button color="red" onClick={handleReject} loading={submitting}>
              Yes, Decline
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
