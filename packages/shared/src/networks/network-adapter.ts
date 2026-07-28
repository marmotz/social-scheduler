import type { NetworkCapabilities } from './network-capabilities.js';

export interface NetworkAdapterUser {
  id: string;
}

export interface NetworkAdapterSocialAccount {
  id: string;
  userId: string;
  network: string;
  handle: string;
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
 */
export interface NetworkAdapter {
  capabilities: NetworkCapabilities;
  connect(user: NetworkAdapterUser): Promise<NetworkAdapterSocialAccount>;
  publish(
    target: NetworkAdapterPostTarget,
    items: NetworkAdapterPostItem[],
  ): Promise<NetworkAdapterPostTargetItem[]>;
  mapError(error: unknown): PublishError;
}
