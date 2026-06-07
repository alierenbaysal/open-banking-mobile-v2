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
  Tabs,
  ThemeIcon,
  Box,
  Textarea,
  Center,
  Loader,
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
  IconShieldLock,
  IconDownload,
  IconCirclePlus,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useEffect, useState } from 'react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { CodeBlock } from '../../components/common/CodeBlock';
import { useAuth } from '../../hooks/useAuth';
import { api, ApiError } from '../../utils/api';
import { type TppApplication } from './index';
// App data comes from the owner-scoped backend (GET /portal-api/tpp/{id}), not a local store.

interface CertificateInfo {
  subject: string;
  issuer: string;
  serial_number: string;
  not_before: string;
  not_after: string;
  thumbprint: string;
  uploaded_at: string;
}

interface GeneratedCert {
  certificate_pem: string;
  private_key_pem: string;
  certificate: CertificateInfo;
}

interface IpAllowlist {
  tpp_client_id: string;
  cidrs: string[];
}

// Accepts a bare IPv4 address or an IPv4 CIDR (e.g. 10.0.0.0/24).
function isValidCidrOrIp(value: string): boolean {
  const v = value.trim();
  const m = v.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/);
  if (!m) return false;
  for (let i = 1; i <= 4; i++) {
    if (Number(m[i]) > 255) return false;
  }
  if (m[5] !== undefined && Number(m[5]) > 32) return false;
  return true;
}

// Demo data — same as in index.tsx for cross-navigation
// DEMO_APPS removed — application is fetched from the owner-scoped backend.

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
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [secretVisible, setSecretVisible] = useState(false);
  const [regenerateConfirm, { open: openRegenerate, close: closeRegenerate }] = useDisclosure(false);

  const [app, setApp] = useState<TppApplication | undefined>(undefined);
  const [loadingApp, setLoadingApp] = useState(true);

  // Fetch the application from the owner-scoped backend. A partner can only load
  // an app they own (others return 404); admins can load any. No local/demo data.
  useEffect(() => {
    if (!appId) { setLoadingApp(false); return; }
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/portal-api/tpp/${encodeURIComponent(appId)}`, { credentials: 'include' });
        if (!res.ok) throw new Error('not found');
        const t = await res.json();
        if (active) setApp({
          id: t.id || t.client_id,
          name: t.name,
          description: t.description || '',
          clientId: t.client_id,
          clientSecret: '',
          status: t.status === 'active' ? 'active' : t.status === 'pending' ? 'pending' : 'inactive',
          roles: t.roles || [],
          redirectUris: t.redirect_uris || [],
          createdAt: t.created_at || new Date().toISOString(),
          environment: 'sandbox',
        });
      } catch {
        if (active) setApp(undefined);
      } finally {
        if (active) setLoadingApp(false);
      }
    })();
    return () => { active = false; };
  }, [appId]);

  if (authLoading || loadingApp) {
    return (
      <Container size="lg">
        <Center py={80}>
          <Loader color="bankGreen" />
        </Center>
      </Container>
    );
  }

  if (!isAuthenticated) {
    navigate('/login');
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
            <Tabs.Tab value="certificates" leftSection={<IconCertificate size={16} />}>mTLS Certificate</Tabs.Tab>
            <Tabs.Tab value="ip-allowlist" leftSection={<IconShieldLock size={16} />}>IP Allowlist</Tabs.Tab>
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
            <CertificatesTab tppId={app.id} commonName={app.clientId} />
          </Tabs.Panel>

          <Tabs.Panel value="ip-allowlist" pt="lg">
            <IpAllowlistTab tppId={app.id} />
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

function CertMetadataCard({ cert }: { cert: CertificateInfo }) {
  const expired = cert.not_after ? new Date(cert.not_after).getTime() < Date.now() : false;
  return (
    <Card withBorder>
      <Group justify="space-between" mb="md">
        <Text fw={600}>Current Certificate</Text>
        <Badge color={expired ? 'red' : 'green'} variant="light">
          {expired ? 'Expired' : 'Active'}
        </Badge>
      </Group>
      <Stack gap={0}>
        <CertRow label="Subject" value={cert.subject} />
        <CertRow label="Issuer" value={cert.issuer} />
        <CertRow label="Serial" value={cert.serial_number} />
        <CertRow label="Thumbprint" value={cert.thumbprint} />
        <CertRow label="Valid From" value={cert.not_before ? new Date(cert.not_before).toLocaleString() : '—'} mono={false} />
        <CertRow label="Valid Until" value={cert.not_after ? new Date(cert.not_after).toLocaleString() : '—'} mono={false} />
        <CertRow label="Uploaded" value={cert.uploaded_at ? new Date(cert.uploaded_at).toLocaleString() : '—'} mono={false} />
      </Stack>
    </Card>
  );
}

function CertRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <Group justify="space-between" py="xs" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
      <Text size="sm" c="dimmed" w={120} style={{ flexShrink: 0 }}>{label}</Text>
      <Text size="sm" fw={500} ff={mono ? 'monospace' : undefined} ta="right" style={{ wordBreak: 'break-all' }}>
        {value}
      </Text>
    </Group>
  );
}

function CertificatesTab({ tppId, commonName }: { tppId: string; commonName: string }) {
  const [cert, setCert] = useState<CertificateInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [pem, setPem] = useState('');
  const [uploading, setUploading] = useState(false);
  const [cn, setCn] = useState(commonName);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedCert | null>(null);

  const loadCert = async () => {
    setLoading(true);
    try {
      const res = await api.get<CertificateInfo>(`/portal-api/tpp/${tppId}/certificate`);
      setCert(res.data);
    } catch (err) {
      // 404 simply means no certificate on file yet.
      if ((err as ApiError).status !== 404) {
        // leave cert null; non-fatal
      }
      setCert(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tppId]);

  const handleUpload = async () => {
    if (!pem.trim()) return;
    setUploading(true);
    try {
      const res = await api.post<CertificateInfo>(`/portal-api/tpp/${tppId}/certificate`, {
        certificate_pem: pem.trim(),
      });
      setCert(res.data);
      setPem('');
      notifications.show({ title: 'Certificate uploaded', message: 'Your mTLS certificate is now active.', color: 'green' });
    } catch {
      notifications.show({ title: 'Upload failed', message: 'Could not upload the certificate. Check the PEM is valid.', color: 'red' });
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!cn.trim()) return;
    setGenerating(true);
    try {
      const res = await api.post<GeneratedCert>(`/portal-api/tpp/${tppId}/certificate/generate`, {
        common_name: cn.trim(),
      });
      setGenerated(res.data);
      setCert(res.data.certificate);
      notifications.show({
        title: 'Key pair generated',
        message: 'Download your private key now — it is shown only once.',
        color: 'orange',
      });
    } catch {
      notifications.show({ title: 'Generation failed', message: 'Could not generate a key pair. Please try again.', color: 'red' });
    } finally {
      setGenerating(false);
    }
  };

  const downloadKey = () => {
    if (!generated) return;
    const blob = new Blob([generated.private_key_pem], { type: 'application/x-pem-file' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tppId}-private-key.pem`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <Center py={60}><Loader color="bankGreen" /></Center>;
  }

  return (
    <Stack gap="md">
      {cert ? (
        <CertMetadataCard cert={cert} />
      ) : (
        <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
          <Text size="sm">
            No mTLS certificate on file yet. Upload your own certificate below (recommended), or
            generate a key pair for testing.
          </Text>
        </Alert>
      )}

      {/* Primary path — bring your own certificate */}
      <Card withBorder>
        <Group gap="xs" mb="xs">
          <ThemeIcon size={28} radius="md" color="bankGreen" variant="light">
            <IconUpload size={16} />
          </ThemeIcon>
          <Text fw={600}>Upload your certificate</Text>
          <Badge size="sm" variant="light" color="bankGreen">Recommended</Badge>
        </Group>
        <Text size="sm" c="dimmed" mb="md">
          Paste the PEM-encoded transport (QWAC) certificate you use for mutual TLS. This is the
          normal path: you keep control of your private key and only register the public certificate.
        </Text>
        <Textarea
          label="Certificate (PEM)"
          placeholder={'-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----'}
          autosize
          minRows={5}
          maxRows={12}
          styles={{ input: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
          value={pem}
          onChange={(e) => setPem(e.currentTarget.value)}
          mb="md"
        />
        <Button
          leftSection={<IconUpload size={16} />}
          onClick={handleUpload}
          loading={uploading}
          disabled={!pem.trim()}
        >
          {cert ? 'Replace Certificate' : 'Upload Certificate'}
        </Button>
      </Card>

      {/* Secondary path — generate a key pair */}
      <Card withBorder>
        <Group gap="xs" mb="xs">
          <ThemeIcon size={28} radius="md" color="gray" variant="light">
            <IconCirclePlus size={16} />
          </ThemeIcon>
          <Text fw={600}>Generate a key pair for me</Text>
        </Group>
        <Text size="sm" c="dimmed" mb="md">
          For convenience (e.g. sandbox testing) we can generate a certificate and matching private
          key. The private key is shown exactly once and is never stored on our servers.
        </Text>
        <Group align="flex-end" mb="md">
          <TextInput
            label="Common Name (CN)"
            description="Identifies your client certificate"
            value={cn}
            onChange={(e) => setCn(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Button
            variant="light"
            leftSection={<IconCirclePlus size={16} />}
            onClick={handleGenerate}
            loading={generating}
            disabled={!cn.trim()}
          >
            Generate Key Pair
          </Button>
        </Group>

        {generated && (
          <Stack gap="md">
            <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>
              <Text size="sm" fw={600}>
                Store this private key now — we do not keep a copy.
              </Text>
              <Text size="sm">
                Once you leave this page the private key is gone forever. Download it and store it
                securely.
              </Text>
            </Alert>
            <Button
              leftSection={<IconDownload size={16} />}
              color="red"
              onClick={downloadKey}
              w="fit-content"
            >
              Download Private Key
            </Button>
            <CodeBlock code={generated.private_key_pem} language="text" title="PRIVATE KEY (shown once)" />
            <CodeBlock code={generated.certificate_pem} language="text" title="CERTIFICATE" />
          </Stack>
        )}
      </Card>

      <Alert icon={<IconAlertCircle size={16} />} color="blue" variant="light">
        <Text size="sm">
          Certificates are not required for sandbox access. For production, register the transport
          certificate your TPP uses for mutual TLS.
        </Text>
      </Alert>
    </Stack>
  );
}

function IpAllowlistTab({ tppId }: { tppId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [text, setText] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<IpAllowlist>(`/portal-api/tpp/${tppId}/ip-allowlist`);
      setText((res.data.cidrs || []).join('\n'));
    } catch {
      setText('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tppId]);

  const entries = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const invalid = entries.filter((e) => !isValidCidrOrIp(e));
  const canSave = invalid.length === 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await api.put<IpAllowlist>(`/portal-api/tpp/${tppId}/ip-allowlist`, {
        cidrs: entries,
      });
      setText((res.data.cidrs || entries).join('\n'));
      notifications.show({ title: 'Allowlist saved', message: 'Your IP allowlist has been updated.', color: 'green' });
    } catch {
      notifications.show({ title: 'Save failed', message: 'Could not save the IP allowlist. Please try again.', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Center py={60}><Loader color="bankGreen" /></Center>;
  }

  return (
    <Stack gap="md">
      <Card withBorder>
        <Text fw={600} mb="xs">IP Allowlist</Text>
        <Text size="sm" c="dimmed" mb="md">
          Restrict API access to specific source addresses. Enter one IP address or CIDR range per
          line (e.g. <Text span ff="monospace">203.0.113.10</Text> or{' '}
          <Text span ff="monospace">203.0.113.0/24</Text>). Leave empty to allow all sources.
        </Text>

        <Textarea
          label="Allowed IPs / CIDRs"
          description="One entry per line — accepts a bare IP or an IPv4 CIDR"
          placeholder={'203.0.113.10\n198.51.100.0/24'}
          autosize
          minRows={5}
          maxRows={14}
          styles={{ input: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
          value={text}
          onChange={(e) => setText(e.currentTarget.value)}
          error={invalid.length > 0 ? `Invalid entr${invalid.length === 1 ? 'y' : 'ies'}: ${invalid.join(', ')}` : null}
          mb="md"
        />

        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </Text>
          <Group gap="xs">
            <Button variant="subtle" onClick={load}>Reset</Button>
            <Button onClick={handleSave} loading={saving} disabled={!canSave}>
              Save Allowlist
            </Button>
          </Group>
        </Group>
      </Card>

      {entries.length > 0 && canSave && (
        <Card withBorder>
          <Text fw={600} mb="md">Current entries</Text>
          <Table withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>IP / CIDR</Table.Th>
                <Table.Th w={120}>Type</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {entries.map((e, idx) => (
                <Table.Tr key={idx}>
                  <Table.Td><Text size="sm" ff="monospace">{e}</Text></Table.Td>
                  <Table.Td>
                    <Badge variant="light" size="sm">{e.includes('/') ? 'CIDR' : 'Host'}</Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}
    </Stack>
  );
}
