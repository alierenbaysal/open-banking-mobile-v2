import { useState } from 'react';
import {
  Container,
  Title,
  Text,
  Paper,
  Group,
  Stack,
  Button,
  Box,
  Divider,
} from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import CartDrawer from '@/components/CartDrawer';
import PaymentMethods from '@/components/PaymentMethods';
import { useCart } from '@/App';
import { formatOMR } from '@/utils/products';
import { MERCHANT } from '@/utils/payment';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, total } = useCart();
  const [cartOpen, setCartOpen] = useState(false);

  if (items.length === 0) {
    return (
      <Box style={{ minHeight: '100vh', background: '#f8f9fa' }}>
        <Header onCartOpen={() => setCartOpen(true)} />
        <CartDrawer opened={cartOpen} onClose={() => setCartOpen(false)} />
        <Container size="sm" py={80}>
          <Stack align="center" gap="md">
            <Text size="4rem" style={{ opacity: 0.3 }}>
              {'\u{1F6D2}'}
            </Text>
            <Title order={2} c="dimmed">
              Your cart is empty
            </Title>
            <Text c="dimmed">Add some items to your cart before checking out.</Text>
            <Button
              variant="light"
              color="orange"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/')}
            >
              Back to Store
            </Button>
          </Stack>
        </Container>
      </Box>
    );
  }

  return (
    <Box style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      <Header onCartOpen={() => setCartOpen(true)} />
      <CartDrawer opened={cartOpen} onClose={() => setCartOpen(false)} />

      <Container size="sm" py="xl">
        <Button
          variant="subtle"
          color="gray"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate('/')}
          mb="lg"
          px={0}
        >
          Back to Store
        </Button>

        <Title order={2} mb="lg">
          Checkout
        </Title>

        {/* Order Summary */}
        <Paper shadow="sm" radius="md" p="lg" withBorder mb="lg">
          <Text fw={600} size="lg" mb="md">
            Order Summary
          </Text>

          <Stack gap="sm">
            {items.map((item) => (
              <Group key={item.product.id} justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                  <Box
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: '#fff4e6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {item.product.emoji}
                  </Box>
                  <Stack gap={0} style={{ minWidth: 0 }}>
                    <Text size="sm" fw={500} truncate="end">
                      {item.product.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {formatOMR(item.product.price)} x {item.quantity}
                    </Text>
                  </Stack>
                </Group>
                <Text
                  size="sm"
                  fw={600}
                  style={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}
                >
                  {formatOMR(item.product.price * item.quantity)}
                </Text>
              </Group>
            ))}
          </Stack>

          <Divider my="md" />

          <Group justify="space-between">
            <Text fw={600} size="lg">
              Total
            </Text>
            <Text
              fw={700}
              size="xl"
              style={{ color: '#D35400', fontVariantNumeric: 'tabular-nums' }}
            >
              {formatOMR(total)}
            </Text>
          </Group>
        </Paper>

        {/* Merchant Info */}
        <Paper shadow="sm" radius="md" p="lg" withBorder mb="lg">
          <Text fw={600} size="lg" mb="md">
            Payment To
          </Text>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Merchant</Text>
              <Text size="sm" fw={500}>{MERCHANT.name}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">IBAN</Text>
              <Text size="sm" fw={500} style={{ fontFamily: 'monospace', fontSize: 12 }}>
                {MERCHANT.iban}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Currency</Text>
              <Text size="sm" fw={500}>OMR (Omani Rial)</Text>
            </Group>
          </Stack>
        </Paper>

        {/* Payment Methods (Sadad widget) */}
        <PaymentMethods total={total} />
      </Container>
    </Box>
  );
}
