import {
  Container,
  Paper,
  Stack,
  Text,
  Group,
  Badge,
  Title,
  Box,
  Table,
  Loader,
  ActionIcon,
  Alert,
} from '@mantine/core';
import { IconRefresh, IconAlertCircle, IconWebhook } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { listWebhookDeliveries } from '@/utils/api';
import { webhookStatusColor } from '@/utils/status';

export default function Webhooks() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['webhooks', 'deliveries'],
    queryFn: () => listWebhookDeliveries({ limit: 100 }),
    refetchInterval: 4000,
  });

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end">
          <Box>
            <Title order={2} c="#fafafa">
              Webhook Inbox
            </Title>
            <Text c="#a1a1aa" size="sm">
              Events delivered from Bank Dhofar to Muscat Motors · auto-refresh 4s
            </Text>
          </Box>
          <Group gap="xs">
            {isFetching && (
              <Group gap={6}>
                <span className="live-dot pulse-gold" />
                <Text size="xs" c="#ffc107" fw={600}>
                  LIVE
                </Text>
              </Group>
            )}
            <ActionIcon variant="subtle" color="gray" onClick={() => refetch()}>
              <IconRefresh size={18} />
            </ActionIcon>
          </Group>
        </Group>

        <Paper
          p="md"
          radius="lg"
          style={{ background: 'rgba(255,193,7,0.06)', border: '1px solid #3f3f46' }}
        >
          <Group gap="sm">
            <IconWebhook size={22} color="#ffc107" />
            <Box>
              <Text size="sm" fw={600} c="#fafafa">
                Configured endpoint
              </Text>
              <Text size="xs" c="#a1a1aa" ff="monospace">
                https://muscatmotors.tnd.bankdhofar.com/api/bd-webhook
              </Text>
            </Box>
          </Group>
        </Paper>

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            Failed to load deliveries: {(error as Error).message}
          </Alert>
        )}

        <Paper
          radius="lg"
          p={0}
          style={{ background: 'rgba(24,24,27,0.8)', border: '1px solid #27272a', overflow: 'hidden' }}
        >
          {isLoading ? (
            <Group justify="center" p="xl">
              <Loader color="yellow" />
            </Group>
          ) : data?.items.length === 0 ? (
            <Stack align="center" p="xl" gap="xs">
              <Text c="#a1a1aa">No webhook deliveries yet.</Text>
              <Text size="sm" c="#71717a">
                Events fire when applications are decided, contracted, or disbursed.
              </Text>
            </Stack>
          ) : (
            <Table
              verticalSpacing="md"
              horizontalSpacing="lg"
              striped
              highlightOnHover
              styles={{
                table: { color: '#e4e4e7' },
                th: { color: '#a1a1aa', background: '#18181b', textTransform: 'uppercase', fontSize: 11 },
                tr: { borderColor: '#27272a' },
              }}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Event</Table.Th>
                  <Table.Th>Application</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Attempts</Table.Th>
                  <Table.Th>HTTP</Table.Th>
                  <Table.Th>Last attempt</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data?.items.map((d) => (
                  <Table.Tr key={d.webhook_id}>
                    <Table.Td>
                      <Text size="sm" c="#fafafa" fw={600} ff="monospace">
                        {d.event_type}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="#71717a" ff="monospace">
                        {d.application_id ? d.application_id.slice(0, 8) : '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={webhookStatusColor(d.status)} variant="light">
                        {d.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{d.delivery_attempts}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text
                        size="sm"
                        c={
                          d.last_response_code && d.last_response_code < 400
                            ? '#10b981'
                            : d.last_response_code
                            ? '#ef4444'
                            : '#71717a'
                        }
                        fw={600}
                      >
                        {d.last_response_code ?? '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="#a1a1aa">
                        {d.last_attempted_at ? new Date(d.last_attempted_at).toLocaleString() : '—'}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
