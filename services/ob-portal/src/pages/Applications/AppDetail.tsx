import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  Group,
  Badge,
  Button,
  Breadcrumbs,
  Anchor,
  CopyButton,
  ActionIcon,
  Tooltip,
  Divider,
  TextInput,
  Table,
  Alert,
  FileInput,
  Tabs,
  ThemeIcon,
  Box,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useParams, useNavigate } from 'react-router-dom';
import {
  IconCopy,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconRefresh,
  IconUpload,
  IconCertificate,
  IconKey,
  IconSettings,
  IconTrash,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useState } from 'react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { type TppApplication } from './index';

// Demo data — same as in index.tsx for cross-navigation
const DEMO_APPS: TppApplication[] = [
  {
    id: 'app-001',
    name: 'FinTech PFM App',
    description: 'Personal finance management application for account aggregation and budgeting.',
    clientId: 'pfm-app-sandbox-001',
    clientSecret: 'sb_sec_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
    status: 'active',
    roles: ['AISP'],
    redirectUris: ['https://pfm.example.com/callback', 'https://pfm.example.com/auth/redirect'],
    createdAt: '2026-04-01T10:00:00Z',
    environment: 'sandbox',
  },
  {
    id: 'app-002',
    name: 'PayConnect Gateway',
    description: 'Payment gateway for e-commerce merchants integrating with Bank Dhofar.',
    clientId: 'payconnect-sandbox-002',
    clientSecret: 'sb_sec_q1w2e3r4t5y6u7i8o9p0a1s2d3f4g5h6',
    status: 'active',
    roles: ['PISP', 'CBPII'],
    redirectUris: ['https://pay.example.com/callback'],
    createdAt: '2026-04-05T14:30:00Z',
    environment: 'sandbox',
  },
  {
    id: 'app-003',
    name: 'Sweeping Service',
    description: 'Automated savings sweep service using Variable Recurring Payments.',
    clientId: 'sweep-sandbox-003',
    clientSecret: 'sb_sec_z1x2c3v4b5n6m7k8j9h0g1f2d3s4a5q6',
    status: 'pending',
    roles: ['AISP', 'PISP'],
    redirectUris: ['https://sweep.example.com/auth'],
    createdAt: '2026-04-10T09:15:00Z',
    environment: 'sandbox',
  },
];

function CopyableField({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <Group justify="space-between" py="xs" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
      <Text size="sm" c="dimmed" w={160}>{label}</Text>
      <Group gap="xs">
        <Text size="sm" fw={500} ff={mono ? 'monospace' : undefined}>{value}</Text>
        <CopyButton value={value}>
          {({ copied, copy }) => (
            <Tooltip label={copied ? 'Copied' : 'Copy'}>
              <ActionIcon variant="subtle" color={copied ? 'green' : 'gray'} onClick={copy} size="sm">
                {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              </ActionIcon>
            </Tooltip>
          )}
        </CopyButton>
      </Group>
    </Group>
  );
}

export default function AppDetail() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [secretVisible, setSecretVisible] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [regenerateConfirm, { open: openRegenerate, close: closeRegenerate }] = useDisclosure(false);

  const app = DEMO_APPS.find((a) => a.id === appId);

  if (!isAuthenticated) {
    navigate('/applications');
    return null;
  }

  if (!app) {
    return (
      <Container size="lg">
        <Stack gap="md">
          <Text>Application not found.</Text>
          <Button variant="light" onClick={() => navigate('/applications')}>
            Back to Applications
          </Button>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="lg">
      <Stack gap="lg">
        <Breadcrumbs>
          <Anchor onClick={() => navigate('/applications')} size="sm">My Applications</Anchor>
          <Text size="sm">{app.name}</Text>
        </Breadcrumbs>

        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="sm" mb="xs">
              <Title order={2}>{app.name}</Title>
              <StatusBadge status={app.status} />
              <Badge variant="light" color="blue" size="sm">{app.environment}</Badge>
            </Group>
            <Text c="dimmed">{app.description}</Text>
          </div>
          <Group gap="xs">
            {app.roles.map((role) => (
              <Badge key={role} variant="outline">{role}</Badge>
            ))}
          </Group>
        </Group>

        <Tabs defaultValue="credentials">
          <Tabs.List>
            <Tabs.Tab value="credentials" leftSection={<IconKey size={16} />}>Credentials</Tabs.Tab>
            <Tabs.Tab value="certificates" leftSection={<IconCertificate size={16} />}>Certificates</Tabs.Tab>
            <Tabs.Tab value="settings" leftSection={<IconSettings size={16} />}>Settings</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="credentials" pt="lg">
            <Stack gap="md">
              <Card withBorder>
                <Text fw={600} mb="md">OAuth2 Credentials</Text>
                <CopyableField label="Client ID" value={app.clientId} />
                <Group justify="space-between" py="xs" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
                  <Text size="sm" c="dimmed" w={160}>Client Secret</Text>
                  <Group gap="xs">
                    <Text size="sm" fw={500} ff="monospace">
                      {secretVisible ? app.clientSecret : '\u2022'.repeat(32)}
                    </Text>
                    <Tooltip label={secretVisible ? 'Hide' : 'Reveal'}>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        onClick={() => setSecretVisible(!secretVisible)}
                        size="sm"
                      >
                        {secretVisible ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                      </ActionIcon>
                    </Tooltip>
                    <CopyButton value={app.clientSecret}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? 'Copied' : 'Copy'}>
                          <ActionIcon variant="subtle" color={copied ? 'green' : 'gray'} onClick={copy} size="sm">
                            {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                  </Group>
                </Group>
                <CopyableField label="Environment" value={app.environment} mono={false} />
                <CopyableField label="Created" value={new Date(app.createdAt).toLocaleString()} mono={false} />
              </Card>

              <Card withBorder>
                <Text fw={600} mb="md">Token Endpoint</Text>
                <CopyableField
                  label="URL"
                  value="https://auth.qantara.tnd.bankdhofar.com/realms/open-banking/protocol/openid-connect/token"
                />
                <CopyableField label="Grant Type" value="client_credentials" />
                <CopyableField label="Scope" value="accounts payments fundsconfirmations" />
              </Card>

              <Card withBorder>
                <Group justify="space-between" mb="md">
                  <Text fw={600}>Regenerate Credentials</Text>
                </Group>
                <Text size="sm" c="dimmed" mb="md">
                  Regenerating credentials will immediately invalidate your current client secret.
                  Any active tokens will continue to work until they expire.
                </Text>
                {regenerateConfirm ? (
                  <Alert color="red" icon={<IconAlertCircle size={16} />} mb="md">
                    <Text size="sm" fw={500}>Are you sure? This cannot be undone.</Text>
                    <Group mt="sm" gap="sm">
                      <Button size="xs" color="red" onClick={() => {
                        closeRegenerate();
                        // In production: call API to regenerate
                      }}>
                        Yes, Regenerate
                      </Button>
                      <Button size="xs" variant="subtle" onClick={closeRegenerate}>
                        Cancel
                      </Button>
                    </Group>
                  </Alert>
                ) : (
                  <Button
                    variant="outline"
                    color="red"
                    leftSection={<IconRefresh size={16} />}
                    onClick={openRegenerate}
                  >
                    Regenerate Secret
                  </Button>
                )}
              </Card>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="certificates" pt="lg">
            <Stack gap="md">
              <Card withBorder>
                <Text fw={600} mb="xs">Transport Certificate</Text>
                <Text size="sm" c="dimmed" mb="md">
                  Upload your QWAC (Qualified Website Authentication Certificate) for mutual TLS
                  authentication. Required for production access.
                </Text>

                <FileInput
                  label="Certificate File"
                  placeholder="Upload .pem or .crt file"
                  accept=".pem,.crt,.cer"
                  leftSection={<IconUpload size={16} />}
                  value={certFile}
                  onChange={setCertFile}
                  mb="md"
                />

                <Button disabled={!certFile} leftSection={<IconUpload size={16} />}>
                  Upload Certificate
                </Button>
              </Card>

              <Card withBorder>
                <Text fw={600} mb="xs">Signing Certificate</Text>
                <Text size="sm" c="dimmed" mb="md">
                  Upload your QSealC (Qualified Electronic Seal Certificate) for request signing.
                  Required for payment initiation in production.
                </Text>

                <FileInput
                  label="Signing Certificate"
                  placeholder="Upload .pem or .crt file"
                  accept=".pem,.crt,.cer"
                  leftSection={<IconUpload size={16} />}
                  mb="md"
                />

                <Button disabled leftSection={<IconUpload size={16} />}>
                  Upload Certificate
                </Button>
              </Card>

              <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
                <Text size="sm">
                  Certificates are not required for sandbox access. For production registration,
                  you will need eIDAS-compliant QWAC and QSealC certificates issued by a qualified
                  trust service provider.
                </Text>
              </Alert>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="settings" pt="lg">
            <Stack gap="md">
              <Card withBorder>
                <Text fw={600} mb="md">Redirect URIs</Text>
                <Table withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>URI</Table.Th>
                      <Table.Th w={80}>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {app.redirectUris.map((uri, idx) => (
                      <Table.Tr key={idx}>
                        <Table.Td>
                          <Text size="sm" ff="monospace">{uri}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <CopyButton value={uri}>
                              {({ copied, copy }) => (
                                <ActionIcon variant="subtle" color={copied ? 'green' : 'gray'} onClick={copy} size="sm">
                                  {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                                </ActionIcon>
                              )}
                            </CopyButton>
                            <ActionIcon variant="subtle" color="red" size="sm">
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
                <Group mt="md">
                  <TextInput placeholder="https://your-app.com/callback" style={{ flex: 1 }} />
                  <Button variant="light" size="sm">Add URI</Button>
                </Group>
              </Card>

              <Card withBorder>
                <Text fw={600} mb="xs">TPP Roles</Text>
                <Text size="sm" c="dimmed" mb="md">
                  Your application is registered with the following roles. Contact support to modify roles.
                </Text>
                <Group gap="xs">
                  {app.roles.map((role) => (
                    <Badge key={role} variant="light" size="lg">{role}</Badge>
                  ))}
                </Group>
              </Card>

              <Divider />

              <Card withBorder style={{ borderColor: 'var(--mantine-color-red-3)' }}>
                <Text fw={600} c="red" mb="xs">Danger Zone</Text>
                <Text size="sm" c="dimmed" mb="md">
                  Deleting this application will immediately revoke all access tokens and remove all
                  configuration. This action cannot be undone.
                </Text>
                <Button variant="outline" color="red" leftSection={<IconTrash size={16} />}>
                  Delete Application
                </Button>
              </Card>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
