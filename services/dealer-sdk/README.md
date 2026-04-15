# @bankdhofar/auto-loans-sdk

TypeScript SDK for **Bank Dhofar Open Finance — Auto Loan Origination APIs**.

Lets registered auto-lending TPPs (car dealers, DMS vendors) embed Bank Dhofar
auto-loan financing at their point of sale. The dealer owns the UI; this SDK
takes care of API calls, idempotency, error mapping, QR expiry, and webhook
signature verification.

## Install

```bash
npm install @bankdhofar/auto-loans-sdk
# or
pnpm add @bankdhofar/auto-loans-sdk
```

> Available from the Bank Dhofar GitLab npm registry. Configure with:
> `npm config set @bankdhofar:registry https://gitlab.bankdhofar.com/api/v4/projects/ea%2Fopen-banking/packages/npm/`

## Quickstart

### 1. Get sandbox credentials

`POST https://api.tnd.bankdhofar.com/auto-lending/v1/tpp/sandbox-signup` — see
the [API portal](https://qantara.tnd.bankdhofar.com/open-finance/auto-lending).

### 2. Create an application

```ts
import { AutoLoansClient } from "@bankdhofar/auto-loans-sdk";

const bd = new AutoLoansClient({
  baseUrl: "https://api.tnd.bankdhofar.com/auto-lending/v1",
  clientId: process.env.BD_CLIENT_ID!,
  clientSecret: process.env.BD_CLIENT_SECRET!,
  environment: "sandbox",
});

const app = await bd.createApplication({
  dealer_reference: "SO-2026-04-14-00042",
  branch_code: "SB-SEEB-02",
  salesperson_email: "ahmed@muscatmotors.com",
  vehicle: {
    vin: "KMHJ3816FBA012345",
    make: "Hyundai",
    model: "Creta",
    year: 2026,
    condition: "new",
    price: { amount: "12000.000", currency: "OMR" },
  },
  requested_amount: { amount: "9600.000", currency: "OMR" },
  down_payment:     { amount: "2400.000", currency: "OMR" },
  requested_tenor_months: 60,
});

// Render `app.qr.payload` as a QR for the customer to scan
console.log(app.qr.payload, "expires at", app.qr.expires_at);
```

### 3. Subscribe to webhooks

Bank Dhofar will POST to your registered webhook URL at every state transition:

| Event | When |
|---|---|
| `loan_application.decided` | Decision engine has run, an offer is on the table |
| `loan_application.declined` | Decision engine has declined |
| `loan_application.contracted` | Customer signed the contract |
| `loan_application.disbursed` | Funds moved to your account, customer has the car |
| `loan_application.expired` | QR or decision expired before progress |
| `loan_application.cancelled` | Either side cancelled |

Always verify the `X-BD-Signature` header against the **raw** request body:

```ts
import { parseAndVerifyWebhook } from "@bankdhofar/auto-loans-sdk";

app.post("/bd-webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const event = await parseAndVerifyWebhook({
      secret: process.env.BD_WEBHOOK_SECRET!,
      signature: req.headers["x-bd-signature"],
      body: req.body, // RAW Buffer/string — not the JSON-parsed body
    });
    switch (event.event_type) {
      case "loan_application.disbursed":
        // mark order paid, hand over keys
        break;
      // ...
    }
    res.status(200).end();
  } catch (e) {
    res.status(401).end();
  }
});
```

## API surface

| Method | Endpoint |
|---|---|
| `createApplication(req)` | POST /loan-applications |
| `listApplications(opts?)` | GET /loan-applications |
| `getApplication(id)` | GET /loan-applications/:id |
| `cancelApplication(id, reason?)` | POST /loan-applications/:id/cancel |
| `getDecision(id)` | GET /loan-applications/:id/decision |
| `getContract(id)` | GET /loan-applications/:id/contract |
| `getDisbursement(id)` | GET /loan-applications/:id/disbursement |
| `getWebhookConfig()` | GET /webhooks/me |
| `updateWebhookUrl(url)` | PUT /webhooks/me |
| `rotateWebhookSecret()` | POST /webhooks/rotate-secret |
| `listWebhookDeliveries(opts?)` | GET /webhooks/deliveries |
| `replayWebhook(id)` | POST /webhooks/replay/:id |

## Error handling

All non-2xx responses throw `AutoLoansApiError` with the full RFC 7807
problem-details body attached:

```ts
try {
  await bd.createApplication(req);
} catch (e) {
  if (e instanceof AutoLoansApiError) {
    console.error(e.typeSlug, e.status, e.problem.detail, e.correlationId);
  }
}
```

## Sandbox vs production

Pass `environment: "sandbox"` (default) or `"production"`. In sandbox no real
money moves; the four seeded test customers (`CUST-001..004`) have
deterministic decision outcomes — see the portal docs.

## Compatibility

- Node 18+, modern browsers, Bun, Deno — uses native `fetch` and `crypto.subtle`.
- Zero runtime dependencies.

## License

Proprietary — Bank Dhofar Auto-Lending TPP Agreement.
