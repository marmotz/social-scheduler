import type { NetworkAdapterPostItem, NetworkAdapterPostTarget } from '@sonskay/shared';
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfigService } from '../../config/app-config.service.js';
import { TwitterApiError } from './twitter-api-client.js';
import { TwitterAdapter } from './twitter.adapter.js';

function createConfig(overrides: Partial<AppConfigService> = {}): AppConfigService {
  return {
    twitterApiBaseUrl: 'https://api.twitter.test',
    twitterAuthorizeBaseUrl: 'https://twitter.test',
    twitterClientId: 'client-id',
    twitterClientSecret: 'client-secret',
    ...overrides,
  } as unknown as AppConfigService;
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('TwitterAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes the X capabilities', () => {
    const adapter = new TwitterAdapter(createConfig());

    expect(adapter.capabilities).toEqual({
      maxChars: 280,
      maxImages: 4,
      supportsThread: true,
      supportsMentions: false,
    });
    expect(adapter.requiresRedirect).toBe(true);
  });

  it('builds an authorization URL carrying the SHA-256 hash of the state as PKCE code_challenge', () => {
    const adapter = new TwitterAdapter(createConfig());

    const { authorizationUrl } = adapter.startConnect('https://app.test/callback', 'opaque-state');
    const url = new URL(authorizationUrl);
    const expectedChallenge = createHash('sha256').update('opaque-state').digest('base64url');

    expect(url.origin).toBe('https://twitter.test');
    expect(url.pathname).toBe('/i/oauth2/authorize');
    expect(url.searchParams.get('client_id')).toBe('client-id');
    expect(url.searchParams.get('redirect_uri')).toBe('https://app.test/callback');
    expect(url.searchParams.get('state')).toBe('opaque-state');
    expect(url.searchParams.get('code_challenge')).toBe(expectedChallenge);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('throws when TWITTER_CLIENT_ID is not configured', () => {
    const adapter = new TwitterAdapter(createConfig({ twitterClientId: undefined }));

    expect(() => adapter.startConnect('https://app.test/callback', 'state')).toThrow(/TWITTER_CLIENT_ID/);
  });

  it('connect exchanges the code and uses the user-confirmed handle', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(200, { access_token: 'access', refresh_token: 'refresh', expires_in: 7200 }));

    const adapter = new TwitterAdapter(createConfig());
    const result = await adapter.connect(
      { id: 'user-1' },
      {
        type: 'oauth2_code',
        code: 'auth-code',
        redirectUri: 'https://app.test/callback',
        state: 'verifier',
        handle: 'janedoe',
      }
    );

    expect(result).toEqual({ handle: 'janedoe', accessToken: 'access', refreshToken: 'refresh' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('connect strips a leading @ from the user-confirmed handle', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse(200, { access_token: 'access', refresh_token: 'refresh', expires_in: 7200 })
    );

    const adapter = new TwitterAdapter(createConfig());
    const result = await adapter.connect(
      { id: 'user-1' },
      {
        type: 'oauth2_code',
        code: 'auth-code',
        redirectUri: 'https://app.test/callback',
        state: 'verifier',
        handle: '@janedoe',
      }
    );

    expect(result.handle).toBe('janedoe');
  });

  it('refreshToken exchanges the refresh token for a new access token', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponse(200, { access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 7200 })
      );

    const adapter = new TwitterAdapter(createConfig());
    const result = await adapter.refreshToken('old-refresh');

    expect(result).toEqual({ accessToken: 'new-access', refreshToken: 'new-refresh' });
    const [, requestInit] = fetchMock.mock.calls[0]!;
    const body = requestInit!.body as URLSearchParams;
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe('old-refresh');
  });

  it('refreshToken surfaces a mappable error when the refresh token is invalid', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('invalid_grant', { status: 401 }));

    const adapter = new TwitterAdapter(createConfig());

    await expect(adapter.refreshToken('dead-refresh')).rejects.toThrow(TwitterApiError);
  });

  it('connect rejects credentials that are not oauth2_code', async () => {
    const adapter = new TwitterAdapter(createConfig());

    await expect(
      adapter.connect({ id: 'user-1' }, { type: 'app_password', identifier: 'jane', appPassword: 'secret' })
    ).rejects.toThrow(/oauth2_code/);
  });

  it('publish posts a thread by chaining reply-to ids', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(201, { data: { id: 'tweet-1' } }))
      .mockResolvedValueOnce(jsonResponse(201, { data: { id: 'tweet-2' } }));

    const adapter = new TwitterAdapter(createConfig());
    const target: NetworkAdapterPostTarget = {
      id: 'target-1',
      postId: 'post-1',
      socialAccountId: 'acc-1',
      accessToken: 'access',
    };
    const items: NetworkAdapterPostItem[] = [
      { id: 'item-2', orderIndex: 1, text: 'second' },
      { id: 'item-1', orderIndex: 0, text: 'first' },
    ];

    const results = await adapter.publish(target, items);

    expect(results).toEqual([
      { postTargetId: 'target-1', postItemId: 'item-1', externalId: 'tweet-1', status: 'success' },
      { postTargetId: 'target-1', postItemId: 'item-2', externalId: 'tweet-2', status: 'success' },
    ]);

    const secondCallBody = JSON.parse(vi.mocked(fetch).mock.calls[1]![1]!.body as string);
    expect(secondCallBody.reply.in_reply_to_tweet_id).toBe('tweet-1');
  });

  it('publish stops the thread and records the failure on error', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(201, { data: { id: 'tweet-1' } }))
      .mockResolvedValueOnce(new Response('rate limited', { status: 429 }));

    const adapter = new TwitterAdapter(createConfig());
    const target: NetworkAdapterPostTarget = {
      id: 'target-1',
      postId: 'post-1',
      socialAccountId: 'acc-1',
      accessToken: 'access',
    };
    const items: NetworkAdapterPostItem[] = [
      { id: 'item-1', orderIndex: 0, text: 'first' },
      { id: 'item-2', orderIndex: 1, text: 'second' },
    ];

    const results = await adapter.publish(target, items);

    expect(results).toEqual([
      { postTargetId: 'target-1', postItemId: 'item-1', externalId: 'tweet-1', status: 'success' },
      {
        postTargetId: 'target-1',
        postItemId: 'item-2',
        externalId: null,
        status: 'failed',
        errorMessage: 'Twitter API rate limit exceeded',
      },
    ]);
  });

  describe('mapError', () => {
    const adapter = new TwitterAdapter(createConfig());

    it('maps 401 to token_expired', () => {
      expect(adapter.mapError(new TwitterApiError(401, 'unauthorized'))).toEqual({
        code: 'token_expired',
        message: 'Twitter access token expired or invalid',
        retryable: false,
      });
    });

    it('maps 429 to rate_limited (retryable)', () => {
      expect(adapter.mapError(new TwitterApiError(429, 'too many requests'))).toEqual({
        code: 'rate_limited',
        message: 'Twitter API rate limit exceeded',
        retryable: true,
      });
    });

    it('maps 403 to content_rejected', () => {
      expect(adapter.mapError(new TwitterApiError(403, 'duplicate content'))).toEqual({
        code: 'content_rejected',
        message: 'duplicate content',
        retryable: false,
      });
    });

    it('maps unknown errors', () => {
      expect(adapter.mapError(new Error('boom'))).toEqual({
        code: 'unknown_error',
        message: 'boom',
        retryable: false,
      });
    });
  });
});
