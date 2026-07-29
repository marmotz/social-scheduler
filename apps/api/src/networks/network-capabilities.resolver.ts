import { Injectable } from '@nestjs/common';
import type { Network, NetworkAdapter, NetworkCapabilities } from '@sonskay/shared';
import { mostRestrictiveCapabilities } from '@sonskay/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { BlueskyAdapter } from './bluesky/bluesky.adapter.js';
import { TwitterAdapter } from './twitter/twitter.adapter.js';

/**
 * Shared by `posts` and `media`: both need the "most restrictive limit across
 * targeted networks" rule from `technical.md` §Interface NetworkAdapter,
 * revalidated server-side, so the account/post -> network -> capabilities
 * lookup lives here once instead of being duplicated in each service.
 */
@Injectable()
export class NetworkCapabilitiesResolver {
  private readonly adaptersByNetwork: Record<Network, NetworkAdapter>;

  constructor(
    private readonly prisma: PrismaService,
    twitterAdapter: TwitterAdapter,
    blueskyAdapter: BlueskyAdapter
  ) {
    this.adaptersByNetwork = { TWITTER: twitterAdapter, BLUESKY: blueskyAdapter };
  }

  capabilitiesForNetworks(networks: Network[]): NetworkCapabilities {
    return mostRestrictiveCapabilities(networks.map((network) => this.adaptersByNetwork[network].capabilities));
  }

  async capabilitiesForAccountIds(socialAccountIds: string[]): Promise<NetworkCapabilities> {
    const accounts = await this.prisma.client.socialAccount.findMany({
      where: { id: { in: socialAccountIds } },
      select: { network: true },
    });
    return this.capabilitiesForNetworks(accounts.map((account) => account.network));
  }

  async capabilitiesForPost(postId: string): Promise<NetworkCapabilities> {
    const targets = await this.prisma.client.postTarget.findMany({
      where: { postId },
      select: { socialAccount: { select: { network: true } } },
    });
    return this.capabilitiesForNetworks(targets.map((target) => target.socialAccount.network));
  }
}
