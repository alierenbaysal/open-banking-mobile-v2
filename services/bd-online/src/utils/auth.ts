/**
 * Keycloak OIDC integration using oidc-client-ts with PKCE.
 *
 * Keycloak realm: open-banking
 * Client ID: bd-online (public client, Authorization Code + PKCE)
 */

import { UserManager, WebStorageStateStore, User } from 'oidc-client-ts';

const KEYCLOAK_BASE = 'https://sso.tnd.bankdhofar.com/realms/open-banking';
const CLIENT_ID = 'bd-online';
const REDIRECT_URI = `${window.location.origin}/auth/callback`;
const POST_LOGOUT_URI = `${window.location.origin}/`;

const userManager = new UserManager({
  authority: KEYCLOAK_BASE,
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  post_logout_redirect_uri: POST_LOGOUT_URI,
  response_type: 'code',
  scope: 'openid profile email',
  automaticSilentRenew: false,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
  // Skip OIDC discovery — provide metadata directly to avoid cross-origin cert issues
  metadataUrl: undefined,
  metadata: {
    issuer: KEYCLOAK_BASE,
    authorization_endpoint: `${KEYCLOAK_BASE}/protocol/openid-connect/auth`,
    // Token + userinfo proxied through BD Online nginx to avoid self-signed cert issues
    token_endpoint: `${window.location.origin}/auth/realms/open-banking/protocol/openid-connect/token`,
    userinfo_endpoint: `${window.location.origin}/auth/realms/open-banking/protocol/openid-connect/userinfo`,
    end_session_endpoint: `${KEYCLOAK_BASE}/protocol/openid-connect/logout`,
    jwks_uri: `${window.location.origin}/auth/realms/open-banking/protocol/openid-connect/certs`,
  },
});

/** Redirect user to Keycloak login page. */
export async function login(extraArgs?: Record<string, string>): Promise<void> {
  await userManager.signinRedirect({ extraQueryParams: extraArgs });
}

/** Handle the callback after Keycloak login. */
export async function handleCallback(): Promise<User> {
  return await userManager.signinRedirectCallback();
}

/** Silent token refresh (iframe-based). */
export async function handleSilentRenew(): Promise<void> {
  await userManager.signinSilentCallback();
}

/** Get the current authenticated user, or null. */
export async function getUser(): Promise<User | null> {
  return await userManager.getUser();
}

/** Get the access token for API calls. */
export async function getAccessToken(): Promise<string | null> {
  const user = await userManager.getUser();
  if (!user || user.expired) return null;
  return user.access_token;
}

/** Extract customer_id from token claims. Falls back to 'sub'. */
export function getCustomerId(user: User): string {
  const profile = user.profile;
  // Keycloak may put customer_id in a custom claim or use 'preferred_username'
  return (profile as Record<string, unknown>).customer_id as string
    || profile.preferred_username
    || profile.sub;
}

/** Extract display name from token. */
export function getDisplayName(user: User): string {
  const profile = user.profile;
  return profile.name || profile.preferred_username || 'Customer';
}

/** Extract email from token. */
export function getEmail(user: User): string {
  return user.profile.email || '';
}

/** Logout from Keycloak. */
export async function logout(): Promise<void> {
  await userManager.signoutRedirect();
}

/** Check if user is authenticated. */
export async function isAuthenticated(): Promise<boolean> {
  const user = await userManager.getUser();
  return !!user && !user.expired;
}

/** Subscribe to user loaded/unloaded events. */
export function onUserLoaded(callback: (user: User) => void): void {
  userManager.events.addUserLoaded(callback);
}

export function onUserUnloaded(callback: () => void): void {
  userManager.events.addUserUnloaded(callback);
}

export function onAccessTokenExpiring(callback: () => void): void {
  userManager.events.addAccessTokenExpiring(callback);
}

export { userManager };
export type { User };
