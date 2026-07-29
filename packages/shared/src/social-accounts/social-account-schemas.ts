import { z } from 'zod';

export const networkSchema = z.enum(['TWITTER', 'BLUESKY']);
export type Network = z.infer<typeof networkSchema>;

export const socialAccountStatusSchema = z.enum(['CONNECTED', 'EXPIRED', 'REVOKED']);
export type SocialAccountStatus = z.infer<typeof socialAccountStatusSchema>;

export interface SocialAccountSummary {
  id: string;
  network: Network;
  handle: string;
  status: SocialAccountStatus;
  createdAt: string;
}

export const startConnectSchema = z.object({
  network: networkSchema,
  redirectUri: z.url(),
});

export interface StartConnectResult {
  /** Present for redirect-based flows (e.g. Twitter OAuth2); absent for credential-based ones (e.g. Bluesky). */
  authorizationUrl: string | null;
  state: string;
}

const oauth2ConnectCredentialsSchema = z.object({
  type: z.literal('oauth2_code'),
  code: z.string().min(1),
  redirectUri: z.url(),
  state: z.string().min(1),
  /**
   * User-provided handle, confirmed on the callback page. The X API Free tier does
   * not include read access (`GET /2/users/me`), so the handle cannot be resolved
   * from the API after the token exchange — it has to be supplied by the user.
   */
  handle: z.string().min(1),
});

const appPasswordConnectCredentialsSchema = z.object({
  type: z.literal('app_password'),
  identifier: z.string().min(1),
  appPassword: z.string().min(1),
});

export const connectCredentialsSchema = z.discriminatedUnion('type', [
  oauth2ConnectCredentialsSchema,
  appPasswordConnectCredentialsSchema,
]);
export type ConnectCredentials = z.infer<typeof connectCredentialsSchema>;

export const completeConnectSchema = z.object({
  network: networkSchema,
  credentials: connectCredentialsSchema,
});

export const disconnectSchema = z.object({
  accountId: z.string().min(1),
});
