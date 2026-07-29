import { Injectable } from '@nestjs/common';
import type {
  ConnectCredentials,
  Network,
  NetworkAdapter,
  SocialAccountSummary,
  StartConnectResult,
} from '@sonskay/shared';
import { TRPCError } from '@trpc/server';
import { randomBytes } from 'node:crypto';
import { BlueskyAdapter } from '../networks/bluesky/bluesky.adapter.js';
import { TwitterAdapter } from '../networks/twitter/twitter.adapter.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SocialAccountsService {
  private readonly adapters: Record<Network, NetworkAdapter>;

  constructor(
    private readonly prisma: PrismaService,
    twitterAdapter: TwitterAdapter,
    blueskyAdapter: BlueskyAdapter
  ) {
    this.adapters = { TWITTER: twitterAdapter, BLUESKY: blueskyAdapter };
  }

  async listAccounts(userId: string): Promise<SocialAccountSummary[]> {
    const accounts = await this.prisma.client.socialAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    return accounts.map((account) => ({
      id: account.id,
      network: account.network,
      handle: account.handle,
      status: account.status,
      createdAt: account.createdAt.toISOString(),
    }));
  }

  startConnect(network: Network, redirectUri: string): StartConnectResult {
    const adapter = this.getAdapter(network);
    // Also doubles as the Twitter PKCE code_verifier (see TwitterAdapter): RFC 7636
    // requires 43-128 characters, well above what randomUUID() (36 chars) provides.
    const state = randomBytes(48).toString('base64url');

    if (!adapter.requiresRedirect) {
      return { authorizationUrl: null, state };
    }

    const { authorizationUrl } = adapter.startConnect(redirectUri, state);
    return { authorizationUrl, state };
  }

  async completeConnect(
    userId: string,
    network: Network,
    credentials: ConnectCredentials
  ): Promise<SocialAccountSummary> {
    const adapter = this.getAdapter(network);

    let connectResult;
    try {
      connectResult = await adapter.connect({ id: userId }, credentials);
    } catch (error) {
      const publishError = adapter.mapError(error);
      throw new TRPCError({ code: 'BAD_REQUEST', message: publishError.message, cause: error });
    }

    const existing = await this.prisma.client.socialAccount.findFirst({
      where: { userId, network, handle: connectResult.handle },
    });

    const account = existing
      ? await this.prisma.client.socialAccount.update({
          where: { id: existing.id },
          data: {
            accessToken: connectResult.accessToken,
            refreshToken: connectResult.refreshToken,
            status: 'CONNECTED',
          },
        })
      : await this.prisma.client.socialAccount.create({
          data: {
            userId,
            network,
            handle: connectResult.handle,
            accessToken: connectResult.accessToken,
            refreshToken: connectResult.refreshToken,
            status: 'CONNECTED',
          },
        });

    return {
      id: account.id,
      network: account.network,
      handle: account.handle,
      status: account.status,
      createdAt: account.createdAt.toISOString(),
    };
  }

  /**
   * Attempts to refresh a `SocialAccount`'s access token, when its adapter supports it.
   * Not exposed over tRPC (no such endpoint was requested) — intended to be called by
   * the future publishing flow (#19/#20) when it detects a token has expired.
   */
  async refreshAccountToken(accountId: string): Promise<SocialAccountSummary> {
    const account = await this.prisma.client.socialAccount.findUnique({ where: { id: accountId } });
    if (!account) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Social account not found' });
    }

    const adapter = this.getAdapter(account.network);

    if (!account.refreshToken || !adapter.refreshToken) {
      const updated = await this.prisma.client.socialAccount.update({
        where: { id: accountId },
        data: { status: 'EXPIRED' },
      });
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `${account.network} account requires reconnecting (no refresh available)`,
        cause: updated,
      });
    }

    let refreshResult;
    try {
      refreshResult = await adapter.refreshToken(account.refreshToken);
    } catch (error) {
      const publishError = adapter.mapError(error);
      const newStatus = publishError.code === 'token_expired' ? 'REVOKED' : account.status;
      await this.prisma.client.socialAccount.update({ where: { id: accountId }, data: { status: newStatus } });
      throw new TRPCError({ code: 'BAD_REQUEST', message: publishError.message, cause: error });
    }

    const updated = await this.prisma.client.socialAccount.update({
      where: { id: accountId },
      data: {
        accessToken: refreshResult.accessToken,
        refreshToken: refreshResult.refreshToken,
        status: 'CONNECTED',
      },
    });

    return {
      id: updated.id,
      network: updated.network,
      handle: updated.handle,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async disconnect(userId: string, accountId: string): Promise<void> {
    const account = await this.prisma.client.socialAccount.findUnique({ where: { id: accountId } });
    if (!account || account.userId !== userId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Social account not found' });
    }

    await this.prisma.client.socialAccount.delete({ where: { id: accountId } });
  }

  private getAdapter(network: Network): NetworkAdapter {
    const adapter = this.adapters[network];
    if (!adapter) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: `Unsupported network: ${network}` });
    }
    return adapter;
  }
}
