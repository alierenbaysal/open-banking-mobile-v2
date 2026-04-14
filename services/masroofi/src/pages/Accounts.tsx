import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
  Alert,
} from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { IconAlertCircle } from '@tabler/icons-react';
import { getAccounts, getAllBalances } from '@/utils/api';
import type { OBBalance } from '@/utils/api';
import { isBankConnected } from '@/utils/consent';
import AccountCard from '@/components/AccountCard';
import EmptyState from '@/components/EmptyState';

export default function Accounts() {
  const navigate = useNavigate();
  const connected = isBankConnected();

  const { data: accounts, isLoading: loadingAccounts, error: accountsError } = useQuery({
    queryKey: ['accounts'],
    queryFn: getAccounts,
    enabled: connected,
  });

  const { data: balances, isLoading: loadingBalances } = useQuery({
    queryKey: ['balances'],
    queryFn: getAllBalances,
    enabled: connected,
  });

  if (!connected) {
    return (
      <Container size="lg" py="xl">
        <Title order={2} mb="lg">Accounts</Title>
        <EmptyState type="no-bank" />
      </Container>
    );
  }

  const loading = loadingAccounts || loadingBalances;

  // Build a balance lookup by account ID
  const balanceByAccount = new Map<string, OBBalance>();
  for (const b of balances || []) {
    if (!balanceByAccount.has(b.AccountId)) {
      balanceByAccount.set(b.AccountId, b);
    }
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Box>
          <Title order={2}>Accounts</Title>
          <Text size="sm" c="dimmed">Your Bank Dhofar accounts</Text>
        </Box>

        {accountsError && (
          <Alert icon={<IconAlertCircle size={18} />} color="red" variant="light">
            Failed to load accounts: {(accountsError as Error).message}
          </Alert>
        )}

        {loading ? (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height={160} radius="md" />
            ))}
          </SimpleGrid>
        ) : accounts && accounts.length > 0 ? (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {accounts.map((account) => (
              <AccountCard
                key={account.AccountId}
                account={account}
                balance={balanceByAccount.get(account.AccountId)}
                onClick={() => navigate(`/accounts/${account.AccountId}/transactions`)}
              />
            ))}
          </SimpleGrid>
        ) : (
          <EmptyState
            type="no-data"
            title="No Accounts Found"
            description="No accounts were returned from Bank Dhofar. This may be because no accounts were selected during consent approval."
          />
        )}
      </Stack>
    </Container>
  );
}
