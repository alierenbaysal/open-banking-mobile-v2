import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  Container,
  Grid,
  Group,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  PasswordInput,
  Title,
  ThemeIcon,
  Anchor,
  Divider,
} from '@mantine/core';
import {
  IconChartPie,
  IconCreditCard,
  IconSearch,
  IconShieldCheck,
  IconArrowRight,
  IconBuildingBank,
} from '@tabler/icons-react';
import { signup, login, isLoggedIn } from '@/utils/auth';

const FEATURES = [
  {
    icon: IconChartPie,
    title: 'Spending Insights',
    description: 'See where your money goes with automatic transaction categorization and beautiful breakdowns.',
    color: '#6C5CE7',
  },
  {
    icon: IconCreditCard,
    title: 'Multi-Account View',
    description: 'View all your Bank Dhofar accounts in one place with real-time balances.',
    color: '#00b894',
  },
  {
    icon: IconSearch,
    title: 'Transaction Search',
    description: 'Find any transaction instantly with powerful filters by date, amount, and category.',
    color: '#0984e3',
  },
  {
    icon: IconShieldCheck,
    title: 'Bank-Grade Security',
    description: 'Your data stays at the bank. We use Open Banking APIs with your explicit consent.',
    color: '#e17055',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [authModal, setAuthModal] = useState<'login' | 'signup' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  // If already logged in, redirect to dashboard
  if (isLoggedIn()) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  const handleSignup = async () => {
    setError('');
    const result = await signup(email, password, name);
    if (result.ok) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  const handleLogin = async () => {
    setError('');
    const result = await login(email, password);
    if (result.ok) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  return (
    <Box style={{ minHeight: '100vh', background: '#fafafe' }}>
      {/* Header */}
      <Box
        component="header"
        py="md"
        px="xl"
        style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #f0f0f0' }}
      >
        <Container size="xl">
          <Group justify="space-between">
            <Group gap="sm">
              <Box
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text c="white" fw={700} size="xl">M</Text>
              </Box>
              <Box>
                <Text fw={700} size="xl" c="violet.7">Masroofi</Text>
                <Text size="xs" c="dimmed" mt={-4}>Personal Finance Manager</Text>
              </Box>
            </Group>
            <Group gap="sm">
              <Button variant="subtle" color="violet" onClick={() => setAuthModal('login')}>
                Sign In
              </Button>
              <Button color="violet" onClick={() => setAuthModal('signup')}>
                Get Started
              </Button>
            </Group>
          </Group>
        </Container>
      </Box>

      {/* Hero */}
      <Box
        py={80}
        style={{
          background: 'linear-gradient(135deg, #6C5CE7 0%, #a29bfe 50%, #00b894 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 60%)',
          }}
        />
        <Container size="lg" style={{ position: 'relative', zIndex: 1 }}>
          <Stack align="center" gap="xl">
            <Box ta="center">
              <Title order={1} c="white" size={48} ta="center" style={{ lineHeight: 1.2 }}>
                Track Your Spending,
                <br />
                Manage Your Money
              </Title>
              <Text size="md" c="rgba(255,255,255,0.7)" ta="center" mt="sm" maw={500} mx="auto">
                Connect your Bank Dhofar account and get instant insights into your finances
                with Oman's first Open Banking personal finance app.
              </Text>
            </Box>
            <Group gap="md">
              <Button
                size="lg"
                color="white"
                variant="filled"
                c="violet.7"
                rightSection={<IconArrowRight size={18} />}
                onClick={() => setAuthModal('signup')}
              >
                Get Started Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                color="white"
                styles={{
                  root: { borderColor: 'rgba(255,255,255,0.5)', color: 'white' },
                }}
                onClick={() => setAuthModal('login')}
              >
                Sign In
              </Button>
            </Group>
            <Group gap="xl" mt="lg">
              <Group gap={6}>
                <IconShieldCheck size={16} color="rgba(255,255,255,0.8)" />
                <Text size="xs" c="rgba(255,255,255,0.8)">Bank-grade security</Text>
              </Group>
              <Group gap={6}>
                <IconBuildingBank size={16} color="rgba(255,255,255,0.8)" />
                <Text size="xs" c="rgba(255,255,255,0.8)">Powered by Open Banking</Text>
              </Group>
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* Features */}
      <Container size="lg" py={60}>
        <Stack align="center" mb={40}>
          <Text size="xs" tt="uppercase" fw={700} c="violet" style={{ letterSpacing: 2 }}>
            Features
          </Text>
          <Title order={2} ta="center">
            Everything you need to manage your money
          </Title>
          <Text c="dimmed" ta="center" maw={500}>
            Masroofi connects securely to your Bank Dhofar account using Open Banking APIs
            to give you a complete picture of your finances.
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
          {FEATURES.map((feature) => (
            <Card key={feature.title} shadow="sm" padding="xl" radius="lg" withBorder>
              <ThemeIcon
                size={56}
                radius="xl"
                variant="light"
                color="violet"
                style={{ background: `${feature.color}15` }}
              >
                <feature.icon size={28} color={feature.color} />
              </ThemeIcon>
              <Text fw={600} size="lg" mt="md">{feature.title}</Text>
              <Text size="sm" c="dimmed" mt="sm">{feature.description}</Text>
            </Card>
          ))}
        </SimpleGrid>
      </Container>

      {/* How it works */}
      <Box bg="gray.0" py={60}>
        <Container size="lg">
          <Stack align="center" mb={40}>
            <Text size="xs" tt="uppercase" fw={700} c="teal" style={{ letterSpacing: 2 }}>
              How It Works
            </Text>
            <Title order={2} ta="center">
              Three simple steps
            </Title>
          </Stack>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xl">
            {[
              { step: '1', title: 'Create Account', desc: 'Sign up for Masroofi with your email in seconds.' },
              { step: '2', title: 'Connect Bank Dhofar', desc: 'Securely link your bank account via Open Banking consent.' },
              { step: '3', title: 'Get Insights', desc: 'See your spending breakdown, balances, and transaction history.' },
            ].map((item) => (
              <Paper key={item.step} p="xl" radius="lg" ta="center">
                <Box
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    marginBottom: 16,
                  }}
                >
                  <Text c="white" fw={700} size="lg">{item.step}</Text>
                </Box>
                <Text fw={600} size="lg">{item.title}</Text>
                <Text size="sm" c="dimmed" mt="xs">{item.desc}</Text>
              </Paper>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* Footer */}
      <Box py="xl" style={{ borderTop: '1px solid #f0f0f0' }}>
        <Container size="lg">
          <Group justify="space-between">
            <Group gap="sm">
              <Box
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text c="white" fw={700} size="sm">M</Text>
              </Box>
              <Text size="sm" c="dimmed">Masroofi - Personal Finance Manager</Text>
            </Group>
            <Group gap="xs">
              <Text size="xs" c="dimmed">Powered by</Text>
              <Box
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  background: '#4D9134',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text c="white" fw={700} size="xs">Q</Text>
              </Box>
              <Text size="xs" fw={500}>Bank Dhofar Open Banking</Text>
            </Group>
          </Group>
        </Container>
      </Box>

      {/* Auth Modal */}
      <Modal
        opened={authModal !== null}
        onClose={() => { setAuthModal(null); setError(''); }}
        title={
          <Group gap="sm">
            <Box
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text c="white" fw={700}>M</Text>
            </Box>
            <Text fw={600}>{authModal === 'signup' ? 'Create Account' : 'Sign In'}</Text>
          </Group>
        }
        centered
        size="sm"
      >
        <Stack gap="md">
          {authModal === 'signup' && (
            <TextInput
              label="Full Name"
              placeholder="Ahmed Al-Rashdi"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
          )}
          <TextInput
            label="Email"
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
          <PasswordInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                authModal === 'signup' ? handleSignup() : handleLogin();
              }
            }}
          />
          {error && (
            <Text size="sm" c="red">{error}</Text>
          )}
          <Button
            fullWidth
            color="violet"
            onClick={authModal === 'signup' ? handleSignup : handleLogin}
          >
            {authModal === 'signup' ? 'Create Account' : 'Sign In'}
          </Button>
          <Divider label="or" labelPosition="center" />
          {authModal === 'signup' ? (
            <Text size="sm" ta="center" c="dimmed">
              Already have an account?{' '}
              <Anchor onClick={() => { setAuthModal('login'); setError(''); }}>
                Sign In
              </Anchor>
            </Text>
          ) : (
            <Text size="sm" ta="center" c="dimmed">
              Don't have an account?{' '}
              <Anchor onClick={() => { setAuthModal('signup'); setError(''); }}>
                Create Account
              </Anchor>
            </Text>
          )}
        </Stack>
      </Modal>
    </Box>
  );
}
