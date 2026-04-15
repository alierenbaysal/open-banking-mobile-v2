import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Stack,
  Text,
  Title,
  Group,
  Avatar,
  UnstyledButton,
  Box,
  Badge,
} from '@mantine/core';
import { SALESPEOPLE, setCurrentSalesperson } from '@/utils/auth';
import type { Salesperson } from '@/utils/types';

export default function Login() {
  const navigate = useNavigate();

  const pick = (sp: Salesperson) => {
    setCurrentSalesperson(sp);
    navigate('/inventory');
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse at top, rgba(255,193,7,0.15), transparent 55%), linear-gradient(180deg,#0f0f11 0%,#18181b 100%)',
        display: 'flex',
        alignItems: 'center',
        padding: '40px 16px',
      }}
    >
      <Container size="sm" w="100%" className="fade-up">
        <Stack align="center" gap="xl">
          <Stack align="center" gap="sm">
            <Box
              style={{
                width: 80,
                height: 80,
                borderRadius: 22,
                background: 'linear-gradient(135deg,#ffd54a,#ffc107 60%,#c9961d)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 16px 48px -12px rgba(255,193,7,0.6)',
              }}
            >
              <Text c="#18181b" fw={900} fz={48} lh={1}>
                M
              </Text>
            </Box>
            <Title order={1} c="#fafafa" ta="center">
              <span className="gold-gradient-text">Muscat Motors</span>
            </Title>
            <Text c="#a1a1aa" ta="center" size="lg">
              Premium Dealer Showroom Portal
            </Text>
            <Badge
              variant="gradient"
              gradient={{ from: '#ffc107', to: '#c9961d', deg: 90 }}
              size="md"
              styles={{ root: { color: '#18181b', fontWeight: 700, letterSpacing: 1 } }}
            >
              SANDBOX
            </Badge>
          </Stack>

          <Paper
            w="100%"
            p="xl"
            style={{
              background: 'rgba(24,24,27,0.8)',
              border: '1px solid #27272a',
              backdropFilter: 'blur(8px)',
            }}
            radius="lg"
          >
            <Stack gap="md">
              <Text fw={600} c="#fafafa" size="lg">
                Select your profile
              </Text>
              <Text size="sm" c="#a1a1aa" mb="xs">
                Kiosk sign-in. Pick who's working the floor today.
              </Text>
              <Stack gap="sm">
                {SALESPEOPLE.map((sp) => (
                  <UnstyledButton
                    key={sp.id}
                    onClick={() => pick(sp)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 12,
                      background: 'rgba(39,39,42,0.6)',
                      border: '1px solid #27272a',
                      transition: 'all 200ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#ffc107';
                      e.currentTarget.style.background = 'rgba(39,39,42,0.9)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#27272a';
                      e.currentTarget.style.background = 'rgba(39,39,42,0.6)';
                    }}
                  >
                    <Group justify="space-between">
                      <Group>
                        <Avatar
                          size="lg"
                          radius="xl"
                          styles={{
                            root: { background: sp.avatarBg },
                            placeholder: { color: '#18181b', fontWeight: 800, fontSize: 18 },
                          }}
                        >
                          {sp.initials}
                        </Avatar>
                        <Box>
                          <Text fw={600} c="#fafafa" size="md">
                            {sp.name}
                          </Text>
                          <Text size="sm" c="#a1a1aa">
                            {sp.branch}
                          </Text>
                        </Box>
                      </Group>
                      <Text size="sm" c="#ffc107" fw={600}>
                        Sign in →
                      </Text>
                    </Group>
                  </UnstyledButton>
                ))}
              </Stack>
            </Stack>
          </Paper>

          <Text size="xs" c="#71717a" ta="center">
            Powered by Bank Dhofar Open Finance · Auto-Lending APIs v1.0
          </Text>
        </Stack>
      </Container>
    </Box>
  );
}
