import { useNavigate } from 'react-router-dom';
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
import { IconEye, IconRefresh, IconAlertCircle } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { listApplications, fmtMoney } from '@/utils/api';
import { statusMeta } from '@/utils/status';

export default function History() {
  const navigate = useNavigate();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['applications', 'history'],
    queryFn: () => listApplications({ limit: 100 }),
    refetchInterval: 5000,
  });

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end">
          <Box>
            <Title order={2} c="#fafafa">
              Sales History
            </Title>
            <Text c="#a1a1aa" size="sm">
              All auto-loan applications submitted by Muscat Motors · auto-refresh 5s
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

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            Failed to load applications: {(error as Error).message}
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
              <Text c="#a1a1aa">No sales yet.</Text>
              <Text size="sm" c="#71717a">
                Start a new sale from the Inventory tab.
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
                  <Table.Th>Ref</Table.Th>
                  <Table.Th>Vehicle</Table.Th>
                  <Table.Th>Price</Table.Th>
                  <Table.Th>Loan</Table.Th>
                  <Table.Th>Tenor</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th ta="right">Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data?.items.map((app) => {
                  const meta = statusMeta(app.status);
                  return (
                    <Table.Tr key={app.application_id}>
                      <Table.Td>
                        <Text size="xs" c="#71717a" ff="monospace">
                          {app.application_id.slice(0, 8)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={600} c="#fafafa" size="sm">
                          {app.vehicle.make} {app.vehicle.model}
                        </Text>
                        <Text size="xs" c="#a1a1aa">
                          {app.vehicle.year} · {app.vehicle.condition}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{fmtMoney(app.vehicle.price)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="#ffc107" fw={600}>
                          {fmtMoney(app.requested_amount)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{app.requested_tenor_months} mo</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={meta.color} variant="light">
                          {meta.label}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" c="#a1a1aa">
                          {new Date(app.created_at).toLocaleString()}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <ActionIcon
                          variant="subtle"
                          color="yellow"
                          onClick={() => navigate(`/sale/${app.application_id}`)}
                          title="Open sale"
                        >
                          <IconEye size={16} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
