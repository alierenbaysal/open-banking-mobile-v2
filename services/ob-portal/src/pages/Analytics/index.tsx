import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  SimpleGrid,
  Group,
  ThemeIcon,
  Badge,
  Box,
} from '@mantine/core';
import {
  IconChartBar,
  IconChartLine,
  IconChartDots,
  IconAlertTriangle,
  IconClock,
  IconActivity,
} from '@tabler/icons-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const METRICS = [
  {
    title: 'API Calls Today',
    value: '--',
    icon: IconActivity,
    color: 'blue',
    description: 'Total API requests made today across all applications',
  },
  {
    title: 'Error Rate',
    value: '--',
    icon: IconAlertTriangle,
    color: 'red',
    description: 'Percentage of requests returning 4xx/5xx status codes',
  },
  {
    title: 'Avg Latency',
    value: '--',
    icon: IconClock,
    color: 'green',
    description: 'Average response time across all endpoints',
  },
];

const CHART_CARDS = [
  {
    title: 'API Calls Per Day',
    icon: IconChartBar,
    color: 'blue',
    description: 'Daily API request volume over the last 30 days, broken down by API group (AIS, PIS, VRP, CoF, Events).',
  },
  {
    title: 'Error Rate Trend',
    icon: IconChartLine,
    color: 'red',
    description: 'Error rate percentage over time, including breakdown by HTTP status code category (4xx client errors, 5xx server errors).',
  },
  {
    title: 'Latency Distribution',
    icon: IconChartDots,
    color: 'green',
    description: 'Response time distribution showing P50, P95, and P99 latency percentiles for each API group.',
  },
  {
    title: 'Top Endpoints',
    icon: IconChartBar,
    color: 'violet',
    description: 'Most frequently called endpoints with average response time and error rate for each.',
  },
  {
    title: 'Consent Lifecycle',
    icon: IconChartLine,
    color: 'orange',
    description: 'Consent creation, authorization, and revocation rates over time. Tracks active vs expired consents.',
  },
  {
    title: 'Rate Limit Usage',
    icon: IconChartDots,
    color: 'yellow',
    description: 'Current rate limit consumption as a percentage of your allocated quota, per API group.',
  },
];

export default function AnalyticsPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <Container size="lg">
        <Card withBorder p="xl" ta="center">
          <Stack align="center" gap="md">
            <ThemeIcon size={64} radius="xl" color="bankGreen" variant="light">
              <IconChartBar size={32} />
            </ThemeIcon>
            <Title order={3}>Sign In Required</Title>
            <Text c="dimmed" maw={400}>
              Sign in to access API usage analytics for your applications.
            </Text>
          </Stack>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="lg">
      <Stack gap="lg">
        <div>
          <Text size="sm" fw={600} c="bankGreen" tt="uppercase" mb={4}>
            Monitoring
          </Text>
          <Title order={2}>Analytics</Title>
          <Text c="dimmed" mt="xs">
            Monitor API usage, performance, and errors across your applications.
          </Text>
        </div>

        {/* Summary Metrics */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
          {METRICS.map((metric) => (
            <Card key={metric.title} withBorder padding="lg">
              <Group justify="space-between" mb="md">
                <ThemeIcon size={40} radius="md" color={metric.color} variant="light">
                  <metric.icon size={22} />
                </ThemeIcon>
                <Badge color="gray" variant="light" size="sm">Coming Soon</Badge>
              </Group>
              <Text fz={32} fw={700} c="dimmed">{metric.value}</Text>
              <Text fw={500} size="sm" mt={4}>{metric.title}</Text>
              <Text size="xs" c="dimmed" mt={4}>{metric.description}</Text>
            </Card>
          ))}
        </SimpleGrid>

        {/* Chart Placeholders */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {CHART_CARDS.map((chart) => (
            <Card key={chart.title} withBorder padding="lg">
              <Group justify="space-between" mb="md">
                <Group gap="sm">
                  <ThemeIcon size={32} radius="md" color={chart.color} variant="light">
                    <chart.icon size={18} />
                  </ThemeIcon>
                  <Text fw={600}>{chart.title}</Text>
                </Group>
                <Badge color="gray" variant="light" size="sm">Coming Soon</Badge>
              </Group>
              <Box
                h={180}
                style={{
                  backgroundColor: 'var(--mantine-color-gray-0)',
                  borderRadius: 'var(--mantine-radius-md)',
                  border: '2px dashed var(--mantine-color-gray-3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Stack align="center" gap={4}>
                  <chart.icon size={32} color="var(--mantine-color-gray-4)" />
                  <Text size="sm" c="dimmed">Chart will appear here</Text>
                </Stack>
              </Box>
              <Text size="sm" c="dimmed" mt="md">{chart.description}</Text>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
