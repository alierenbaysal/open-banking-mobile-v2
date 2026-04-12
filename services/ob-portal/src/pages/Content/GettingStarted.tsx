import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  Group,
  ThemeIcon,
  Stepper,
  Tabs,
  Button,
  Alert,
  Divider,
  Anchor,
  List,
  Box,
  SimpleGrid,
} from '@mantine/core';
import {
  IconUserPlus,
  IconApps,
  IconKey,
  IconApi,
  IconArrowRight,
  IconBrandPython,
  IconBrandNodejs,
  IconTerminal,
  IconInfoCircle,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { CodeBlock } from '../../components/common/CodeBlock';

const CURL_TOKEN_EXAMPLE = `curl -X POST \\
  "https://auth.qantara.tnd.bankdhofar.com/realms/open-banking/protocol/openid-connect/token" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=client_credentials" \\
  -d "client_id=YOUR_CLIENT_ID" \\
  -d "client_secret=YOUR_CLIENT_SECRET" \\
  -d "scope=accounts payments"`;

const CURL_API_EXAMPLE = `# Create an account access consent
curl -X POST \\
  "https://qantara.tnd.bankdhofar.com/open-banking/v4.0/aisp/account-access-consents" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -H "x-fapi-financial-id: bankdhofar-sandbox" \\
  -H "x-fapi-interaction-id: $(uuidgen)" \\
  -d '{
    "Data": {
      "Permissions": [
        "ReadAccountsBasic",
        "ReadAccountsDetail",
        "ReadBalances",
        "ReadTransactionsBasic",
        "ReadTransactionsDetail"
      ],
      "ExpirationDateTime": "2027-01-01T00:00:00+00:00"
    },
    "Risk": {}
  }'

# Get accounts (after consent is authorised)
curl -X GET \\
  "https://qantara.tnd.bankdhofar.com/open-banking/v4.0/aisp/accounts" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \\
  -H "x-fapi-financial-id: bankdhofar-sandbox"`;

const PYTHON_EXAMPLE = `import requests

# Configuration
BASE_URL = "https://qantara.tnd.bankdhofar.com"
AUTH_URL = "https://auth.qantara.tnd.bankdhofar.com"
CLIENT_ID = "your-client-id"
CLIENT_SECRET = "your-client-secret"

# Step 1: Get access token
token_response = requests.post(
    f"{AUTH_URL}/realms/open-banking/protocol/openid-connect/token",
    data={
        "grant_type": "client_credentials",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "scope": "accounts payments",
    },
)
token_response.raise_for_status()
access_token = token_response.json()["access_token"]

headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json",
    "x-fapi-financial-id": "bankdhofar-sandbox",
}

# Step 2: Create account access consent
consent_response = requests.post(
    f"{BASE_URL}/open-banking/v4.0/aisp/account-access-consents",
    headers=headers,
    json={
        "Data": {
            "Permissions": [
                "ReadAccountsBasic",
                "ReadAccountsDetail",
                "ReadBalances",
            ],
            "ExpirationDateTime": "2027-01-01T00:00:00+00:00",
        },
        "Risk": {},
    },
)
consent_response.raise_for_status()
consent_id = consent_response.json()["Data"]["ConsentId"]
print(f"Consent created: {consent_id}")

# Step 3: Get accounts (after PSU authorises the consent)
accounts_response = requests.get(
    f"{BASE_URL}/open-banking/v4.0/aisp/accounts",
    headers=headers,
)
accounts_response.raise_for_status()
accounts = accounts_response.json()["Data"]["Account"]
for account in accounts:
    print(f"Account: {account['AccountId']} - {account.get('Nickname', 'N/A')}")`;

const NODEJS_EXAMPLE = `const axios = require('axios');

const BASE_URL = 'https://qantara.tnd.bankdhofar.com';
const AUTH_URL = 'https://auth.qantara.tnd.bankdhofar.com';
const CLIENT_ID = 'your-client-id';
const CLIENT_SECRET = 'your-client-secret';

async function main() {
  // Step 1: Get access token
  const tokenResponse = await axios.post(
    \`\${AUTH_URL}/realms/open-banking/protocol/openid-connect/token\`,
    new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: 'accounts payments',
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  const accessToken = tokenResponse.data.access_token;

  const headers = {
    'Authorization': \`Bearer \${accessToken}\`,
    'Content-Type': 'application/json',
    'x-fapi-financial-id': 'bankdhofar-sandbox',
  };

  // Step 2: Create account access consent
  const consentResponse = await axios.post(
    \`\${BASE_URL}/open-banking/v4.0/aisp/account-access-consents\`,
    {
      Data: {
        Permissions: [
          'ReadAccountsBasic',
          'ReadAccountsDetail',
          'ReadBalances',
        ],
        ExpirationDateTime: '2027-01-01T00:00:00+00:00',
      },
      Risk: {},
    },
    { headers }
  );
  const consentId = consentResponse.data.Data.ConsentId;
  console.log(\`Consent created: \${consentId}\`);

  // Step 3: Get accounts (after PSU authorises the consent)
  const accountsResponse = await axios.get(
    \`\${BASE_URL}/open-banking/v4.0/aisp/accounts\`,
    { headers }
  );
  const accounts = accountsResponse.data.Data.Account;
  accounts.forEach(account => {
    console.log(\`Account: \${account.AccountId} - \${account.Nickname || 'N/A'}\`);
  });
}

main().catch(console.error);`;

export default function GettingStarted() {
  const navigate = useNavigate();

  return (
    <Container size="lg">
      <Stack gap="xl">
        <div>
          <Text size="sm" fw={600} c="bankGreen" tt="uppercase" mb={4}>
            Documentation
          </Text>
          <Title order={2}>Getting Started</Title>
          <Text c="dimmed" mt="xs" maw={700}>
            Follow this guide to integrate with Bank Dhofar's Open Banking APIs.
            From registration to your first API call in four simple steps.
          </Text>
        </div>

        {/* Overview Steps */}
        <Card withBorder p="xl">
          <Stepper
            active={-1}
            color="bankGreen"
            orientation="horizontal"
            iconSize={42}
          >
            <Stepper.Step
              icon={<IconUserPlus size={20} />}
              label="Step 1"
              description="Register Account"
            />
            <Stepper.Step
              icon={<IconApps size={20} />}
              label="Step 2"
              description="Create Application"
            />
            <Stepper.Step
              icon={<IconKey size={20} />}
              label="Step 3"
              description="Get Token"
            />
            <Stepper.Step
              icon={<IconApi size={20} />}
              label="Step 4"
              description="Call API"
            />
          </Stepper>
        </Card>

        {/* Step 1: Register */}
        <Card withBorder padding="xl" id="step-1">
          <Group gap="sm" mb="md">
            <ThemeIcon size={36} radius="xl" color="bankGreen">
              <Text fw={700} c="white" size="sm">1</Text>
            </ThemeIcon>
            <div>
              <Title order={3}>Register Your Account</Title>
              <Text size="sm" c="dimmed">Create a developer account on the Qantara portal</Text>
            </div>
          </Group>
          <Divider mb="md" />
          <Stack gap="sm">
            <Text size="sm">
              To start building with Bank Dhofar's Open Banking APIs, you need a developer account.
            </Text>
            <List size="sm" spacing="xs">
              <List.Item>Click the "Sign In" button in the top-right corner of the portal</List.Item>
              <List.Item>Enter your name, email, and organization details</List.Item>
              <List.Item>For sandbox access, any valid email will work immediately</List.Item>
              <List.Item>For production access, your TPP must be registered with the Central Bank of Oman</List.Item>
            </List>
            <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light" mt="sm">
              <Text size="sm">
                <strong>Sandbox accounts</strong> are provisioned instantly with full API access.
                No approval required for testing.
              </Text>
            </Alert>
          </Stack>
        </Card>

        {/* Step 2: Create App */}
        <Card withBorder padding="xl" id="step-2">
          <Group gap="sm" mb="md">
            <ThemeIcon size={36} radius="xl" color="bankGreen">
              <Text fw={700} c="white" size="sm">2</Text>
            </ThemeIcon>
            <div>
              <Title order={3}>Create Your Application</Title>
              <Text size="sm" c="dimmed">Register a TPP application to get API credentials</Text>
            </div>
          </Group>
          <Divider mb="md" />
          <Stack gap="sm">
            <Text size="sm">
              Each application represents a Third Party Provider (TPP) integration with specific roles
              and permissions.
            </Text>
            <List size="sm" spacing="xs">
              <List.Item>Navigate to <Anchor onClick={() => navigate('/applications')}>My Applications</Anchor></List.Item>
              <List.Item>Click "Register New App"</List.Item>
              <List.Item>Provide your application name and description</List.Item>
              <List.Item>
                Select the TPP roles your application needs:
                <List size="sm" mt={4}>
                  <List.Item><strong>AISP</strong> - Account Information Service Provider (read account data)</List.Item>
                  <List.Item><strong>PISP</strong> - Payment Initiation Service Provider (initiate payments)</List.Item>
                  <List.Item><strong>CBPII</strong> - Card Based Payment Instrument Issuer (confirm funds)</List.Item>
                </List>
              </List.Item>
              <List.Item>Add your redirect URIs for OAuth2 callbacks</List.Item>
              <List.Item>Save your <strong>client_id</strong> and <strong>client_secret</strong> securely</List.Item>
            </List>
            <Button
              variant="light"
              size="sm"
              rightSection={<IconArrowRight size={14} />}
              mt="sm"
              onClick={() => navigate('/applications')}
              w="fit-content"
            >
              Go to My Applications
            </Button>
          </Stack>
        </Card>

        {/* Step 3: Get Token */}
        <Card withBorder padding="xl" id="step-3">
          <Group gap="sm" mb="md">
            <ThemeIcon size={36} radius="xl" color="bankGreen">
              <Text fw={700} c="white" size="sm">3</Text>
            </ThemeIcon>
            <div>
              <Title order={3}>Obtain an Access Token</Title>
              <Text size="sm" c="dimmed">Authenticate with OAuth2 client credentials</Text>
            </div>
          </Group>
          <Divider mb="md" />
          <Stack gap="sm">
            <Text size="sm">
              Use the OAuth2 client credentials grant to obtain an access token. This token is used
              to authenticate all API requests.
            </Text>

            <Card withBorder p="md" bg="gray.0">
              <Group gap="xs" mb="xs">
                <Text size="sm" fw={600}>Token Endpoint:</Text>
                <Text size="sm" ff="monospace">
                  https://auth.qantara.tnd.bankdhofar.com/realms/open-banking/protocol/openid-connect/token
                </Text>
              </Group>
              <Group gap="xs" mb="xs">
                <Text size="sm" fw={600}>Grant Type:</Text>
                <Text size="sm" ff="monospace">client_credentials</Text>
              </Group>
              <Group gap="xs">
                <Text size="sm" fw={600}>Token Validity:</Text>
                <Text size="sm">3600 seconds (1 hour)</Text>
              </Group>
            </Card>

            <CodeBlock code={CURL_TOKEN_EXAMPLE} language="bash" title="cURL" />

            <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
              <Text size="sm">
                You can also generate tokens directly from the{' '}
                <Anchor onClick={() => navigate('/sandbox')}>Sandbox Console</Anchor> without writing any code.
              </Text>
            </Alert>
          </Stack>
        </Card>

        {/* Step 4: Call API */}
        <Card withBorder padding="xl" id="step-4">
          <Group gap="sm" mb="md">
            <ThemeIcon size={36} radius="xl" color="bankGreen">
              <Text fw={700} c="white" size="sm">4</Text>
            </ThemeIcon>
            <div>
              <Title order={3}>Make Your First API Call</Title>
              <Text size="sm" c="dimmed">Call the Open Banking APIs with your access token</Text>
            </div>
          </Group>
          <Divider mb="md" />
          <Stack gap="md">
            <Text size="sm">
              With your access token, you can now call any endpoint your TPP roles allow. All requests
              must include the following headers:
            </Text>

            <Card withBorder p="md" bg="gray.0">
              <Stack gap={4}>
                <Group gap="xs">
                  <Text size="sm" fw={600} w={200}>Authorization</Text>
                  <Text size="sm" ff="monospace">Bearer YOUR_ACCESS_TOKEN</Text>
                </Group>
                <Group gap="xs">
                  <Text size="sm" fw={600} w={200}>x-fapi-financial-id</Text>
                  <Text size="sm" ff="monospace">bankdhofar-sandbox</Text>
                </Group>
                <Group gap="xs">
                  <Text size="sm" fw={600} w={200}>x-fapi-interaction-id</Text>
                  <Text size="sm" ff="monospace">UUID (unique per request)</Text>
                </Group>
                <Group gap="xs">
                  <Text size="sm" fw={600} w={200}>Content-Type</Text>
                  <Text size="sm" ff="monospace">application/json</Text>
                </Group>
              </Stack>
            </Card>

            <Tabs defaultValue="curl">
              <Tabs.List>
                <Tabs.Tab value="curl" leftSection={<IconTerminal size={14} />}>cURL</Tabs.Tab>
                <Tabs.Tab value="python" leftSection={<IconBrandPython size={14} />}>Python</Tabs.Tab>
                <Tabs.Tab value="nodejs" leftSection={<IconBrandNodejs size={14} />}>Node.js</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="curl" pt="md">
                <CodeBlock code={CURL_API_EXAMPLE} language="bash" title="cURL" />
              </Tabs.Panel>

              <Tabs.Panel value="python" pt="md">
                <CodeBlock code={PYTHON_EXAMPLE} language="python" title="Python (requests)" />
              </Tabs.Panel>

              <Tabs.Panel value="nodejs" pt="md">
                <CodeBlock code={NODEJS_EXAMPLE} language="javascript" title="Node.js (axios)" />
              </Tabs.Panel>
            </Tabs>

            <Group mt="md">
              <Button
                rightSection={<IconArrowRight size={14} />}
                onClick={() => navigate('/sandbox')}
              >
                Open Sandbox Console
              </Button>
              <Button
                variant="light"
                rightSection={<IconArrowRight size={14} />}
                onClick={() => navigate('/apis')}
              >
                Browse API Catalog
              </Button>
            </Group>
          </Stack>
        </Card>

        {/* Additional Resources */}
        <Card withBorder padding="xl">
          <Title order={3} mb="md">Additional Resources</Title>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
            <Card withBorder p="md">
              <Text fw={600} mb="xs">API Specifications</Text>
              <Text size="sm" c="dimmed" mb="md">
                Detailed OpenAPI 3.0 specifications for all endpoints, including request/response
                schemas and error codes.
              </Text>
              <Button variant="light" size="sm" onClick={() => navigate('/apis')}>
                View API Catalog
              </Button>
            </Card>
            <Card withBorder p="md">
              <Text fw={600} mb="xs">Error Handling</Text>
              <Text size="sm" c="dimmed" mb="md">
                All errors follow OBIE standard format with error codes, HTTP status mapping,
                and descriptive messages.
              </Text>
              <CodeBlock
                code={JSON.stringify({
                  Code: "UK.OBIE.Field.Invalid",
                  Message: "Invalid field value",
                  Path: "Data.Initiation.Amount",
                  Url: "https://docs.bankdhofar.com/errors"
                }, null, 2)}
                language="json"
                title="ERROR FORMAT"
                withCopy={false}
              />
            </Card>
            <Card withBorder p="md">
              <Text fw={600} mb="xs">Rate Limits</Text>
              <Text size="sm" c="dimmed" mb="md">
                Sandbox environment rate limits are generous for testing. Production limits are
                per-TPP and per-endpoint.
              </Text>
              <Stack gap={4}>
                <Group justify="space-between">
                  <Text size="sm">Sandbox</Text>
                  <Text size="sm" fw={500}>100 req/min</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Production (default)</Text>
                  <Text size="sm" fw={500}>60 req/min</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="sm">Burst</Text>
                  <Text size="sm" fw={500}>10 req/sec</Text>
                </Group>
              </Stack>
            </Card>
          </SimpleGrid>
        </Card>
      </Stack>
    </Container>
  );
}
