import type { ConnectCredentials } from '../social-accounts/social-account-schemas.js';
import type { NetworkCapabilities } from './network-capabilities.js';

export interface NetworkAdapterUser {
  id: string;
}

/** Result of a successful `connect()` call, handed back to the caller for persistence as a `SocialAccount`. */
export interface NetworkAdapterConnectResult {
  handle: string;
  accessToken: string;
  refreshToken: string | null;
}

/** Result of a successful `refreshToken()` call. */
export interface NetworkAdapterRefreshResult {
  accessToken: string;
  refreshToken: string | null;
}

export interface NetworkAdapterPostItem {
  id: string;
  orderIndex: number;
  text: string;
}

export interface NetworkAdapterPostTarget {
  id: string;
  postId: string;
  socialAccountId: string;
  /** Decrypted access token for the `SocialAccount` behind this target, supplied by the caller. */
  accessToken: string;
}

export interface NetworkAdapterPostTargetItem {
  postTargetId: string;
  postItemId: string;
  externalId: string | null;
  status: string;
  errorMessage?: string | null;
}

export interface PublishError {
  code: string;
  message: string;
  retryable: boolean;
}

/**
 * Contract implemented by each `networks/*` module on the API side
 * (e.g. networks/twitter, networks/bluesky).
 *
 * Connecting a `SocialAccount` is a two-step process to accommodate both
 * redirect-based OAuth2 flows (Twitter: `startConnect` returns an
 * authorization URL, `connect` exchanges the callback code) and
 * credential-based flows (Bluesky app password: `startConnect` is a no-op,
 * `connect` validates the submitted credentials directly).
 */
export interface NetworkAdapter {
  capabilities: NetworkCapabilities;
  /** True for redirect-based OAuth flows; false when credentials are collected directly (e.g. app password). */
  requiresRedirect: boolean;
  /** Builds the authorization URL and opaque state for a redirect-based flow. Only relevant when `requiresRedirect` is true. */
  startConnect(redirectUri: string, state: string): { authorizationUrl: string };
  connect(user: NetworkAdapterUser, credentials: ConnectCredentials): Promise<NetworkAdapterConnectResult>;
  publish(target: NetworkAdapterPostTarget, items: NetworkAdapterPostItem[]): Promise<NetworkAdapterPostTargetItem[]>;
  mapError(error: unknown): PublishError;
  /** Exchanges a refresh token for a new access token. Omitted when the network has no refresh flow. */
  refreshToken?(refreshToken: string): Promise<NetworkAdapterRefreshResult>;
}
