import { useState } from 'react';
import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Box,
  Group,
  Divider,
  Badge,
  Button,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconBuildingBank,
  IconShieldCheck,
  IconMapPin,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import CartDrawer from '@/components/CartDrawer';

export default function About() {
  const navigate = useNavigate();
  const [cartOpen, setCartOpen] = useState(false);

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

        {/* About hero */}
        <Paper
          shadow="sm"
          radius="lg"
          p="xl"
          withBorder
          mb="lg"
          style={{
            borderTop: '4px solid #D35400',
          }}
        >
          <Stack align="center" gap="md" mb="lg">
            <Box
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #D35400, #E67E22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text c="white" fw={700} size="xl">
                SS
              </Text>
            </Box>
            <Title order={2}>Salalah Souq</Title>
            <Text size="lg" c="dimmed" dir="rtl" fw={500}>
              {'\u0635\u0644\u0627\u0644\u0629 \u0633\u0648\u0642'}
            </Text>
            <Badge color="orange" variant="light" size="lg">
              Est. 2015 &mdash; Salalah, Oman
            </Badge>
          </Stack>

          <Text size="md" ta="center" maw={500} mx="auto" mb="lg">
            Salalah Souq is Oman's premium destination for authentic gifts and
            heritage products. We bring the rich traditions of Dhofar to your
            doorstep with genuine frankincense, traditional coffee sets, handcrafted
            khanjars, and artisan-crafted goods from across the Sultanate.
          </Text>

          <Text size="md" ta="center" maw={500} mx="auto" c="dimmed" dir="rtl">
            {'\u0635\u0644\u0627\u0644\u0629 \u0633\u0648\u0642 \u0647\u064A \u0627\u0644\u0648\u062C\u0647\u0629 \u0627\u0644\u0641\u0627\u062E\u0631\u0629 \u0641\u064A \u0639\u064F\u0645\u0627\u0646 \u0644\u0644\u0647\u062F\u0627\u064A\u0627 \u0627\u0644\u0623\u0635\u064A\u0644\u0629 \u0648\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u062A\u0631\u0627\u062B \u0627\u0644\u0639\u0645\u0627\u0646\u064A.'}
          </Text>
        </Paper>

        {/* Payment info */}
        <Paper shadow="sm" radius="md" p="lg" withBorder mb="lg">
          <Group gap="sm" mb="md">
            <IconBuildingBank size={24} color="#00695c" stroke={1.5} />
            <Text fw={600} size="lg">
              How We Accept Payments
            </Text>
          </Group>

          <Stack gap="md">
            <Text size="sm">
              We accept payments via <strong>Sadad Payment Gateway</strong> — powered
              by Bank Dhofar Open Banking. When you check out, you can pay directly
              from your Bank Dhofar account with instant bank-to-bank transfers.
            </Text>

            <Paper p="md" radius="md" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <Group gap="sm" mb="xs">
                <IconShieldCheck size={18} color="#16a34a" stroke={1.5} />
                <Text size="sm" fw={600} c="teal.8">
                  Secure & Direct
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                Your payment goes directly from your bank account to ours.
                No card numbers. No middlemen. Instant confirmation.
                Protected by Bank Dhofar's Open Banking security standards.
              </Text>
            </Paper>

            <Divider />

            <Text size="xs" c="dimmed" ta="center">
              Payment Methods: Bank Dhofar (via Sadad) | Card &amp; Apple Pay coming soon
            </Text>
          </Stack>
        </Paper>

        {/* Location */}
        <Paper shadow="sm" radius="md" p="lg" withBorder>
          <Group gap="sm" mb="md">
            <IconMapPin size={24} color="#D35400" stroke={1.5} />
            <Text fw={600} size="lg">
              Visit Us
            </Text>
          </Group>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Address</Text>
              <Text size="sm" fw={500}>Salalah, Dhofar Governorate, Oman</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Phone</Text>
              <Text size="sm" fw={500} style={{ fontFamily: 'monospace' }}>+968 2329 5000</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">Email</Text>
              <Text size="sm" fw={500}>info@salalah-souq.com</Text>
            </Group>
          </Stack>
        </Paper>

        {/* Footer */}
        <Text size="xs" c="dimmed" ta="center" mt="xl">
          Salalah Souq / {'\u0635\u0644\u0627\u0644\u0629 \u0633\u0648\u0642'} — Payments powered by Sadad
        </Text>
      </Container>
    </Box>
  );
}
