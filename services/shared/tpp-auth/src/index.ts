export type {
  TPPAuthConfig,
  TokenResponse,
  OBIEError,
  OBIEAccountAccessConsentRequest,
  OBIEAccountAccessConsentResponse,
  OBIEDomesticPaymentConsentRequest,
  OBIEDomesticPaymentConsentResponse,
  AccountAccessPermission,
  AuthCodeExchangeResult,
} from './types.js';

import type {
  TPPAuthConfig,
  TokenResponse,
  OBIEError,
  OBIEAccountAccessConsentRequest,
  OBIEAccountAccessConsentResponse,
  OBIEDomesticPaymentConsentRequest,
  OBIEDomesticPaymentConsentResponse,
  AuthCodeExchangeResult,
} from './types.js';

const TOKEN_REFRESH_BUFFER_SECONDS = 30;

export class OBIEApiError extends Error {
  public readonly statusCode: number;
  public readonly obieError: OBIEError | null;

  constructor(statusCode: number, obieError: OBIEError | null, message?: string) {
    super(message ?? obieError?.Message ?? `OBIE API error ${statusCode}`);
    this.name = 'OBIEApiError';
    this.statusCode = statusCode;
    this.obieError = obieError;
  }
}

export class TokenError extends Error {
  public readonly statusCode: number;
  public readonly responseBody: string;

  constructor(statusCode: number, responseBody: string) {
    super(`Token request failed with status ${statusCode}`);
    this.name = 'TokenError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

interface CachedToken {
  token: TokenResponse;
  expiresAt: number;
}

interface TPPAuthClient {
  getToken(): Promise<TokenResponse>;
  fetchWithAuth(url: string, options?: RequestInit): Promise<Response>;
  createConsent(
    type: 'account-access',
    payload: OBIEAccountAccessConsentRequest,
  ): Promise<OBIEAccountAccessConsentResponse>;
  createConsent(
    type: 'domestic-payment',
    payload: OBIEDomesticPaymentConsentRequest,
  ): Promise<OBIEDomesticPaymentConsentResponse>;
  createConsent(
    type: 'account-access' | 'domestic-payment',
    payload: OBIEAccountAccessConsentRequest | OBIEDomesticPaymentConsentRequest,
  ): Promise<OBIEAccountAccessConsentResponse | OBIEDomesticPaymentConsentResponse>;
  exchangeAuthCode(code: string, redirectUri: string): Promise<AuthCodeExchangeResult>;
}

async function parseOBIEError(response: Response): Promise<OBIEError | null> {
  try {
    const body = await response.json();
    if (body && typeof body.Code === 'string' && Array.isArray(body.Errors)) {
      return body as OBIEError;
    }
    return null;
  } catch {
    return null;
  }
}

export function createTPPAuthClient(config: TPPAuthConfig): TPPAuthClient {
  const obieBaseUrl = config.obieBaseUrl ?? '';
  let cachedToken: CachedToken | null = null;
  let pendingTokenRequest: Promise<TokenResponse> | null = null;

  async function requestToken(): Promise<TokenResponse> {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    if (config.scopes && config.scopes.length > 0) {
      body.set('scope', config.scopes.join(' '));
    }

    const response = await fetch(config.keycloakTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new TokenError(response.status, text);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope ?? '',
    };
  }

  async function getToken(): Promise<TokenResponse> {
    if (cachedToken && Date.now() < cachedToken.expiresAt) {
      return cachedToken.token;
    }

    // Deduplicate concurrent token requests
    if (pendingTokenRequest) {
      return pendingTokenRequest;
    }

    pendingTokenRequest = requestToken()
      .then((token) => {
        cachedToken = {
          token,
          expiresAt: Date.now() + (token.expiresIn - TOKEN_REFRESH_BUFFER_SECONDS) * 1000,
        };
        pendingTokenRequest = null;
        return token;
      })
      .catch((err) => {
        pendingTokenRequest = null;
        throw err;
      });

    return pendingTokenRequest;
  }

  async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await getToken();
    const headers = new Headers(options.headers);
    headers.set('Authorization', `${token.tokenType} ${token.accessToken}`);
    if (!headers.has('x-fapi-interaction-id')) {
      headers.set('x-fapi-interaction-id', crypto.randomUUID());
    }
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    return fetch(url, { ...options, headers });
  }

  function consentEndpoint(type: 'account-access' | 'domestic-payment'): string {
    if (type === 'account-access') {
      return `${obieBaseUrl}/open-banking/v4.0/aisp/account-access-consents`;
    }
    return `${obieBaseUrl}/open-banking/v4.0/pisp/domestic-payment-consents`;
  }

  async function createConsent(
    type: 'account-access',
    payload: OBIEAccountAccessConsentRequest,
  ): Promise<OBIEAccountAccessConsentResponse>;
  async function createConsent(
    type: 'domestic-payment',
    payload: OBIEDomesticPaymentConsentRequest,
  ): Promise<OBIEDomesticPaymentConsentResponse>;
  async function createConsent(
    type: 'account-access' | 'domestic-payment',
    payload: OBIEAccountAccessConsentRequest | OBIEDomesticPaymentConsentRequest,
  ): Promise<OBIEAccountAccessConsentResponse | OBIEDomesticPaymentConsentResponse> {
    const url = consentEndpoint(type);
    const response = await fetchWithAuth(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const obieError = await parseOBIEError(response);
      throw new OBIEApiError(response.status, obieError);
    }

    return response.json();
  }

  async function exchangeAuthCode(
    code: string,
    redirectUri: string,
  ): Promise<AuthCodeExchangeResult> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    const response = await fetch(config.keycloakTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new TokenError(response.status, text);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      scope: data.scope ?? '',
      consentId: data.consent_id,
    };
  }

  return { getToken, fetchWithAuth, createConsent, exchangeAuthCode };
}
