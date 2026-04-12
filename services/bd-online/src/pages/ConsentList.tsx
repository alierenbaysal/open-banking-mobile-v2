/**
 * ConsentList — list all consents with tabs for filtering by status.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stack,
  Title,
  Text,
  Tabs,
  SimpleGrid,
  Center,
  Loader,
  Box,
  Alert,
  Badge,
  Group,
} from '@mantine/core';
import {
  IconList,
  IconShieldCheck,
  IconClock,
  IconShieldOff,
  IconInfoCircle,
} from '@tabler/icons-react';
import ConsentCard from '@/components/ConsentCard';
import { getUser, getEmail } from '@/utils/auth';
import { listConsents, getTPP, type Consent, type TPP } from '@/utils/api';
import { resolveCustomerId } from '@/utils/accounts';

type TabValue = 'all' | 'active' | 'pending' | 'revoked';

export default function ConsentList() {
  const navigate = useNavigate();
  const [consents, setConsents] = useState<Consent[]>([]);
  const [tppCache, setTppCache] = useState<Record<string, TPP>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>('all');

  useEffect(() => {
    async function load() {
      const user = await getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const email = getEmail(user);
      const customerId = resolveCustomerId(email || user.profile.sub);

      try {
        const data = await listConsents(customerId);
        setConsents(data);

        // Load TPP details for each unique tpp_id
        const uniqueTppIds = [...new Set(data.map((c) => c.tpp_id))];
        const tppMap: Record<string, TPP> = {};
        await Promise.all(
          uniqueTppIds.map(async (tppId) => {
            try {
              const tppData = await getTPP(tppId);
              tppMap[tppId] = tppData;
            } catch {
              // TPP details are optional
            }
          }),
        );
        setTppCache(tppMap);
      } catch {
        // API not available
      }

      setLoading(false);
    }
    load();
  }, [navigate]);

  const filteredConsents = consents.filter((c) => {
    switch (activeTab) {
      case 'active':
        return c.status === 'Authorised';
      case 'pending':
        return c.status === 'AwaitingAuthorisation';
      case 'revoked':
        return c.status === 'Revoked' || c.status === 'Rejected' || c.status === 'Expired';
      default:
        return true;
    }
  });

  const activeCount = consents.filter((c) => c.status === 'Authorised').length;
  const pendingCount = consents.filter((c) => c.status === 'AwaitingAuthorisation').length;
  const revokedCount = consents.filter(
    (c) => c.status === 'Revoked' || c.status === 'Rejected' || c.status === 'Expired',
  ).length;

  if (loading) {
    return (
      <Center h={400}>
        <Loader color="green" size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Box>
        <Title order={3}>Open Banking Consents</Title>
        <Text size="sm" c="dimmed">
          {'\u0645\u0648\u0627\u0641\u0642\u0627\u062A \u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0627\u0644\u0645\u0635\u0631\u0641\u064A\u0629 \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629'}
          {' '}&mdash; Manage third-party access to your accounts
        </Text>
      </Box>

      <Tabs value={activeTab} onChange={(v) => setActiveTab((v as TabValue) || 'all')}>
        <Tabs.List>
          <Tabs.Tab value="all" leftSection={<IconList size={16} />}>
            <Group gap={6}>
              All
              <Badge size="xs" variant="light" color="gray">
                {consents.length}
              </Badge>
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="active" leftSection={<IconShieldCheck size={16} />}>
            <Group gap={6}>
              Active
              <Badge size="xs" variant="light" color="green">
                {activeCount}
              </Badge>
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="pending" leftSection={<IconClock size={16} />}>
            <Group gap={6}>
              Pending
              {pendingCount > 0 && (
                <Badge size="xs" variant="filled" color="yellow">
                  {pendingCount}
                </Badge>
              )}
            </Group>
          </Tabs.Tab>
          <Tabs.Tab value="revoked" leftSection={<IconShieldOff size={16} />}>
            <Group gap={6}>
              Revoked / Expired
              <Badge size="xs" variant="light" color="gray">
                {revokedCount}
              </Badge>
            </Group>
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value={activeTab} pt="md">
          {filteredConsents.length === 0 ? (
            <Alert
              icon={<IconInfoCircle size={16} />}
              color="gray"
              variant="light"
              radius="md"
            >
              <Text size="sm">
                {activeTab === 'all'
                  ? 'You have no consent records yet. When a third-party service requests access to your accounts, it will appear here.'
                  : `No ${activeTab} consents found.`}
              </Text>
            </Alert>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {filteredConsents.map((consent) => (
                <ConsentCard
                  key={consent.consent_id}
                  consent={consent}
                  tppName={tppCache[consent.tpp_id]?.tpp_name}
                  onClick={() => navigate(`/consents/${consent.consent_id}`)}
                />
              ))}
            </SimpleGrid>
          )}
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
