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
import { createHash } from 'node:crypto';
import { AppConfigService } from '../../config/app-config.service.js';
import { TwitterApiClient, TwitterApiError } from './twitter-api-client.js';

/**
 * Implements `NetworkAdapter` for X/Twitter using OAuth2 with PKCE (S256).
 *
 * Simplification: rather than persisting a server-side session for the in-flight
 * authorization request, the PKCE `code_verifier` sent to X *is* the opaque `state`
 * value round-tripped through the callback URL — `code_challenge` is its SHA-256
 * hash. This keeps the connect flow stateless on the API side. `plain` is documented
 * as a supported `code_challenge_method` by X, but was observed to be rejected in
 * practice; `S256` is the method X's own examples use and works reliably.
 */
@Injectable()
export class TwitterAdapter implements NetworkAdapter {
  readonly capabilities = NETWORK_CAPABILITIES.TWITTER;
  readonly requiresRedirect = true;

  private readonly client: TwitterApiClient;

  constructor(private readonly config: AppConfigService) {
    this.client = new TwitterApiClient(config.twitterApiBaseUrl);
  }

  startConnect(redirectUri: string, state: string): { authorizationUrl: string } {
    const clientId = this.requireClientId();
    const url = new URL('/i/oauth2/authorize', this.config.twitterAuthorizeBaseUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('scope', 'tweet.read tweet.write offline.access');
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', createHash('sha256').update(state).digest('base64url'));
    url.searchParams.set('code_challenge_method', 'S256');

    return { authorizationUrl: url.toString() };
  }

  async connect(_user: NetworkAdapterUser, credentials: ConnectCredentials): Promise<NetworkAdapterConnectResult> {
    if (credentials.type !== 'oauth2_code') {
      throw new Error('TwitterAdapter.connect requires oauth2_code credentials');
    }

    const tokens = await this.client.exchangeAuthorizationCode({
      code: credentials.code,
      redirectUri: credentials.redirectUri,
      codeVerifier: credentials.state,
      clientId: this.requireClientId(),
      clientSecret: this.requireClientSecret(),
    });

    return {
      // The X API Free tier has no read access (`GET /2/users/me`), so the handle
      // can't be resolved from the API — the user confirms it on the callback page.
      handle: credentials.handle.replace(/^@/, ''),
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
    };
  }

  async refreshToken(refreshToken: string): Promise<NetworkAdapterRefreshResult> {
    const tokens = await this.client.refreshAccessToken({
      refreshToken,
      clientId: this.requireClientId(),
      clientSecret: this.requireClientSecret(),
    });

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
    };
  }

  async publish(
    target: NetworkAdapterPostTarget,
    items: NetworkAdapterPostItem[]
  ): Promise<NetworkAdapterPostTargetItem[]> {
    const sortedItems = [...items].sort((a, b) => a.orderIndex - b.orderIndex);
    const results: NetworkAdapterPostTargetItem[] = [];
    let previousTweetId: string | undefined;

    for (const item of sortedItems) {
      try {
        const tweet = await this.client.createTweet(target.accessToken, {
          text: item.text,
          replyToTweetId: previousTweetId,
        });
        previousTweetId = tweet.id;
        results.push({
          postTargetId: target.id,
          postItemId: item.id,
          externalId: tweet.id,
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
    if (error instanceof TwitterApiError) {
      if (error.status === 401) {
        return { code: 'token_expired', message: 'Twitter access token expired or invalid', retryable: false };
      }
      if (error.status === 429) {
        return { code: 'rate_limited', message: 'Twitter API rate limit exceeded', retryable: true };
      }
      if (error.status === 403 || error.status === 400) {
        return { code: 'content_rejected', message: error.body || 'Content rejected by Twitter', retryable: false };
      }
      return { code: 'twitter_api_error', message: error.message, retryable: error.status >= 500 };
    }

    return {
      code: 'unknown_error',
      message: error instanceof Error ? error.message : 'Unknown Twitter adapter error',
      retryable: false,
    };
  }

  private requireClientId(): string {
    const clientId = this.config.twitterClientId;
    if (!clientId) {
      throw new Error('TWITTER_CLIENT_ID is not configured');
    }
    return clientId;
  }

  private requireClientSecret(): string {
    const clientSecret = this.config.twitterClientSecret;
    if (!clientSecret) {
      throw new Error('TWITTER_CLIENT_SECRET is not configured');
    }
    return clientSecret;
  }
}
