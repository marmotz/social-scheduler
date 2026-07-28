import { describe, expect, it } from 'vitest';
import { mostRestrictiveCapabilities, type NetworkCapabilities } from './network-capabilities.js';

describe('mostRestrictiveCapabilities', () => {
  it('returns the single capabilities unchanged when only one network is given', () => {
    const capabilities: NetworkCapabilities = {
      maxChars: 280,
      maxImages: 4,
      supportsThread: true,
      supportsMentions: false,
    };

    expect(mostRestrictiveCapabilities([capabilities])).toEqual(capabilities);
  });

  it('takes the minimum of numeric limits across networks', () => {
    const twitter: NetworkCapabilities = {
      maxChars: 280,
      maxImages: 4,
      supportsThread: true,
      supportsMentions: false,
    };
    const bluesky: NetworkCapabilities = {
      maxChars: 300,
      maxImages: 2,
      supportsThread: true,
      supportsMentions: false,
    };

    expect(mostRestrictiveCapabilities([twitter, bluesky])).toEqual({
      maxChars: 280,
      maxImages: 2,
      supportsThread: true,
      supportsMentions: false,
    });
  });

  it('disables a boolean capability if any network does not support it', () => {
    const withThread: NetworkCapabilities = {
      maxChars: 280,
      maxImages: 4,
      supportsThread: true,
      supportsMentions: true,
    };
    const withoutThread: NetworkCapabilities = {
      maxChars: 300,
      maxImages: 4,
      supportsThread: false,
      supportsMentions: true,
    };

    expect(mostRestrictiveCapabilities([withThread, withoutThread]).supportsThread).toBe(false);
  });

  it('throws when given an empty list', () => {
    expect(() => mostRestrictiveCapabilities([])).toThrow();
  });
});
