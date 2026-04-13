/**
 * Transfer — transfer money between own accounts or to an external IBAN.
 *
 * In-session only: balances update in sessionStorage, no backend persistence.
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stack,
  Title,
  Text,
  Card,
  Group,
  Button,
  Select,
  NumberInput,
  TextInput,
  Radio,
  Divider,
  Box,
  Loader,
  Center,
  Alert,
  Paper,
  ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowsExchange,
  IconCheck,
  IconArrowRight,
  IconBuildingBank,
  IconReceipt,
} from '@tabler/icons-react';
import { getUser, getDisplayName, type User } from '@/utils/auth';
import {
  fetchCustomerAccounts,
  executeTransfer as executeBankingTransfer,
  resolveCustomerId,
  formatBalance,
  maskIban,
  saveTransfer,
  type BankAccount,
  type TransferRecord,
} from '@/utils/accounts';

type TransferMode = 'own' | 'external';

export default function Transfer() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [customerId, setCustomerId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Form state
  const [transferMode, setTransferMode] = useState<TransferMode>('own');
  const [fromAccountId, setFromAccountId] = useState<string | null>(null);
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [toIban, setToIban] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Success state
  const [success, setSuccess] = useState<TransferRecord | null>(null);

  useEffect(() => {
    async function load() {
      const u = await getUser();
      if (!u) {
        navigate('/login');
        return;
      }
      setUser(u);

      const custId =
        u.customer_id || resolveCustomerId(u.email || String(u.profile.sub || u.sub));
      setCustomerId(custId);
      const accts = await fetchCustomerAccounts(custId);
      setAccounts(accts);
      setLoading(false);
    }
    load();
  }, [navigate]);

  // Refresh accounts from Banking API (balances may have changed after transfer)
  const refreshAccounts = useCallback(async () => {
    if (customerId) {
      const accts = await fetchCustomerAccounts(customerId);
      setAccounts(accts);
    }
  }, [customerId]);

  const fromAccount = accounts.find((a) => a.accountId === fromAccountId);
  const toAccount = accounts.find((a) => a.accountId === toAccountId);
  const parsedAmount = typeof amount === 'number' ? amount : 0;

  // Available "to" accounts (exclude the "from" account for own transfers)
  const toAccountOptions = accounts
    .filter((a) => a.accountId !== fromAccountId)
    .map((a) => ({
      value: a.accountId,
      label: `${a.description} (${maskIban(a.iban)}) - ${formatBalance(a.balance)}`,
    }));

  const fromAccountOptions = accounts.map((a) => ({
    value: a.accountId,
    label: `${a.description} (${maskIban(a.iban)}) - ${formatBalance(a.balance)}`,
  }));

  const canSubmit =
    fromAccountId &&
    parsedAmount > 0 &&
    parsedAmount <= (fromAccount?.balance || 0) &&
    (transferMode === 'own' ? toAccountId && toAccountId !== fromAccountId : toIban.length >= 16) &&
    reference.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || !fromAccount) return;

    setSubmitting(true);

    try {
      if (transferMode === 'own' && toAccountId) {
        // Execute transfer via Banking API
        const result = await executeBankingTransfer({
          customer_id: customerId,
          source_account_id: fromAccount.accountId,
          target_account_id: toAccountId,
          amount: parsedAmount,
          currency: 'OMR',
          reference: reference.trim(),
          description: `Transfer from ${fromAccount.description}`,
        });

        // Save the transfer record locally for display
        const record: TransferRecord = {
          id: result.transfer_id,
          fromAccountId: fromAccount.accountId,
          toAccountId: toAccountId,
          toIban: toAccount?.iban || null,
          amount: parsedAmount,
          currency: 'OMR',
          reference: reference.trim(),
          timestamp: result.created_at,
        };
        saveTransfer(record);
        setSuccess(record);
      } else {
        // External IBAN transfer — save locally only (no backend target account)
        const refNum = `TRF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const record: TransferRecord = {
          id: refNum,
          fromAccountId: fromAccount.accountId,
          toAccountId: null,
          toIban: toIban,
          amount: parsedAmount,
          currency: 'OMR',
          reference: reference.trim(),
          timestamp: new Date().toISOString(),
        };
        saveTransfer(record);
        setSuccess(record);
      }

      await refreshAccounts();

      notifications.show({
        title: 'Transfer Successful',
        message: `${formatBalance(parsedAmount)} transferred successfully.`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (err) {
      notifications.show({
        title: 'Transfer Failed',
        message: err instanceof Error ? err.message : 'An error occurred during the transfer.',
        color: 'red',
      });
    }

    setSubmitting(false);
  };

  const handleNewTransfer = () => {
    setSuccess(null);
    setFromAccountId(null);
    setToAccountId(null);
    setToIban('');
    setAmount('');
    setReference('');
    setTransferMode('own');
    void refreshAccounts();
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader color="green" size="lg" />
      </Center>
    );
  }

  // Success screen
  if (success) {
    const fromAcct = accounts.find((a) => a.accountId === success.fromAccountId);
    const toAcct = success.toAccountId
      ? accounts.find((a) => a.accountId === success.toAccountId)
      : null;

    return (
      <Stack gap="lg" maw={600} mx="auto">
        <Card
          radius="lg"
          padding="xl"
          style={{
            background: 'linear-gradient(135deg, #4D9134 0%, #3f7a2b 100%)',
          }}
        >
          <Stack align="center" gap="md">
            <ThemeIcon size={64} radius="xl" color="white" variant="filled">
              <IconCheck size={36} color="#4D9134" />
            </ThemeIcon>
            <Title order={2} c="white" ta="center">
              Transfer Successful
            </Title>
            <Text size="sm" c="rgba(255,255,255,0.8)" ta="center">
              {'تم التحويل بنجاح'}
            </Text>
          </Stack>
        </Card>

        <Card withBorder radius="md" padding="lg">
          <Stack gap="md">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Reference / المرجع
              </Text>
              <Text size="sm" fw={600} ff="monospace">
                {success.id}
              </Text>
            </Group>
            <Divider />
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Amount / المبلغ
              </Text>
              <Text size="lg" fw={700} c="#4D9134">
                {formatBalance(success.amount)}
              </Text>
            </Group>
            <Divider />
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                From / من
              </Text>
              <Box ta="right">
                <Text size="sm" fw={500}>
                  {fromAcct?.description || success.fromAccountId}
                </Text>
                <Text size="xs" c="dimmed" ff="monospace">
                  {fromAcct ? maskIban(fromAcct.iban) : ''}
                </Text>
              </Box>
            </Group>
            <Divider />
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                To / إلى
              </Text>
              <Box ta="right">
                <Text size="sm" fw={500}>
                  {toAcct?.description || success.toIban || 'External Account'}
                </Text>
                <Text size="xs" c="dimmed" ff="monospace">
                  {toAcct ? maskIban(toAcct.iban) : success.toIban ? maskIban(success.toIban) : ''}
                </Text>
              </Box>
            </Group>
            <Divider />
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Payment Reference / مرجع الدفع
              </Text>
              <Text size="sm" fw={500}>
                {success.reference}
              </Text>
            </Group>
            <Divider />
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Date / التاريخ
              </Text>
              <Text size="sm" fw={500}>
                {new Date(success.timestamp).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </Group>
          </Stack>
        </Card>

        <Group grow>
          <Button
            variant="filled"
            color="green"
            size="md"
            leftSection={<IconArrowsExchange size={18} />}
            onClick={handleNewTransfer}
            style={{ backgroundColor: '#4D9134' }}
          >
            New Transfer / تحويل جديد
          </Button>
          <Button
            variant="light"
            color="green"
            size="md"
            leftSection={<IconBuildingBank size={18} />}
            onClick={() => navigate('/dashboard')}
          >
            Dashboard / لوحة التحكم
          </Button>
        </Group>
      </Stack>
    );
  }

  // Transfer form
  return (
    <Stack gap="lg" maw={600} mx="auto">
      {/* Header */}
      <Card
        radius="lg"
        padding="lg"
        style={{
          background: 'linear-gradient(135deg, #4D9134 0%, #3f7a2b 100%)',
        }}
      >
        <Stack align="center" gap="sm">
          <IconArrowsExchange size={36} color="white" />
          <Title order={3} c="white" ta="center">
            Transfer Funds
          </Title>
          <Text size="sm" c="rgba(255,255,255,0.8)" ta="center">
            {'تحويل الأموال'}
          </Text>
        </Stack>
      </Card>

      {/* Transfer type */}
      <Card withBorder radius="md" padding="md">
        <Stack gap="md">
          <Text fw={600}>Transfer Type / نوع التحويل</Text>
          <Radio.Group value={transferMode} onChange={(v) => setTransferMode(v as TransferMode)}>
            <Group>
              <Radio
                value="own"
                label="Between My Accounts / بين حساباتي"
                color="green"
              />
              <Radio
                value="external"
                label="To Another IBAN / إلى حساب آخر"
                color="green"
              />
            </Group>
          </Radio.Group>
        </Stack>
      </Card>

      {/* From account */}
      <Card withBorder radius="md" padding="md">
        <Stack gap="md">
          <Text fw={600}>From Account / من حساب</Text>
          <Select
            placeholder="Select source account / اختر حساب المصدر"
            data={fromAccountOptions}
            value={fromAccountId}
            onChange={setFromAccountId}
            searchable
          />
          {fromAccount && (
            <Paper p="sm" radius="md" style={{ backgroundColor: '#f0f9ed' }}>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Available Balance / الرصيد المتاح
                </Text>
                <Text size="md" fw={700} c="#4D9134">
                  {formatBalance(fromAccount.balance)}
                </Text>
              </Group>
            </Paper>
          )}
        </Stack>
      </Card>

      {/* To account / IBAN */}
      <Card withBorder radius="md" padding="md">
        <Stack gap="md">
          <Text fw={600}>
            {transferMode === 'own'
              ? 'To Account / إلى حساب'
              : 'Beneficiary IBAN / رقم الآيبان'}
          </Text>
          {transferMode === 'own' ? (
            <Select
              placeholder="Select destination account / اختر حساب الوجهة"
              data={toAccountOptions}
              value={toAccountId}
              onChange={setToAccountId}
              searchable
              disabled={!fromAccountId}
            />
          ) : (
            <TextInput
              placeholder="OM02DHOF..."
              value={toIban}
              onChange={(e) => setToIban(e.currentTarget.value.toUpperCase().replace(/\s/g, ''))}
              maxLength={27}
              description="Oman IBAN format: OM + 2 check digits + bank code + account number"
              styles={{
                input: { fontFamily: 'monospace' },
              }}
            />
          )}
        </Stack>
      </Card>

      {/* Amount and reference */}
      <Card withBorder radius="md" padding="md">
        <Stack gap="md">
          <NumberInput
            label="Amount / المبلغ"
            placeholder="0.000"
            value={amount}
            onChange={setAmount}
            min={0.001}
            max={fromAccount?.balance || 999999}
            step={0.001}
            decimalScale={3}
            fixedDecimalScale
            leftSection={<Text size="sm" fw={500} c="dimmed">OMR</Text>}
            leftSectionWidth={50}
            error={
              parsedAmount > 0 && fromAccount && parsedAmount > fromAccount.balance
                ? 'Insufficient balance / رصيد غير كاف'
                : undefined
            }
          />
          <TextInput
            label="Reference / المرجع"
            placeholder="Payment reference or description"
            value={reference}
            onChange={(e) => setReference(e.currentTarget.value)}
            maxLength={140}
          />
        </Stack>
      </Card>

      {/* Summary */}
      {fromAccount && parsedAmount > 0 && (
        <Card withBorder radius="md" padding="md" style={{ borderColor: '#4D9134' }}>
          <Stack gap="xs">
            <Group gap="xs">
              <IconReceipt size={18} color="#4D9134" />
              <Text size="sm" fw={600} c="#4D9134">
                Transfer Summary / ملخص التحويل
              </Text>
            </Group>
            <Divider />
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                From
              </Text>
              <Text size="sm" fw={500}>
                {fromAccount.description}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                To
              </Text>
              <Text size="sm" fw={500}>
                {transferMode === 'own' && toAccount
                  ? toAccount.description
                  : toIban
                    ? maskIban(toIban)
                    : '-'}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Amount
              </Text>
              <Text size="md" fw={700} c="#4D9134">
                {formatBalance(parsedAmount)}
              </Text>
            </Group>
          </Stack>
        </Card>
      )}

      {/* Submit */}
      <Button
        size="lg"
        color="green"
        radius="md"
        fullWidth
        leftSection={<IconArrowRight size={20} />}
        onClick={handleSubmit}
        loading={submitting}
        disabled={!canSubmit}
        style={{ backgroundColor: '#4D9134' }}
      >
        Confirm Transfer / تأكيد التحويل
      </Button>

      <Text size="xs" c="dimmed" ta="center">
        All transfers are subject to Bank Dhofar terms and conditions.
        This is a demo environment.
      </Text>
    </Stack>
  );
}
