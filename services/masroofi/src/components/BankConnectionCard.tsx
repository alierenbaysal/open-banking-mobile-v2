import { Card, Group, Text, Badge, Button, Stack, Box, ThemeIcon } from '@mantine/core';
import { IconBuildingBank, IconPlugConnected, IconPlugConnectedX } from '@tabler/icons-react';
import { isBankConnected, disconnectBank, getStoredConsentId } from '@/utils/consent';
import { useNavigate } from 'react-router-dom';

interface BankConnectionCardProps {
  onDisconnect?: () => void;
}

export default function BankConnectionCard({ onDisconnect }: BankConnectionCardProps) {
  const navigate = useNavigate();
  const connected = isBankConnected();
  const consentId = getStoredConsentId();

  const handleDisconnect = () => {
    disconnectBank();
    onDisconnect?.();
  };

  if (!connected) {
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack align="center" gap="md" py="md">
          <ThemeIcon size={60} radius="xl" color="gray" variant="light">
            <IconBuildingBank size={30} />
          </ThemeIcon>
          <Text fw={600} size="lg" ta="center">Connect Your Bank Account</Text>
          <Text size="sm" c="dimmed" ta="center" maw={400}>
            Link your Bank Dhofar account to see your balances, transactions, and spending insights.
          </Text>
          <Button
            color="violet"
            size="md"
            leftSection={<IconPlugConnected size={18} />}
            onClick={() => navigate('/connect')}
          >
            Connect Bank Dhofar
          </Button>
        </Stack>
      </Card>
    );
  }

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between">
        <Group gap="md">
          <Box
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #4D9134, #6ab04c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconBuildingBank size={26} color="white" />
          </Box>
          <Stack gap={2}>
            <Group gap="xs">
              <Text fw={600}>Bank Dhofar</Text>
              <Badge color="teal" size="sm" variant="filled">Connected</Badge>
            </Group>
            <Text size="xs" c="dimmed">
              Consent: {consentId ? `${consentId.slice(0, 8)}...` : 'Active'}
            </Text>
          </Stack>
        </Group>
        <Button
          variant="subtle"
          color="red"
          size="xs"
          leftSection={<IconPlugConnectedX size={14} />}
          onClick={handleDisconnect}
        >
          Disconnect
        </Button>
      </Group>
    </Card>
  );
}
