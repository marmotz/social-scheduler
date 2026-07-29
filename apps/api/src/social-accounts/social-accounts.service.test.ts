import type { NetworkAdapter } from '@sonskay/shared';
import { TRPCError } from '@trpc/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BlueskyAdapter } from '../networks/bluesky/bluesky.adapter.js';
import type { TwitterAdapter } from '../networks/twitter/twitter.adapter.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { SocialAccountsService } from './social-accounts.service.js';

function createAdapter(overrides: Partial<NetworkAdapter> = {}): NetworkAdapter {
  return {
    capabilities: { maxChars: 280, maxImages: 4, supportsThread: true, supportsMentions: false },
    requiresRedirect: true,
    startConnect: vi.fn(() => ({ authorizationUrl: 'https://network.test/authorize' })),
    connect: vi.fn(),
    publish: vi.fn(),
    mapError: vi.fn((error: unknown) => ({
      code: 'unknown_error',
      message: error instanceof Error ? error.message : 'unknown',
      retryable: false,
    })),
    ...overrides,
  };
}

function createPrisma() {
  return {
    client: {
      socialAccount: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
  } as unknown as PrismaService;
}

describe('SocialAccountsService', () => {
  let prisma: ReturnType<typeof createPrisma>;
  let twitterAdapter: NetworkAdapter;
  let blueskyAdapter: NetworkAdapter;
  let service: SocialAccountsService;

  beforeEach(() => {
    prisma = createPrisma();
    twitterAdapter = createAdapter();
    blueskyAdapter = createAdapter({ requiresRedirect: false });
    service = new SocialAccountsService(
      prisma,
      twitterAdapter as unknown as TwitterAdapter,
      blueskyAdapter as unknown as BlueskyAdapter
    );
  });

  describe('listAccounts', () => {
    it('maps SocialAccount rows to summaries without exposing tokens', async () => {
      const createdAt = new Date('2026-01-01T00:00:00Z');
      vi.mocked(prisma.client.socialAccount.findMany).mockResolvedValue([
        {
          id: 'acc-1',
          network: 'TWITTER',
          handle: 'jane',
          status: 'CONNECTED',
          createdAt,
          accessToken: 'secret',
        },
      ] as never);

      const result = await service.listAccounts('user-1');

      expect(result).toEqual([
        { id: 'acc-1', network: 'TWITTER', handle: 'jane', status: 'CONNECTED', createdAt: createdAt.toISOString() },
      ]);
      expect(prisma.client.socialAccount.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('startConnect', () => {
    it('returns an authorization URL for redirect-based networks', () => {
      const result = service.startConnect('TWITTER', 'https://app.test/callback');

      expect(result.authorizationUrl).toBe('https://network.test/authorize');
      expect(result.state).toEqual(expect.any(String));
      expect(twitterAdapter.startConnect).toHaveBeenCalledWith('https://app.test/callback', result.state);
    });

    it('generates a state long enough to double as a PKCE code_verifier (RFC 7636: 43-128 chars)', () => {
      const result = service.startConnect('TWITTER', 'https://app.test/callback');

      expect(result.state.length).toBeGreaterThanOrEqual(43);
      expect(result.state.length).toBeLessThanOrEqual(128);
      expect(result.state).toMatch(/^[A-Za-z0-9._~-]+$/);
    });

    it('returns a null authorization URL for credential-based networks', () => {
      const result = service.startConnect('BLUESKY', 'https://app.test/callback');

      expect(result.authorizationUrl).toBeNull();
      expect(blueskyAdapter.startConnect).not.toHaveBeenCalled();
    });
  });

  describe('completeConnect', () => {
    const credentials = { type: 'app_password' as const, identifier: 'jane', appPassword: 'secret' };

    it('creates a new SocialAccount when none exists for this user/network/handle', async () => {
      vi.mocked(blueskyAdapter.connect).mockResolvedValue({
        handle: 'jane.bsky.social',
        accessToken: 'access',
        refreshToken: 'refresh',
      });
      vi.mocked(prisma.client.socialAccount.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.client.socialAccount.create).mockResolvedValue({
        id: 'acc-1',
        network: 'BLUESKY',
        handle: 'jane.bsky.social',
        status: 'CONNECTED',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      } as never);

      const result = await service.completeConnect('user-1', 'BLUESKY', credentials);

      expect(prisma.client.socialAccount.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          network: 'BLUESKY',
          handle: 'jane.bsky.social',
          accessToken: 'access',
          refreshToken: 'refresh',
          status: 'CONNECTED',
        },
      });
      expect(result.id).toBe('acc-1');
    });

    it('updates the existing SocialAccount when reconnecting the same handle', async () => {
      vi.mocked(blueskyAdapter.connect).mockResolvedValue({
        handle: 'jane.bsky.social',
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
      vi.mocked(prisma.client.socialAccount.findFirst).mockResolvedValue({ id: 'acc-1' } as never);
      vi.mocked(prisma.client.socialAccount.update).mockResolvedValue({
        id: 'acc-1',
        network: 'BLUESKY',
        handle: 'jane.bsky.social',
        status: 'CONNECTED',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      } as never);

      await service.completeConnect('user-1', 'BLUESKY', credentials);

      expect(prisma.client.socialAccount.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { accessToken: 'new-access', refreshToken: 'new-refresh', status: 'CONNECTED' },
      });
      expect(prisma.client.socialAccount.create).not.toHaveBeenCalled();
    });

    it('translates adapter connect failures into a BAD_REQUEST TRPCError', async () => {
      vi.mocked(blueskyAdapter.connect).mockRejectedValue(new Error('invalid app password'));
      vi.mocked(blueskyAdapter.mapError).mockReturnValue({
        code: 'content_rejected',
        message: 'Invalid app password',
        retryable: false,
      });

      await expect(service.completeConnect('user-1', 'BLUESKY', credentials)).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: 'Invalid app password',
      });
    });
  });

  describe('refreshAccountToken', () => {
    it('refreshes the tokens and marks the account CONNECTED on success', async () => {
      vi.mocked(prisma.client.socialAccount.findUnique).mockResolvedValue({
        id: 'acc-1',
        network: 'TWITTER',
        handle: 'jane',
        status: 'EXPIRED',
        refreshToken: 'old-refresh',
      } as never);
      twitterAdapter.refreshToken = vi
        .fn()
        .mockResolvedValue({ accessToken: 'new-access', refreshToken: 'new-refresh' });
      vi.mocked(prisma.client.socialAccount.update).mockResolvedValue({
        id: 'acc-1',
        network: 'TWITTER',
        handle: 'jane',
        status: 'CONNECTED',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      } as never);

      const result = await service.refreshAccountToken('acc-1');

      expect(prisma.client.socialAccount.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { accessToken: 'new-access', refreshToken: 'new-refresh', status: 'CONNECTED' },
      });
      expect(result.status).toBe('CONNECTED');
    });

    it('marks the account EXPIRED without calling the adapter when there is no stored refresh token', async () => {
      vi.mocked(prisma.client.socialAccount.findUnique).mockResolvedValue({
        id: 'acc-1',
        network: 'TWITTER',
        handle: 'jane',
        status: 'CONNECTED',
        refreshToken: null,
      } as never);
      twitterAdapter.refreshToken = vi.fn();
      vi.mocked(prisma.client.socialAccount.update).mockResolvedValue({} as never);

      await expect(service.refreshAccountToken('acc-1')).rejects.toBeInstanceOf(TRPCError);

      expect(prisma.client.socialAccount.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { status: 'EXPIRED' },
      });
      expect(twitterAdapter.refreshToken).not.toHaveBeenCalled();
    });

    it('marks the account EXPIRED when the adapter does not support refresh', async () => {
      vi.mocked(prisma.client.socialAccount.findUnique).mockResolvedValue({
        id: 'acc-1',
        network: 'BLUESKY',
        handle: 'jane.bsky.social',
        status: 'CONNECTED',
        refreshToken: 'refresh-jwt',
      } as never);
      vi.mocked(prisma.client.socialAccount.update).mockResolvedValue({} as never);

      await expect(service.refreshAccountToken('acc-1')).rejects.toBeInstanceOf(TRPCError);

      expect(prisma.client.socialAccount.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { status: 'EXPIRED' },
      });
    });

    it('marks the account REVOKED when the refresh token itself is rejected', async () => {
      vi.mocked(prisma.client.socialAccount.findUnique).mockResolvedValue({
        id: 'acc-1',
        network: 'TWITTER',
        handle: 'jane',
        status: 'CONNECTED',
        refreshToken: 'dead-refresh',
      } as never);
      twitterAdapter.refreshToken = vi.fn().mockRejectedValue(new Error('invalid_grant'));
      vi.mocked(twitterAdapter.mapError).mockReturnValue({
        code: 'token_expired',
        message: 'Twitter refresh token expired or invalid',
        retryable: false,
      });
      vi.mocked(prisma.client.socialAccount.update).mockResolvedValue({} as never);

      await expect(service.refreshAccountToken('acc-1')).rejects.toBeInstanceOf(TRPCError);

      expect(prisma.client.socialAccount.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { status: 'REVOKED' },
      });
    });

    it('leaves the status unchanged on a transient refresh error (e.g. rate limit)', async () => {
      vi.mocked(prisma.client.socialAccount.findUnique).mockResolvedValue({
        id: 'acc-1',
        network: 'TWITTER',
        handle: 'jane',
        status: 'CONNECTED',
        refreshToken: 'refresh',
      } as never);
      twitterAdapter.refreshToken = vi.fn().mockRejectedValue(new Error('rate limited'));
      vi.mocked(twitterAdapter.mapError).mockReturnValue({
        code: 'rate_limited',
        message: 'Twitter API rate limit exceeded',
        retryable: true,
      });
      vi.mocked(prisma.client.socialAccount.update).mockResolvedValue({} as never);

      await expect(service.refreshAccountToken('acc-1')).rejects.toBeInstanceOf(TRPCError);

      expect(prisma.client.socialAccount.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { status: 'CONNECTED' },
      });
    });

    it('throws NOT_FOUND when the account does not exist', async () => {
      vi.mocked(prisma.client.socialAccount.findUnique).mockResolvedValue(null);

      await expect(service.refreshAccountToken('missing')).rejects.toBeInstanceOf(TRPCError);
    });
  });

  describe('disconnect', () => {
    it('deletes the account when it belongs to the user', async () => {
      vi.mocked(prisma.client.socialAccount.findUnique).mockResolvedValue({
        id: 'acc-1',
        userId: 'user-1',
      } as never);

      await service.disconnect('user-1', 'acc-1');

      expect(prisma.client.socialAccount.delete).toHaveBeenCalledWith({ where: { id: 'acc-1' } });
    });

    it('throws NOT_FOUND when the account does not belong to the user', async () => {
      vi.mocked(prisma.client.socialAccount.findUnique).mockResolvedValue({
        id: 'acc-1',
        userId: 'someone-else',
      } as never);

      await expect(service.disconnect('user-1', 'acc-1')).rejects.toBeInstanceOf(TRPCError);
      expect(prisma.client.socialAccount.delete).not.toHaveBeenCalled();
    });

    it('throws NOT_FOUND when the account does not exist', async () => {
      vi.mocked(prisma.client.socialAccount.findUnique).mockResolvedValue(null);

      await expect(service.disconnect('user-1', 'missing')).rejects.toBeInstanceOf(TRPCError);
    });
  });
});
