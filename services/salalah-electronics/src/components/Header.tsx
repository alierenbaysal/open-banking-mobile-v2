import { Group, Text, Box, ActionIcon, Indicator } from '@mantine/core';
import { IconShoppingCart } from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '@/App';

interface HeaderProps {
  onCartOpen: () => void;
}

export default function Header({ onCartOpen }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { itemCount } = useCart();

  return (
    <Box
      component="header"
      style={{
        height: 64,
        borderBottom: '1px solid #e9ecef',
        background: 'white',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <Group h="100%" px="md" justify="space-between" maw={1200} mx="auto">
        <Group
          gap="sm"
          style={{ cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          {/* SS logo circle */}
          <Box
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #D35400, #E67E22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text c="white" fw={700} size="sm">
              SS
            </Text>
          </Box>
          <Box>
            <Group gap={8} align="baseline">
              <Text fw={700} size="lg" style={{ color: '#D35400' }}>
                Salalah Souq
              </Text>
              <Text size="sm" c="dimmed" fw={500}>
                {'\u0635\u0644\u0627\u0644\u0629 \u0633\u0648\u0642'}
              </Text>
            </Group>
            <Text size="xs" c="dimmed" mt={-4}>
              Oman's Premium Gift & Heritage Store
            </Text>
          </Box>
        </Group>

        <Group gap="md">
          {location.pathname !== '/about' && (
            <Text
              size="sm"
              c="dimmed"
              style={{ cursor: 'pointer', textDecoration: 'none' }}
              onClick={() => navigate('/about')}
            >
              About
            </Text>
          )}
          {location.pathname === '/about' && (
            <Text
              size="sm"
              c="dimmed"
              style={{ cursor: 'pointer', textDecoration: 'none' }}
              onClick={() => navigate('/')}
            >
              Back to Store
            </Text>
          )}
          <Indicator
            label={itemCount}
            size={18}
            color="red"
            disabled={itemCount === 0}
            offset={4}
          >
            <ActionIcon
              variant="light"
              color="orange"
              size="lg"
              radius="md"
              onClick={onCartOpen}
              aria-label="Shopping cart"
            >
              <IconShoppingCart size={22} stroke={1.5} />
            </ActionIcon>
          </Indicator>
        </Group>
      </Group>
    </Box>
  );
}
