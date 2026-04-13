import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  Container,
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
  IconChartBar,
  IconCash,
  IconUsers,
  IconFileInvoice,
  IconArrowRight,
  IconBuildingBank,
  IconShieldCheck,
} from '@tabler/icons-react';
import { signup, login, isLoggedIn } from '@/utils/auth';

const FEATURES = [
  {
    icon: IconChartBar,
    title: 'Revenue Analytics',
    titleAr: '\u062A\u062D\u0644\u064A\u0644 \u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A',
    description: 'Track your daily and monthly revenue with visual breakdowns and trend analysis.',
    color: '#00B894',
  },
  {
    icon: IconCash,
    title: 'Cash Flow',
    titleAr: '\u0627\u0644\u062A\u062F\u0641\u0642 \u0627\u0644\u0646\u0642\u062F\u064A',
    description: 'Monitor income vs expenses in real-time to keep your business cash flow healthy.',
    color: '#00CEC9',
  },
  {
    icon: IconUsers,
    title: 'Customer Insights',
    titleAr: '\u0631\u0624\u0649 \u0627\u0644\u0639\u0645\u0644\u0627\u0621',
    description: 'Identify your top customers by transaction volume and total spending.',
    color: '#0984e3',
  },
  {
    icon: IconFileInvoice,
    title: 'Invoice Matching',
    titleAr: '\u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631',
    description: 'Match incoming payments against outstanding invoices automatically.',
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
    <Box style={{ minHeight: '100vh', background: '#fafefe' }}>
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
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00B894, #00CEC9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text c="white" fw={700} size="xl">H</Text>
              </Box>
              <Box>
                <Text fw={700} size="xl" c="teal.7">Hisab</Text>
                <Text size="xs" c="dimmed" mt={-4}>Smart Business Insights</Text>
              </Box>
            </Group>
            <Group gap="sm">
              <Button variant="subtle" color="teal" onClick={() => setAuthModal('login')}>
                Sign In
              </Button>
              <Button color="teal" onClick={() => setAuthModal('signup')}>
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
          background: 'linear-gradient(135deg, #00B894 0%, #00CEC9 50%, #0984e3 100%)',
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
              <Text
                size="lg"
                fw={600}
                c="rgba(255,255,255,0.85)"
                mb="xs"
                style={{ fontFamily: 'serif', letterSpacing: 1 }}
              >
                {'\u062D\u0633\u0627\u0628'}
              </Text>
              <Title order={1} c="white" size={48} ta="center" style={{ lineHeight: 1.2 }}>
                Smart Business Insights
                <br />
                for Omani Merchants
              </Title>
              <Text size="xl" c="rgba(255,255,255,0.85)" ta="center" mt="md" maw={600} mx="auto">
                {'\u0631\u0624\u0649 \u0623\u0639\u0645\u0627\u0644 \u0630\u0643\u064A\u0629 \u0644\u0644\u062A\u062C\u0627\u0631 \u0627\u0644\u0639\u0645\u0627\u0646\u064A\u064A\u0646'}
              </Text>
              <Text size="md" c="rgba(255,255,255,0.7)" ta="center" mt="sm" maw={500} mx="auto">
                Connect your Bank Dhofar business account and get real-time revenue analytics,
                cash flow insights, and customer intelligence.
              </Text>
            </Box>
            <Group gap="md">
              <Button
                size="lg"
                color="white"
                variant="filled"
                c="teal.7"
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
          <Text size="xs" tt="uppercase" fw={700} c="teal" style={{ letterSpacing: 2 }}>
            Features
          </Text>
          <Title order={2} ta="center">
            Everything your business needs
          </Title>
          <Text c="dimmed" ta="center" maw={500}>
            Hisab connects securely to your Bank Dhofar business account using Open Banking APIs
            to give you actionable business intelligence.
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
          {FEATURES.map((feature) => (
            <Card key={feature.title} shadow="sm" padding="xl" radius="lg" withBorder>
              <ThemeIcon
                size={56}
                radius="xl"
                variant="light"
                color="teal"
                style={{ background: `${feature.color}15` }}
              >
                <feature.icon size={28} color={feature.color} />
              </ThemeIcon>
              <Text fw={600} size="lg" mt="md">{feature.title}</Text>
              <Text size="sm" c="teal.5" mt={2}>{feature.titleAr}</Text>
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
              { step: '1', title: 'Create Account', titleAr: '\u0625\u0646\u0634\u0627\u0621 \u062D\u0633\u0627\u0628', desc: 'Sign up for Hisab with your business email in seconds.' },
              { step: '2', title: 'Connect Bank Dhofar', titleAr: '\u0631\u0628\u0637 \u0628\u0646\u0643 \u0638\u0641\u0627\u0631', desc: 'Securely link your business bank account via Open Banking consent.' },
              { step: '3', title: 'Get Insights', titleAr: '\u0627\u062D\u0635\u0644 \u0639\u0644\u0649 \u0631\u0624\u0649', desc: 'See revenue analytics, cash flow, top customers, and transaction trends.' },
            ].map((item) => (
              <Paper key={item.step} p="xl" radius="lg" ta="center">
                <Box
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #00B894, #00CEC9)',
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
                <Text size="xs" c="teal.5" mt={2}>{item.titleAr}</Text>
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
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #00B894, #00CEC9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text c="white" fw={700} size="sm">H</Text>
              </Box>
              <Text size="sm" c="dimmed">Hisab - Smart Business Insights</Text>
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
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #00B894, #00CEC9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text c="white" fw={700}>H</Text>
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
              label="Business Name"
              placeholder="Salalah Souq"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
          )}
          <TextInput
            label="Email"
            placeholder="info@your-business.com"
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
            color="teal"
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
