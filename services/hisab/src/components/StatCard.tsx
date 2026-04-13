import { Paper, Group, Text, ThemeIcon, Skeleton, Box } from '@mantine/core';

interface StatCardProps {
  title: string;
  titleAr: string;
  value: string;
  icon: React.ElementType;
  color: string;
  borderColor?: string;
  loading?: boolean;
}

export default function StatCard({ title, titleAr, value, icon: Icon, color, borderColor, loading }: StatCardProps) {
  return (
    <Paper
      shadow="sm"
      p="lg"
      radius="md"
      withBorder
      style={{ borderLeft: `4px solid ${borderColor || color}` }}
    >
      <Group justify="space-between" mb="sm">
        <Text size="xs" tt="uppercase" fw={600} c="dimmed">{title}</Text>
        <ThemeIcon size={36} radius="md" variant="light" color={color}>
          <Icon size={20} />
        </ThemeIcon>
      </Group>
      {loading ? (
        <Skeleton height={32} />
      ) : (
        <Text size="xl" fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </Text>
      )}
      <Text size="xs" c="dimmed" mt={4}>{titleAr}</Text>
    </Paper>
  );
}
