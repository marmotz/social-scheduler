import type { Network } from '../social-accounts/social-account-schemas.js';

export interface NetworkCapabilities {
  maxChars: number;
  maxImages: number;
  supportsThread: boolean;
  supportsMentions: boolean;
}

/**
 * Static per-network capabilities, shared between each `networks/*` adapter (API side)
 * and the post composer (frontend), so the two never drift apart.
 */
export const NETWORK_CAPABILITIES: Record<Network, NetworkCapabilities> = {
  TWITTER: { maxChars: 280, maxImages: 4, supportsThread: true, supportsMentions: false },
  BLUESKY: { maxChars: 300, maxImages: 4, supportsThread: true, supportsMentions: false },
};

/**
 * Combines several networks' capabilities into the most restrictive common
 * denominator, used to validate/warn on a post targeting multiple networks
 * at once (front-end display, revalidated server-side on submit).
 */
export function mostRestrictiveCapabilities(capabilities: NetworkCapabilities[]): NetworkCapabilities {
  if (capabilities.length === 0) {
    throw new Error('mostRestrictiveCapabilities requires at least one NetworkCapabilities');
  }

  return capabilities.reduce((acc, current) => ({
    maxChars: Math.min(acc.maxChars, current.maxChars),
    maxImages: Math.min(acc.maxImages, current.maxImages),
    supportsThread: acc.supportsThread && current.supportsThread,
    supportsMentions: acc.supportsMentions && current.supportsMentions,
  }));
}
