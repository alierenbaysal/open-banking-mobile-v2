import { Stack, Text, ThemeIcon, Button, Box } from '@mantine/core';
import { IconBuildingBank, IconMoodSad } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

interface EmptyStateProps {
  type?: 'no-bank' | 'no-data' | 'error';
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ type = 'no-bank', title, description, action }: EmptyStateProps) {
  const navigate = useNavigate();

  const defaults = {
    'no-bank': {
      icon: IconBuildingBank,
      color: 'violet',
      title: 'Connect Your Bank to Get Started',
      description: 'Link your Bank Dhofar account to view your financial data, track spending, and get insights.',
      action: { label: 'Connect Bank Dhofar', onClick: () => navigate('/connect') },
    },
    'no-data': {
      icon: IconMoodSad,
      color: 'gray',
      title: 'No Data Available',
      description: 'There is no data to display at the moment. Try refreshing or check back later.',
      action: undefined,
    },
    error: {
      icon: IconMoodSad,
      color: 'red',
      title: 'Something Went Wrong',
      description: 'We encountered an error loading your data. Please try again.',
      action: undefined,
    },
  };

  const config = defaults[type];
  const Icon = config.icon;
  const finalAction = action || config.action;

  return (
    <Box py={60}>
      <Stack align="center" gap="lg">
        <ThemeIcon size={80} radius="xl" color={config.color} variant="light">
          <Icon size={40} />
        </ThemeIcon>
        <Text fw={700} size="xl" ta="center">{title || config.title}</Text>
        <Text size="sm" c="dimmed" ta="center" maw={500}>
          {description || config.description}
        </Text>
        {finalAction && (
          <Button color="violet" size="md" onClick={finalAction.onClick}>
            {finalAction.label}
          </Button>
        )}
      </Stack>
    </Box>
  );
}
