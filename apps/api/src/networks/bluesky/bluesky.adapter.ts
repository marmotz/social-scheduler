import { Injectable } from '@nestjs/common';
import type {
  ConnectCredentials,
  NetworkAdapter,
  NetworkAdapterConnectResult,
  NetworkAdapterPostItem,
  NetworkAdapterPostTarget,
  NetworkAdapterPostTargetItem,
  NetworkAdapterRefreshResult,
  NetworkAdapterUser,
  PublishError,
} from '@sonskay/shared';
import { NETWORK_CAPABILITIES } from '@sonskay/shared';
import { AppConfigService } from '../../config/app-config.service.js';
import { BlueskyApiClient, BlueskyApiError, type BlueskyPostRef } from './bluesky-api-client.js';

/** AT Protocol access JWTs carry the account DID in the standard `sub` claim. */
function extractDidFromAccessJwt(accessJwt: string): string {
  const payload = accessJwt.split('.')[1];
  if (!payload) {
    throw new Error('Malformed Bluesky access token');
  }
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: string };
  if (!decoded.sub) {
    throw new Error('Bluesky access token is missing a subject (did)');
  }
  return decoded.sub;
}

function toExternalId(ref: BlueskyPostRef): string {
  return `${ref.uri}#${ref.cid}`;
}

/**
 * Implements `NetworkAdapter` for Bluesky using AT Protocol app passwords
 * (no OAuth authorization server is publicly available for third-party apps yet).
 */
@Injectable()
export class BlueskyAdapter implements NetworkAdapter {
  readonly capabilities = NETWORK_CAPABILITIES.BLUESKY;
  readonly requiresRedirect = false;

  private readonly client: BlueskyApiClient;

  constructor(private readonly config: AppConfigService) {
    this.client = new BlueskyApiClient(config.blueskyServiceUrl);
  }

  startConnect(): { authorizationUrl: string } {
    throw new Error('BlueskyAdapter does not use a redirect-based connect flow');
  }

  async connect(_user: NetworkAdapterUser, credentials: ConnectCredentials): Promise<NetworkAdapterConnectResult> {
    if (credentials.type !== 'app_password') {
      throw new Error('BlueskyAdapter.connect requires app_password credentials');
    }

    const session = await this.client.createSession(credentials.identifier, credentials.appPassword);

    return {
      handle: session.handle,
      accessToken: session.accessJwt,
      refreshToken: session.refreshJwt,
    };
  }

  async refreshToken(refreshToken: string): Promise<NetworkAdapterRefreshResult> {
    const session = await this.client.refreshSession(refreshToken);

    return {
      accessToken: session.accessJwt,
      refreshToken: session.refreshJwt,
    };
  }

  async publish(
    target: NetworkAdapterPostTarget,
    items: NetworkAdapterPostItem[]
  ): Promise<NetworkAdapterPostTargetItem[]> {
    const sortedItems = [...items].sort((a, b) => a.orderIndex - b.orderIndex);
    const results: NetworkAdapterPostTargetItem[] = [];
    const did = extractDidFromAccessJwt(target.accessToken);
    let root: BlueskyPostRef | undefined;
    let parent: BlueskyPostRef | undefined;

    for (const item of sortedItems) {
      try {
        const postRef = await this.client.createPost(target.accessToken, did, {
          text: item.text,
          reply: root && parent ? { root, parent } : undefined,
        });
        root ??= postRef;
        parent = postRef;
        results.push({
          postTargetId: target.id,
          postItemId: item.id,
          externalId: toExternalId(postRef),
          status: 'success',
        });
      } catch (error) {
        const publishError = this.mapError(error);
        results.push({
          postTargetId: target.id,
          postItemId: item.id,
          externalId: null,
          status: 'failed',
          errorMessage: publishError.message,
        });
        break;
      }
    }

    return results;
  }

  mapError(error: unknown): PublishError {
    if (error instanceof BlueskyApiError) {
      if (error.status === 401) {
        return { code: 'token_expired', message: 'Bluesky session expired or invalid', retryable: false };
      }
      if (error.status === 429) {
        return { code: 'rate_limited', message: 'Bluesky API rate limit exceeded', retryable: true };
      }
      if (error.status === 400) {
        return { code: 'content_rejected', message: error.body || 'Content rejected by Bluesky', retryable: false };
      }
      return { code: 'bluesky_api_error', message: error.message, retryable: error.status >= 500 };
    }

    return {
      code: 'unknown_error',
      message: error instanceof Error ? error.message : 'Unknown Bluesky adapter error',
      retryable: false,
    };
  }
}
