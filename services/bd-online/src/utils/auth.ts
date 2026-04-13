/**
 * Keycloak OIDC integration — manual PKCE flow (no oidc-client-ts).
 * This avoids the state management issues of oidc-client-ts.
 */

const SSO_BASE = 'https://sso.tnd.bankdhofar.com/realms/open-banking';
const TOKEN_PROXY = '/auth/realms/open-banking/protocol/openid-connect/token';
const CLIENT_ID = 'bd-online';
const REDIRECT_URI = `${window.location.origin}/auth/callback`;

const TOKEN_KEY = 'bd_online_token';
const USER_KEY = 'bd_online_user';
const PKCE_VERIFIER_KEY = 'bd_online_pkce_verifier';
const OIDC_STATE_KEY = 'bd_online_oidc_state';

export interface User {
  sub: string;
  email: string;
  name: string;
  preferred_username: string;
  customer_id?: string;
  accounts?: string[];
  access_token: string;
  profile: Record<string, unknown>;
  expired: boolean;
}

// PKCE helpers
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, b => chars[b % chars.length]).join('');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(plain));
}

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  bytes.forEach(b => str += String.fromCharCode(b));
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Redirect user to Keycloak login page with PKCE. */
export async function login(): Promise<void> {
  const verifier = generateRandomString(64);
  const challenge = base64urlEncode(await sha256(verifier));
  const state = generateRandomString(32);

  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(OIDC_STATE_KEY, state);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid profile email',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  window.location.href = `${SSO_BASE}/protocol/openid-connect/auth?${params.toString()}`;
}

/** Handle the callback after Keycloak login. Returns the user. */
export async function handleCallback(): Promise<User> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const returnedState = params.get('state');
  const savedState = sessionStorage.getItem(OIDC_STATE_KEY);
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);

  if (!code) throw new Error('No authorization code in callback');
  if (!verifier) throw new Error('No PKCE verifier found');
  if (returnedState !== savedState) throw new Error('State mismatch');

  // Clean up
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(OIDC_STATE_KEY);

  // Exchange code for token via proxied endpoint
  const tokenResp = await fetch(TOKEN_PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }).toString(),
  });

  if (!tokenResp.ok) {
    const err = await tokenResp.text();
    throw new Error(`Token exchange failed: ${tokenResp.status} ${err}`);
  }

  const tokenData = await tokenResp.json();
  const accessToken = tokenData.access_token;
  const idToken = tokenData.id_token;

  // Decode ID token payload (no validation needed — Keycloak is trusted)
  const payload = JSON.parse(atob(idToken.split('.')[1]));

  const user: User = {
    sub: payload.sub,
    email: payload.email || payload.preferred_username || '',
    name: payload.name || payload.preferred_username || 'Customer',
    preferred_username: payload.preferred_username || '',
    customer_id: payload.customer_id,
    accounts: payload.accounts,
    access_token: accessToken,
    profile: payload,
    expired: false,
  };

  sessionStorage.setItem(TOKEN_KEY, accessToken);
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));

  return user;
}

/** Get the current authenticated user, or null. */
export async function getUser(): Promise<User | null> {
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

/** Get the access token for API calls. */
export async function getAccessToken(): Promise<string | null> {
  return sessionStorage.getItem(TOKEN_KEY);
}

/** Extract customer_id from user. */
export function getCustomerId(user: User): string {
  return user.customer_id || user.preferred_username || user.sub;
}

/** Extract display name. */
export function getDisplayName(user: User): string {
  return user.name || user.preferred_username || 'Customer';
}

/** Extract email. */
export function getEmail(user: User): string {
  return user.email || '';
}

/** Logout. */
export async function logout(): Promise<void> {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  window.location.href = `${SSO_BASE}/protocol/openid-connect/logout?post_logout_redirect_uri=${encodeURIComponent(window.location.origin + '/')}&client_id=${CLIENT_ID}`;
}

/** Check if user is authenticated. */
export async function isAuthenticated(): Promise<boolean> {
  return sessionStorage.getItem(TOKEN_KEY) !== null;
}

// Stubs for compatibility
export function onUserLoaded(_cb: (user: User) => void): void {}
export function onUserUnloaded(_cb: () => void): void {}
export function onAccessTokenExpiring(_cb: () => void): void {}
export function handleSilentRenew(): Promise<void> { return Promise.resolve(); }
export const userManager = null;
