import { Box, Group, Text, Stack, Paper } from '@mantine/core';
import type { SpendingSummary } from '@/utils/categories';

interface SpendingChartProps {
  data: SpendingSummary[];
  currency?: string;
}

function formatAmount(amount: number, currency: string): string {
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${currency}`;
}

export default function SpendingChart({ data, currency = 'OMR' }: SpendingChartProps) {
  if (data.length === 0) {
    return (
      <Box ta="center" py="xl">
        <Text c="dimmed">No spending data available</Text>
      </Box>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.total));

  return (
    <Stack gap="md">
      {data.map((item) => (
        <Box key={item.category.id}>
          <Group justify="space-between" mb={6}>
            <Group gap="xs">
              <Box
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  backgroundColor: item.category.color,
                  flexShrink: 0,
                }}
              />
              <Text size="sm" fw={500}>{item.category.name}</Text>
              <Text size="xs" c="dimmed">({item.count} transactions)</Text>
            </Group>
            <Text size="sm" fw={600}>{formatAmount(item.total, currency)}</Text>
          </Group>

          <Box
            style={{
              height: 24,
              borderRadius: 12,
              backgroundColor: 'var(--mantine-color-gray-1)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <Box
              style={{
                height: '100%',
                width: `${(item.total / maxTotal) * 100}%`,
                minWidth: 24,
                borderRadius: 12,
                backgroundColor: item.category.color,
                transition: 'width 0.6s ease-out',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: 8,
              }}
            >
              <Text size="xs" c="white" fw={600}>
                {item.percentage.toFixed(1)}%
              </Text>
            </Box>
          </Box>
        </Box>
      ))}

      {/* Pie-style summary circles */}
      <Paper p="md" radius="md" bg="gray.0" mt="sm">
        <Group justify="center" gap="xl" wrap="wrap">
          {data.slice(0, 6).map((item) => (
            <Box key={item.category.id} ta="center">
              <Box
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  border: `4px solid ${item.category.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  marginBottom: 4,
                }}
              >
                <Text size="xs" fw={700}>{item.percentage.toFixed(0)}%</Text>
              </Box>
              <Text size="xs" c="dimmed">{item.category.name}</Text>
            </Box>
          ))}
        </Group>
      </Paper>
    </Stack>
  );
}
