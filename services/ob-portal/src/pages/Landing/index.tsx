import {
  Container,
  Title,
  Text,
  Button,
  Group,
  SimpleGrid,
  Card,
  ThemeIcon,
  Stack,
  Box,
  Badge,
  Divider,
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import {
  IconBuildingBank,
  IconCreditCard,
  IconRepeat,
  IconShieldCheck,
  IconBell,
  IconArrowRight,
  IconApi,
  IconTerminal2,
  IconBook,
} from '@tabler/icons-react';

const API_FEATURES = [
  {
    icon: IconBuildingBank,
    title: 'Account Information',
    titleAr: 'معلومات الحساب',
    description: 'Access account balances, transactions, and statements with AISP permissions.',
    color: 'blue',
    endpoints: 23,
    tag: 'AIS',
  },
  {
    icon: IconCreditCard,
    title: 'Payment Initiation',
    titleAr: 'بدء الدفع',
    description: 'Initiate domestic and international payments with PISP permissions.',
    color: 'green',
    endpoints: 18,
    tag: 'PIS',
  },
  {
    icon: IconRepeat,
    title: 'Variable Recurring Payments',
    titleAr: 'المدفوعات المتكررة المتغيرة',
    description: 'Set up and manage recurring payment mandates with flexible parameters.',
    color: 'violet',
    endpoints: 6,
    tag: 'VRP',
  },
  {
    icon: IconShieldCheck,
    title: 'Funds Confirmation',
    titleAr: 'تأكيد الأموال',
    description: 'Verify available funds before completing a transaction with CBPII.',
    color: 'orange',
    endpoints: 4,
    tag: 'CoF',
  },
  {
    icon: IconBell,
    title: 'Events & Notifications',
    titleAr: 'الأحداث والإشعارات',
    description: 'Subscribe to real-time event notifications for account and payment changes.',
    color: 'red',
    endpoints: 7,
    tag: 'Events',
  },
];

const GETTING_STARTED_STEPS = [
  {
    icon: IconBook,
    title: 'Read the Docs',
    description: 'Explore our comprehensive API documentation and integration guides.',
    action: '/getting-started',
    actionLabel: 'Getting Started Guide',
  },
  {
    icon: IconApi,
    title: 'Browse APIs',
    description: 'Explore the full API catalog with schemas, examples, and endpoint details.',
    action: '/apis',
    actionLabel: 'API Catalog',
  },
  {
    icon: IconTerminal2,
    title: 'Try the Sandbox',
    description: 'Generate tokens and test API calls in our interactive sandbox environment.',
    action: '/sandbox',
    actionLabel: 'Open Sandbox',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <Box>
      {/* Hero Section */}
      <Box
        py={80}
        style={{
          background: 'linear-gradient(135deg, #4D9134 0%, #326323 100%)',
          borderRadius: 'var(--mantine-radius-lg)',
          marginBottom: 'var(--mantine-spacing-xl)',
        }}
      >
        <Container size="lg">
          <Stack align="center" gap="lg">
            <Badge size="lg" variant="white" color="bankGreen" radius="sm">
              OBIE v4.0 Compliant
            </Badge>
            <Title
              order={1}
              ta="center"
              c="white"
              fz={44}
              fw={800}
              lh={1.1}
            >
              Qantara
            </Title>
            <Text
              ta="center"
              c="white"
              fz="xl"
              maw={600}
              style={{ opacity: 0.95 }}
            >
              Your bridge to Bank Dhofar's Open Banking APIs
            </Text>
            <Text
              ta="center"
              c="white"
              fz="lg"
              style={{ opacity: 0.8, fontFamily: 'serif' }}
              dir="rtl"
            >
              {'قنطرة — جسرك إلى الخدمات المصرفية المفتوحة لبنك ظفار'}
            </Text>
            <Group mt="md">
              <Button
                size="lg"
                variant="white"
                color="bankGreen"
                rightSection={<IconArrowRight size={18} />}
                onClick={() => navigate('/getting-started')}
              >
                Get Started
              </Button>
              <Button
                size="lg"
                variant="outline"
                color="white"
                onClick={() => navigate('/apis')}
                styles={{
                  root: {
                    borderColor: 'rgba(255,255,255,0.5)',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                  },
                }}
              >
                Explore APIs
              </Button>
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* Stats Bar */}
      <Container size="lg" mb="xl">
        <Card withBorder p="lg">
          <Group justify="center" gap={60}>
            <Stack align="center" gap={4}>
              <Text fz={28} fw={800} c="bankGreen">64</Text>
              <Text size="sm" c="dimmed">API Endpoints</Text>
            </Stack>
            <Divider orientation="vertical" />
            <Stack align="center" gap={4}>
              <Text fz={28} fw={800} c="bankGreen">v4.0</Text>
              <Text size="sm" c="dimmed">OBIE Compliant</Text>
            </Stack>
            <Divider orientation="vertical" />
            <Stack align="center" gap={4}>
              <Text fz={28} fw={800} c="bankGreen">5</Text>
              <Text size="sm" c="dimmed">API Groups</Text>
            </Stack>
            <Divider orientation="vertical" />
            <Stack align="center" gap={4}>
              <Text fz={28} fw={800} c="green">Live</Text>
              <Text size="sm" c="dimmed">Sandbox Ready</Text>
            </Stack>
          </Group>
        </Card>
      </Container>

      {/* API Features */}
      <Container size="lg" mb={60}>
        <Stack gap="lg">
          <div>
            <Text size="sm" fw={600} c="bankGreen" tt="uppercase" mb={4}>
              API Suite
            </Text>
            <Title order={2}>Comprehensive Open Banking APIs</Title>
            <Text c="dimmed" mt="xs" maw={600}>
              Build powerful financial applications with our OBIE v4.0 compliant APIs.
              Full coverage for account information, payments, recurring payments, and more.
            </Text>
          </div>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {API_FEATURES.map((feature) => (
              <Card
                key={feature.tag}
                withBorder
                padding="lg"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/apis/${feature.tag.toLowerCase()}`)}
              >
                <Group justify="space-between" mb="md">
                  <ThemeIcon size={44} radius="md" color={feature.color} variant="light">
                    <feature.icon size={24} />
                  </ThemeIcon>
                  <Badge variant="light" color={feature.color}>
                    {feature.endpoints} endpoints
                  </Badge>
                </Group>
                <Text fw={600} size="lg" mb={4}>{feature.title}</Text>
                <Text size="sm" c="dimmed" dir="rtl" mb="xs" style={{ fontFamily: 'serif' }}>
                  {feature.titleAr}
                </Text>
                <Text size="sm" c="dimmed" lh={1.5}>
                  {feature.description}
                </Text>
              </Card>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>

      {/* Getting Started Section */}
      <Container size="lg" mb={60}>
        <Stack gap="lg">
          <div>
            <Text size="sm" fw={600} c="bankGreen" tt="uppercase" mb={4}>
              Quick Start
            </Text>
            <Title order={2}>Start Building in Minutes</Title>
            <Text c="dimmed" mt="xs" maw={600}>
              From registration to your first API call in three simple steps.
            </Text>
          </div>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
            {GETTING_STARTED_STEPS.map((step, index) => (
              <Card key={step.title} withBorder padding="lg">
                <Group mb="md" gap="xs">
                  <ThemeIcon size={32} radius="xl" color="bankGreen" variant="light">
                    <Text fw={700} size="sm">{index + 1}</Text>
                  </ThemeIcon>
                  <Text fw={600} size="lg">{step.title}</Text>
                </Group>
                <Text size="sm" c="dimmed" mb="md" lh={1.5}>
                  {step.description}
                </Text>
                <Button
                  variant="light"
                  size="sm"
                  rightSection={<IconArrowRight size={14} />}
                  onClick={() => navigate(step.action)}
                >
                  {step.actionLabel}
                </Button>
              </Card>
            ))}
          </SimpleGrid>
        </Stack>
      </Container>

      {/* Footer Note */}
      <Container size="lg" mb="xl">
        <Card
          withBorder
          p="lg"
          style={{
            background: 'linear-gradient(135deg, rgba(77,145,52,0.05) 0%, rgba(50,99,35,0.05) 100%)',
          }}
        >
          <Group>
            <ThemeIcon size={48} color="bankGreen" variant="light" radius="md">
              <IconShieldCheck size={28} />
            </ThemeIcon>
            <div>
              <Text fw={600}>Central Bank of Oman Regulated</Text>
              <Text size="sm" c="dimmed">
                Bank Dhofar's Open Banking platform is fully compliant with the Central Bank of Oman's
                Open Banking Framework and OBIE UK v4.0 standards.
              </Text>
            </div>
          </Group>
        </Card>
      </Container>
    </Box>
  );
}
