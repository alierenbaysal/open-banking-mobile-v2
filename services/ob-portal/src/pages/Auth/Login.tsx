import {
  Container,
  Card,
  Title,
  Text,
  Stack,
  Button,
  Group,
  Anchor,
  ThemeIcon,
  Box,
} from '@mantine/core';
import { IconBrandWindows } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

const SSO_LOGIN_URL = '/portal-api/auth/sso/login';

export default function LoginPage() {
  const signIn = () => {
    // Full-page redirect — the BFF kicks off the OIDC flow with Microsoft,
    // then redirects back to `/` with the session cookie set.
    window.location.href = SSO_LOGIN_URL;
  };

  return (
    <Container size={420} py={60}>
      <Stack align="center" gap="lg">
        <Box ta="center">
          <ThemeIcon size={56} radius="xl" color="bankGreen" variant="light" mb="sm">
            <IconBrandWindows size={28} />
          </ThemeIcon>
          <Title order={2}>Sign in to Qantara</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Access your developer portal and TPP applications.
          </Text>
        </Box>

        <Card withBorder w="100%" p="xl">
          <Stack gap="md">
            <Button
              fullWidth
              size="md"
              leftSection={<IconBrandWindows size={18} />}
              onClick={signIn}
            >
              Sign in with Microsoft
            </Button>
            <Text size="xs" c="dimmed" ta="center">
              Bank staff and approved partners sign in with their Microsoft account.
            </Text>
          </Stack>
        </Card>

        <Group gap={4}>
          <Text size="sm" c="dimmed">
            New partner?
          </Text>
          <Anchor size="sm" component={Link} to="/signup">
            Request access
          </Anchor>
        </Group>
      </Stack>
    </Container>
  );
}
