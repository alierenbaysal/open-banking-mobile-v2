import { Box, Group, Text, Stack, Paper } from '@mantine/core';
import type { DailyRevenue } from '@/utils/analytics';
import { formatOMR } from '@/utils/analytics';

interface RevenueChartProps {
  data: DailyRevenue[];
  currency?: string;
}

export default function RevenueChart({ data, currency = 'OMR' }: RevenueChartProps) {
  if (data.length === 0) {
    return (
      <Box ta="center" py="xl">
        <Text c="dimmed">No revenue data available</Text>
        <Text c="dimmed" size="xs">la tujad bayianat al-iirad</Text>
      </Box>
    );
  }

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <Stack gap="xs">
      {data.map((item) => {
        const widthPct = Math.max((item.revenue / maxRevenue) * 100, 2);
        return (
          <Group key={item.fullDate} gap="sm" wrap="nowrap" align="center">
            <Text size="xs" fw={500} c="dimmed" style={{ width: 32, flexShrink: 0, textAlign: 'right' }}>
              {item.date}
            </Text>
            <Box style={{ flex: 1, position: 'relative', height: 28 }}>
              <Box
                style={{
                  width: `${widthPct}%`,
                  height: '100%',
                  borderRadius: 6,
                  background: item.revenue > 0
                    ? 'linear-gradient(90deg, #00B894, #00CEC9)'
                    : '#e9ecef',
                  transition: 'width 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 8,
                  minWidth: item.revenue > 0 ? 60 : 0,
                }}
              >
                {item.revenue > 0 && (
                  <Text size="xs" fw={600} c="white" style={{ whiteSpace: 'nowrap' }}>
                    {formatOMR(item.revenue, currency)}
                  </Text>
                )}
              </Box>
            </Box>
            <Text size="xs" c="dimmed" style={{ width: 20, flexShrink: 0, textAlign: 'center' }}>
              {item.count}
            </Text>
          </Group>
        );
      })}
      <Group justify="space-between" mt={4}>
        <Text size="xs" c="dimmed">Day</Text>
        <Text size="xs" c="dimmed">Txn</Text>
      </Group>
    </Stack>
  );
}
