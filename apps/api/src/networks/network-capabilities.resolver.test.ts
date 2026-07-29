import type { NetworkAdapter } from '@sonskay/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { BlueskyAdapter } from './bluesky/bluesky.adapter.js';
import { NetworkCapabilitiesResolver } from './network-capabilities.resolver.js';
import type { TwitterAdapter } from './twitter/twitter.adapter.js';

function createAdapter(capabilities: NetworkAdapter['capabilities']): NetworkAdapter {
  return {
    capabilities,
    requiresRedirect: false,
    startConnect: vi.fn(),
    connect: vi.fn(),
    publish: vi.fn(),
    mapError: vi.fn(),
  };
}

function createPrisma() {
  return {
    client: {
      socialAccount: { findMany: vi.fn() },
      postTarget: { findMany: vi.fn() },
    },
  } as unknown as PrismaService;
}

describe('NetworkCapabilitiesResolver', () => {
  let prisma: ReturnType<typeof createPrisma>;
  let resolver: NetworkCapabilitiesResolver;

  beforeEach(() => {
    prisma = createPrisma();
    const twitterAdapter = createAdapter({
      maxChars: 280,
      maxImages: 4,
      supportsThread: true,
      supportsMentions: false,
    });
    const blueskyAdapter = createAdapter({
      maxChars: 300,
      maxImages: 4,
      supportsThread: true,
      supportsMentions: false,
    });
    resolver = new NetworkCapabilitiesResolver(
      prisma,
      twitterAdapter as unknown as TwitterAdapter,
      blueskyAdapter as unknown as BlueskyAdapter
    );
  });

  describe('capabilitiesForNetworks', () => {
    it('returns the most restrictive combination', () => {
      const capabilities = resolver.capabilitiesForNetworks(['TWITTER', 'BLUESKY']);

      expect(capabilities).toEqual({ maxChars: 280, maxImages: 4, supportsThread: true, supportsMentions: false });
    });
  });

  describe('capabilitiesForAccountIds', () => {
    it('looks up the accounts networks and combines their capabilities', async () => {
      vi.mocked(prisma.client.socialAccount.findMany).mockResolvedValue([
        { network: 'TWITTER' },
        { network: 'BLUESKY' },
      ] as never);

      const capabilities = await resolver.capabilitiesForAccountIds(['acc-1', 'acc-2']);

      expect(prisma.client.socialAccount.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['acc-1', 'acc-2'] } },
        select: { network: true },
      });
      expect(capabilities.maxChars).toBe(280);
    });
  });

  describe('capabilitiesForPost', () => {
    it('looks up the post targets networks and combines their capabilities', async () => {
      vi.mocked(prisma.client.postTarget.findMany).mockResolvedValue([
        { socialAccount: { network: 'BLUESKY' } },
      ] as never);

      const capabilities = await resolver.capabilitiesForPost('post-1');

      expect(prisma.client.postTarget.findMany).toHaveBeenCalledWith({
        where: { postId: 'post-1' },
        select: { socialAccount: { select: { network: true } } },
      });
      expect(capabilities.maxChars).toBe(300);
    });
  });
});
