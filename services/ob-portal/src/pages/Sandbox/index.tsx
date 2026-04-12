import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  Group,
  TextInput,
  PasswordInput,
  Button,
  Select,
  Textarea,
  Badge,
  Tabs,
  Divider,
  CopyButton,
  ActionIcon,
  Tooltip,
  Alert,
  Box,
  ScrollArea,
  Table,
} from '@mantine/core';
import {
  IconSend,
  IconKey,
  IconCopy,
  IconCheck,
  IconHistory,
  IconAlertCircle,
  IconPlayerPlay,
  IconTrash,
} from '@tabler/icons-react';
import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CodeBlock } from '../../components/common/CodeBlock';

interface RequestHistoryItem {
  id: string;
  method: string;
  path: string;
  status: number | null;
  statusText: string;
  timestamp: Date;
  requestBody?: string;
  responseBody: string;
  responseHeaders: Record<string, string>;
  duration: number;
}

const HTTP_METHODS = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DELETE' },
];

const DEFAULT_HEADERS = `{
  "Content-Type": "application/json",
  "x-fapi-financial-id": "bankdhofar-sandbox",
  "x-fapi-interaction-id": ""
}`;

export default function SandboxPage() {
  const [searchParams] = useSearchParams();

  // Token state
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null);

  // Request state
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/open-banking/v4.0/aisp/accounts');
  const [headersText, setHeadersText] = useState(DEFAULT_HEADERS);
  const [requestBody, setRequestBody] = useState('');
  const [sending, setSending] = useState(false);

  // Response state
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseStatusText, setResponseStatusText] = useState('');
  const [responseBody, setResponseBody] = useState('');
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  const [responseDuration, setResponseDuration] = useState(0);

  // History
  const [history, setHistory] = useState<RequestHistoryItem[]>([]);

  // Pre-fill from API Catalog "Try it" link
  useEffect(() => {
    const paramMethod = searchParams.get('method');
    const paramPath = searchParams.get('path');
    if (paramMethod) setMethod(paramMethod);
    if (paramPath) setPath(paramPath);
  }, [searchParams]);

  const generateToken = useCallback(async () => {
    if (!clientId || !clientSecret) {
      setTokenError('Client ID and Client Secret are required.');
      return;
    }
    setTokenLoading(true);
    setTokenError('');

    // Sandbox mock: generate a fake JWT-like token for testing
    // In production, this would POST to Keycloak token endpoint
    try {
      const mockToken = `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2F1dGgucWFudGFyYS50bmQuYmFua2Rob2Zhci5jb20vcmVhbG1zL29wZW4tYmFua2luZyIsInN1YiI6IiR7Y2xpZW50SWR9IiwiYXVkIjoib3Blbi1iYW5raW5nIiwiZXhwIjoxNzMxMzMzMjAwLCJpYXQiOjE3MzEzMjk2MDAsInNjb3BlIjoiYWNjb3VudHMgcGF5bWVudHMgZnVuZHNjb25maXJtYXRpb25zIn0.sandbox-signature-${Date.now()}`;
      setAccessToken(mockToken);
      sessionStorage.setItem('qantara_access_token', mockToken);
      setTokenExpiry(new Date(Date.now() + 3600 * 1000));
    } catch {
      setTokenError('Failed to generate token. Check your credentials.');
    } finally {
      setTokenLoading(false);
    }
  }, [clientId, clientSecret]);

  const sendRequest = useCallback(async () => {
    setSending(true);
    setResponseStatus(null);
    setResponseBody('');
    setResponseHeaders({});
    const startTime = Date.now();

    try {
      let parsedHeaders: Record<string, string> = {};
      try {
        parsedHeaders = JSON.parse(headersText);
      } catch {
        // If headers can't be parsed, use defaults
        parsedHeaders = { 'Content-Type': 'application/json' };
      }

      if (accessToken) {
        parsedHeaders['Authorization'] = `Bearer ${accessToken}`;
      }

      if (!parsedHeaders['x-fapi-interaction-id']) {
        parsedHeaders['x-fapi-interaction-id'] = crypto.randomUUID();
      }

      const fetchOptions: RequestInit = {
        method,
        headers: parsedHeaders,
      };

      if (requestBody && (method === 'POST' || method === 'PUT')) {
        fetchOptions.body = requestBody;
      }

      const response = await fetch(path, fetchOptions);
      const duration = Date.now() - startTime;
      setResponseDuration(duration);

      const resHeaders: Record<string, string> = {};
      response.headers.forEach((v, k) => { resHeaders[k] = v; });
      setResponseHeaders(resHeaders);
      setResponseStatus(response.status);
      setResponseStatusText(response.statusText);

      const contentType = response.headers.get('content-type') || '';
      let body: string;
      if (contentType.includes('json')) {
        const json = await response.json();
        body = JSON.stringify(json, null, 2);
      } else {
        body = await response.text();
      }
      setResponseBody(body);

      // Add to history
      const item: RequestHistoryItem = {
        id: crypto.randomUUID(),
        method,
        path,
        status: response.status,
        statusText: response.statusText,
        timestamp: new Date(),
        requestBody: requestBody || undefined,
        responseBody: body,
        responseHeaders: resHeaders,
        duration,
      };
      setHistory((prev) => [item, ...prev].slice(0, 50));
    } catch (err) {
      const duration = Date.now() - startTime;
      setResponseDuration(duration);
      const errorMsg = err instanceof Error ? err.message : 'Request failed';
      setResponseStatus(0);
      setResponseStatusText('Network Error');
      setResponseBody(JSON.stringify({ error: errorMsg }, null, 2));

      setHistory((prev) => [{
        id: crypto.randomUUID(),
        method,
        path,
        status: 0,
        statusText: 'Network Error',
        timestamp: new Date(),
        requestBody: requestBody || undefined,
        responseBody: JSON.stringify({ error: errorMsg }, null, 2),
        responseHeaders: {},
        duration,
      }, ...prev].slice(0, 50));
    } finally {
      setSending(false);
    }
  }, [method, path, headersText, requestBody, accessToken]);

  const statusColor = (status: number | null) => {
    if (!status || status === 0) return 'red';
    if (status < 300) return 'green';
    if (status < 400) return 'yellow';
    if (status < 500) return 'orange';
    return 'red';
  };

  const methodColor = (m: string) => {
    switch (m) {
      case 'GET': return 'blue';
      case 'POST': return 'green';
      case 'PUT': return 'orange';
      case 'DELETE': return 'red';
      default: return 'gray';
    }
  };

  const loadFromHistory = (item: RequestHistoryItem) => {
    setMethod(item.method);
    setPath(item.path);
    if (item.requestBody) setRequestBody(item.requestBody);
    setResponseStatus(item.status);
    setResponseStatusText(item.statusText);
    setResponseBody(item.responseBody);
    setResponseHeaders(item.responseHeaders);
    setResponseDuration(item.duration);
  };

  return (
    <Container size="lg">
      <Stack gap="lg">
        <div>
          <Text size="sm" fw={600} c="bankGreen" tt="uppercase" mb={4}>
            Interactive
          </Text>
          <Title order={2}>API Sandbox</Title>
          <Text c="dimmed" mt="xs">
            Generate access tokens and test API calls against the sandbox environment.
          </Text>
        </div>

        {/* Token Generator */}
        <Card withBorder>
          <Group gap="xs" mb="md">
            <IconKey size={20} color="var(--mantine-color-bankGreen-6)" />
            <Text fw={600} size="lg">Access Token</Text>
          </Group>

          <Stack gap="sm">
            <Group grow>
              <TextInput
                label="Client ID"
                placeholder="your-client-id"
                value={clientId}
                onChange={(e) => setClientId(e.currentTarget.value)}
              />
              <PasswordInput
                label="Client Secret"
                placeholder="your-client-secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.currentTarget.value)}
              />
            </Group>

            <Group>
              <Button
                leftSection={<IconKey size={16} />}
                onClick={generateToken}
                loading={tokenLoading}
              >
                Generate Token
              </Button>
              {tokenExpiry && (
                <Text size="xs" c="dimmed">
                  Expires: {tokenExpiry.toLocaleTimeString()}
                </Text>
              )}
            </Group>

            {tokenError && (
              <Alert color="red" icon={<IconAlertCircle size={16} />}>
                {tokenError}
              </Alert>
            )}

            {accessToken && (
              <Card withBorder p="sm" bg="gray.0">
                <Group justify="space-between" mb="xs">
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase">Bearer Token</Text>
                  <CopyButton value={accessToken}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'Copied' : 'Copy token'}>
                        <ActionIcon variant="subtle" color={copied ? 'green' : 'gray'} onClick={copy} size="sm">
                          {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
                <Text size="xs" ff="monospace" style={{ wordBreak: 'break-all' }} lineClamp={2}>
                  {accessToken}
                </Text>
              </Card>
            )}
          </Stack>
        </Card>

        {/* Request Builder */}
        <Card withBorder>
          <Group gap="xs" mb="md">
            <IconSend size={20} color="var(--mantine-color-bankGreen-6)" />
            <Text fw={600} size="lg">Request Builder</Text>
          </Group>

          <Stack gap="sm">
            <Group grow align="flex-end">
              <Select
                label="Method"
                data={HTTP_METHODS}
                value={method}
                onChange={(v) => v && setMethod(v)}
                w={120}
                styles={{ root: { flexGrow: 0 } }}
              />
              <TextInput
                label="Path"
                placeholder="/open-banking/v4.0/aisp/accounts"
                value={path}
                onChange={(e) => setPath(e.currentTarget.value)}
                ff="monospace"
              />
            </Group>

            <Textarea
              label="Headers (JSON)"
              value={headersText}
              onChange={(e) => setHeadersText(e.currentTarget.value)}
              minRows={4}
              ff="monospace"
              autosize
              styles={{ input: { fontSize: 'var(--mantine-font-size-xs)' } }}
            />

            {(method === 'POST' || method === 'PUT') && (
              <Textarea
                label="Request Body (JSON)"
                placeholder='{"Data": { ... }}'
                value={requestBody}
                onChange={(e) => setRequestBody(e.currentTarget.value)}
                minRows={6}
                ff="monospace"
                autosize
                styles={{ input: { fontSize: 'var(--mantine-font-size-xs)' } }}
              />
            )}

            <Button
              leftSection={<IconPlayerPlay size={16} />}
              onClick={sendRequest}
              loading={sending}
              size="md"
            >
              Send Request
            </Button>
          </Stack>
        </Card>

        {/* Response Viewer */}
        {responseStatus !== null && (
          <Card withBorder>
            <Tabs defaultValue="body">
              <Group justify="space-between" mb="md">
                <Group gap="md">
                  <Text fw={600} size="lg">Response</Text>
                  <Badge
                    color={statusColor(responseStatus)}
                    variant="filled"
                    size="lg"
                  >
                    {responseStatus} {responseStatusText}
                  </Badge>
                  <Text size="sm" c="dimmed">{responseDuration}ms</Text>
                </Group>
                <Tabs.List>
                  <Tabs.Tab value="body">Body</Tabs.Tab>
                  <Tabs.Tab value="headers">Headers</Tabs.Tab>
                </Tabs.List>
              </Group>

              <Tabs.Panel value="body">
                <CodeBlock
                  code={responseBody || '// No response body'}
                  language="json"
                  title="RESPONSE BODY"
                />
              </Tabs.Panel>

              <Tabs.Panel value="headers">
                <Table striped withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Header</Table.Th>
                      <Table.Th>Value</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {Object.entries(responseHeaders).map(([key, value]) => (
                      <Table.Tr key={key}>
                        <Table.Td><Text size="sm" ff="monospace" fw={500}>{key}</Text></Table.Td>
                        <Table.Td><Text size="sm" ff="monospace">{value}</Text></Table.Td>
                      </Table.Tr>
                    ))}
                    {Object.keys(responseHeaders).length === 0 && (
                      <Table.Tr>
                        <Table.Td colSpan={2}>
                          <Text c="dimmed" size="sm" ta="center">No headers</Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              </Tabs.Panel>
            </Tabs>
          </Card>
        )}

        {/* Request History */}
        <Card withBorder>
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <IconHistory size={20} color="var(--mantine-color-bankGreen-6)" />
              <Text fw={600} size="lg">Request History</Text>
              <Badge variant="light" size="sm">{history.length}</Badge>
            </Group>
            {history.length > 0 && (
              <Button
                variant="subtle"
                color="red"
                size="xs"
                leftSection={<IconTrash size={14} />}
                onClick={() => setHistory([])}
              >
                Clear
              </Button>
            )}
          </Group>

          {history.length === 0 ? (
            <Text c="dimmed" size="sm" ta="center" py="xl">
              No requests yet. Send a request to see it here.
            </Text>
          ) : (
            <ScrollArea h={history.length > 5 ? 300 : undefined}>
              <Stack gap="xs">
                {history.map((item) => (
                  <Card
                    key={item.id}
                    withBorder
                    p="xs"
                    style={{ cursor: 'pointer' }}
                    onClick={() => loadFromHistory(item)}
                  >
                    <Group justify="space-between">
                      <Group gap="xs">
                        <Badge
                          w={56}
                          variant="light"
                          color={methodColor(item.method)}
                          size="sm"
                          radius="sm"
                        >
                          {item.method}
                        </Badge>
                        <Text size="xs" ff="monospace" lineClamp={1} maw={400}>
                          {item.path}
                        </Text>
                      </Group>
                      <Group gap="xs">
                        <Badge
                          variant="light"
                          color={statusColor(item.status)}
                          size="sm"
                        >
                          {item.status || 'ERR'}
                        </Badge>
                        <Text size="xs" c="dimmed">{item.duration}ms</Text>
                        <Text size="xs" c="dimmed">
                          {item.timestamp.toLocaleTimeString()}
                        </Text>
                      </Group>
                    </Group>
                  </Card>
                ))}
              </Stack>
            </ScrollArea>
          )}
        </Card>
      </Stack>
    </Container>
  );
}
