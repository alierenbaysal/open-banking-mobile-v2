import { useNavigate } from 'react-router-dom';
import {
  Container,
  SimpleGrid,
  Paper,
  Stack,
  Text,
  Group,
  Badge,
  Button,
  Title,
  Box,
} from '@mantine/core';
import { IconCurrencyDollar, IconCar } from '@tabler/icons-react';
import { INVENTORY } from '@/utils/inventory';
import type { Car } from '@/utils/types';

export default function Inventory() {
  const navigate = useNavigate();

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end">
          <Box>
            <Title order={2} c="#fafafa">
              Showroom Inventory
            </Title>
            <Text c="#a1a1aa" size="sm">
              6 vehicles in stock · Finance offered via Bank Dhofar Auto Loans
            </Text>
          </Box>
          <Badge variant="light" color="yellow" size="lg" leftSection={<IconCar size={14} />}>
            {INVENTORY.reduce((sum, c) => sum + c.stock, 0)} units available
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {INVENTORY.map((car) => (
            <CarCard
              key={car.id}
              car={car}
              onSelect={() => navigate(`/sale?car=${car.id}`)}
            />
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}

function CarCard({ car, onSelect }: { car: Car; onSelect: () => void }) {
  return (
    <Paper
      className="car-card"
      radius="lg"
      p={0}
      style={{
        background: 'rgba(24,24,27,0.8)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        style={{
          height: 160,
          background: `radial-gradient(circle at 30% 40%, ${car.accent}cc, ${car.accent}33 60%, transparent 80%), linear-gradient(180deg,#18181b,#0f0f11)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <Text fz={72} lh={1}>
          {car.emoji}
        </Text>
        <Group gap={6} style={{ position: 'absolute', top: 12, left: 12 }}>
          <Badge
            variant="filled"
            color={car.condition === 'new' ? 'teal' : 'grape'}
            size="sm"
            radius="sm"
          >
            {car.condition.toUpperCase()}
          </Badge>
          <Badge variant="light" color="gray" size="sm" radius="sm">
            {car.segment}
          </Badge>
        </Group>
        <Badge
          variant="filled"
          color="dark"
          size="sm"
          radius="sm"
          style={{ position: 'absolute', top: 12, right: 12 }}
        >
          {car.stock} in stock
        </Badge>
      </Box>

      <Stack gap="xs" p="lg" style={{ flex: 1 }}>
        <Group justify="space-between" align="flex-start">
          <Box>
            <Text fw={700} c="#fafafa" size="lg" lh={1.2}>
              {car.make} {car.model}
            </Text>
            <Text size="sm" c="#a1a1aa">
              {car.year} · {car.segment}
            </Text>
          </Box>
        </Group>
        <Group gap={6} align="baseline" mt="xs">
          <Text fw={800} size="xl" className="gold-gradient-text">
            {car.priceOmr.toLocaleString()}
          </Text>
          <Text size="sm" c="#a1a1aa" fw={600}>
            OMR
          </Text>
        </Group>
        <Button
          mt="sm"
          fullWidth
          size="md"
          variant="gradient"
          gradient={{ from: '#ffc107', to: '#c9961d', deg: 90 }}
          styles={{ root: { color: '#18181b', fontWeight: 700 } }}
          leftSection={<IconCurrencyDollar size={18} />}
          onClick={onSelect}
        >
          Sell this car
        </Button>
      </Stack>
    </Paper>
  );
}
