import { useState } from 'react';
import {
  Container,
  Title,
  Text,
  SimpleGrid,
  Box,
  Group,
  Badge,
  Paper,
  Stack,
} from '@mantine/core';
import { IconTruckDelivery, IconShieldCheck, IconCurrencyDollar } from '@tabler/icons-react';
import Header from '@/components/Header';
import ProductCard from '@/components/ProductCard';
import CartDrawer from '@/components/CartDrawer';
import { PRODUCTS } from '@/utils/products';

export default function Store() {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <Box style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <Header onCartOpen={() => setCartOpen(true)} />
      <CartDrawer opened={cartOpen} onClose={() => setCartOpen(false)} />

      {/* Hero */}
      <Box
        style={{
          background: 'linear-gradient(135deg, #D35400 0%, #E67E22 50%, #ffc078 100%)',
          padding: '48px 0 56px',
        }}
      >
        <Container size="lg">
          <Stack gap="sm" align="center" ta="center">
            <Badge
              variant="white"
              color="orange"
              size="lg"
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                backdropFilter: 'blur(4px)',
              }}
            >
              Authentic Omani Products
            </Badge>
            <Title order={1} c="white" size="2.5rem">
              Salalah Souq
            </Title>
            <Text
              size="xl"
              c="white"
              style={{ opacity: 0.9 }}
              dir="rtl"
              fw={500}
            >
              {'\u0635\u0644\u0627\u0644\u0629 \u0633\u0648\u0642'}
            </Text>
            <Text size="md" c="white" style={{ opacity: 0.85 }} maw={500}>
              Oman's Premium Gift & Heritage Store.
              Pay instantly from your Bank Dhofar account via Sadad.
            </Text>
            <Text size="sm" c="white" style={{ opacity: 0.7 }} dir="rtl">
              {'\u0645\u062A\u062C\u0631 \u0639\u064F\u0645\u0627\u0646 \u0627\u0644\u0641\u0627\u062E\u0631 \u0644\u0644\u0647\u062F\u0627\u064A\u0627 \u0648\u0627\u0644\u062A\u0631\u0627\u062B'}
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* Trust badges */}
      <Container size="lg" mt={-28}>
        <Paper shadow="sm" radius="lg" p="lg" withBorder>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
            <Group gap="sm" justify="center">
              <IconShieldCheck size={24} color="#D35400" stroke={1.5} />
              <Box>
                <Text size="sm" fw={600}>Secure Payments</Text>
                <Text size="xs" c="dimmed">Powered by Sadad Gateway</Text>
              </Box>
            </Group>
            <Group gap="sm" justify="center">
              <IconTruckDelivery size={24} color="#D35400" stroke={1.5} />
              <Box>
                <Text size="sm" fw={600}>Fast Delivery</Text>
                <Text size="xs" c="dimmed">Across Oman in 2-3 days</Text>
              </Box>
            </Group>
            <Group gap="sm" justify="center">
              <IconCurrencyDollar size={24} color="#D35400" stroke={1.5} />
              <Box>
                <Text size="sm" fw={600}>No Extra Fees</Text>
                <Text size="xs" c="dimmed">Direct bank transfer pricing</Text>
              </Box>
            </Group>
          </SimpleGrid>
        </Paper>
      </Container>

      {/* Product grid */}
      <Container size="lg" py="xl">
        <Group justify="space-between" align="baseline" mb="lg">
          <Box>
            <Title order={2} size="h3">
              Our Collection
            </Title>
            <Text size="sm" c="dimmed">
              Hand-picked Omani heritage products
            </Text>
          </Box>
          <Badge color="orange" variant="light" size="lg">
            {PRODUCTS.length} products
          </Badge>
        </Group>

        <SimpleGrid
          cols={{ base: 1, xs: 2, md: 3 }}
          spacing="lg"
        >
          {PRODUCTS.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </SimpleGrid>
      </Container>

      {/* Footer */}
      <Box
        py="xl"
        style={{
          borderTop: '1px solid #e9ecef',
          background: 'white',
        }}
      >
        <Container size="lg">
          <Group justify="space-between" align="center">
            <Box>
              <Text size="sm" c="dimmed">
                Salalah Souq / {'\u0635\u0644\u0627\u0644\u0629 \u0633\u0648\u0642'}
              </Text>
              <Text size="xs" c="dimmed" mt={2}>
                Payments powered by Sadad ({'\u0633\u062F\u0627\u062F'}) Payment Gateway
              </Text>
            </Box>
            <Text size="xs" c="dimmed">
              Bank Dhofar Open Banking
            </Text>
          </Group>
        </Container>
      </Box>
    </Box>
  );
}
