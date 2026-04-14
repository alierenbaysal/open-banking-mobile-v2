import { Card, Text, Group, Button, Stack, Box } from '@mantine/core';
import { IconShoppingCartPlus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import type { Product } from '@/utils/products';
import { formatOMR } from '@/utils/products';
import { useCart } from '@/App';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { add } = useCart();

  const handleAdd = () => {
    add(product);
    notifications.show({
      title: 'Added to cart',
      message: `${product.name} added`,
      color: 'orange',
      autoClose: 1500,
    });
  };

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{
        transition: 'transform 0.2s, box-shadow 0.2s',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
        (e.currentTarget as HTMLElement).style.boxShadow =
          '0 8px 24px rgba(211, 84, 0, 0.15)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = '';
      }}
    >
      <Box
        style={{
          height: 140,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #fff4e6, #ffe8cc)',
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            style={{ width: 120, height: 120, objectFit: 'contain' }}
          />
        ) : (
          <span style={{ fontSize: 56 }}>{product.emoji}</span>
        )}
      </Box>

      <Stack gap={4} style={{ flex: 1 }}>
        <Text fw={600} size="md" lineClamp={2}>
          {product.name}
        </Text>
        <Text size="xs" c="dimmed" lineClamp={2} mt={4}>
          {product.description}
        </Text>
      </Stack>

      <Group justify="space-between" align="center" mt="md">
        <Text fw={700} size="xl" style={{ color: '#D35400', fontVariantNumeric: 'tabular-nums' }}>
          {formatOMR(product.price)}
        </Text>
        <Button
          leftSection={<IconShoppingCartPlus size={18} />}
          variant="light"
          color="orange"
          size="sm"
          radius="md"
          onClick={handleAdd}
        >
          Add
        </Button>
      </Group>
    </Card>
  );
}
