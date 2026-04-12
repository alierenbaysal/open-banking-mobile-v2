# ob-tpp-manager

TPP (Third-Party Provider) lifecycle management service for Qantara Open Banking.

Handles TPP registration, Keycloak OIDC client provisioning (FAPI 2.0 profile), certificate management, credential rotation, and sandbox token generation.

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `8000` | HTTP listen port |
| `KEYCLOAK_URL` | Yes | - | Keycloak base URL |
| `KEYCLOAK_REALM` | No | `open-banking` | Keycloak realm name |
| `KEYCLOAK_ADMIN_CLIENT_ID` | Yes | - | Admin client ID for provisioning |
| `KEYCLOAK_ADMIN_CLIENT_SECRET` | Yes | - | Admin client secret |
| `CONSENT_SERVICE_URL` | No | `http://ob-consent-service:8000` | Consent service base URL |
| `LOG_LEVEL` | No | `info` | Log level (debug, info, warn, error) |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/portal-api/health` | Health check |
| `POST` | `/portal-api/tpp/register` | Register new TPP |
| `GET` | `/portal-api/tpp` | List all TPPs |
| `GET` | `/portal-api/tpp/{tppId}` | Get TPP details |
| `PUT` | `/portal-api/tpp/{tppId}` | Update TPP |
| `DELETE` | `/portal-api/tpp/{tppId}` | Suspend TPP |
| `POST` | `/portal-api/tpp/{tppId}/credentials` | Regenerate credentials |
| `POST` | `/portal-api/tpp/{tppId}/certificate` | Upload client certificate |
| `GET` | `/portal-api/tpp/{tppId}/certificate` | Get certificate info |
| `POST` | `/portal-api/tpp/{tppId}/sandbox-token` | Generate sandbox token |

## Build

```bash
docker build -t ob-tpp-manager .
```

## Run

```bash
export KEYCLOAK_URL=https://keycloak.example.com
export KEYCLOAK_ADMIN_CLIENT_ID=admin-cli
export KEYCLOAK_ADMIN_CLIENT_SECRET=secret
./ob-tpp-manager
```
