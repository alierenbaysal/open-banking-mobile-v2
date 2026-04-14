import { Box, Group, Text, Stack, RingProgress, Paper, Progress } from '@mantine/core';
import type { SpendingSummary } from '@/utils/categories';
import { getCategoryEmoji } from '@/utils/categories';

interface SpendingChartProps {
  data: SpendingSummary[];
  currency?: string;
  compact?: boolean;
}

function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${currency}`;
}

export default function SpendingChart({ data, currency = 'OMR', compact = false }: SpendingChartProps) {
  if (data.length === 0) {
    return (
      <Box ta="center" py="xl">
        <Text c="dimmed">No spending data available</Text>
      </Box>
    );
  }

  const grandTotal = data.reduce((s, d) => s + d.total, 0);

  // Build ring segments
  const ringSegments = data.slice(0, 8).map((item) => ({
    value: Math.max(item.percentage, 1),
    color: item.category.color,
    tooltip: `${item.category.name}: ${item.percentage.toFixed(1)}%`,
  }));

  if (compact) {
    // Dashboard compact view: ring + top 3 bars
    return (
      <Stack gap="md">
        <Group justify="center" py="sm">
          <RingProgress
            size={140}
            thickness={14}
            roundCaps
            sections={ringSegments}
            label={
              <Box ta="center">
                <Text size="xs" c="dimmed" lh={1}>Total</Text>
                <Text size="sm" fw={700} lh={1.2}>{formatAmount(grandTotal, currency)}</Text>
              </Box>
            }
          />
        </Group>
        <Stack gap="xs">
          {data.slice(0, 3).map((item) => (
            <Group key={item.category.id} justify="space-between" gap="xs" wrap="nowrap">
              <Group gap={6} wrap="nowrap" style={{ flex: 1 }}>
                <Text size="sm">{getCategoryEmoji(item.category.id)}</Text>
                <Text size="xs" fw={500} truncate="end">{item.category.name}</Text>
              </Group>
              <Text size="xs" fw={600} style={{ whiteSpace: 'nowrap' }}>
                {item.percentage.toFixed(0)}%
              </Text>
            </Group>
          ))}
        </Stack>
      </Stack>
    );
  }

  // Full view: ring + bar list
  return (
    <Stack gap="lg">
      {/* Donut ring in center */}
      <Group justify="center" py="md">
        <RingProgress
          size={200}
          thickness={20}
          roundCaps
          sections={ringSegments}
          label={
            <Box ta="center">
              <Text size="xs" c="dimmed" lh={1}>Total Spent</Text>
              <Text size="lg" fw={700} lh={1.3}>{formatAmount(grandTotal, currency)}</Text>
              <Text size="xs" c="dimmed" lh={1}>{data.reduce((s, d) => s + d.count, 0)} transactions</Text>
            </Box>
          }
        />
      </Group>

      {/* Category bars */}
      <Stack gap="sm">
        {data.map((item) => {
          const emoji = getCategoryEmoji(item.category.id);
          return (
            <Paper key={item.category.id} p="sm" radius="md" withBorder style={{ borderLeftColor: item.category.color, borderLeftWidth: 3 }}>
              <Group justify="space-between" mb={6} wrap="nowrap">
                <Group gap="xs" wrap="nowrap" style={{ flex: 1 }}>
                  <Text size="lg" style={{ lineHeight: 1 }}>{emoji}</Text>
                  <Text size="sm" fw={600} truncate="end" style={{ minWidth: 0 }}>{item.category.name}</Text>
                </Group>
                <Box style={{ textAlign: 'right', flexShrink: 0 }}>
                  <Text size="sm" fw={700}>{formatAmount(item.total, currency)}</Text>
                  <Text size="xs" c="dimmed">{item.count} txn</Text>
                </Box>
              </Group>
              <Progress
                value={item.percentage}
                color={item.category.color}
                size="sm"
                radius="xl"
              />
              <Text size="xs" c="dimmed" mt={4} ta="right">{item.percentage.toFixed(1)}%</Text>
            </Paper>
          );
        })}
      </Stack>
    </Stack>
  );
}
