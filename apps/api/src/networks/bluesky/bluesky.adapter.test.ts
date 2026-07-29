import type { NetworkAdapterPostItem, NetworkAdapterPostTarget } from '@sonskay/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfigService } from '../../config/app-config.service.js';
import { BlueskyApiError } from './bluesky-api-client.js';
import { BlueskyAdapter } from './bluesky.adapter.js';

function createConfig(): AppConfigService {
  return { blueskyServiceUrl: 'https://bsky.test' } as unknown as AppConfigService;
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function fakeAccessJwt(did: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: did })).toString('base64url');
  return `${header}.${payload}.signature`;
}

describe('BlueskyAdapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exposes the Bluesky capabilities and no redirect requirement', () => {
    const adapter = new BlueskyAdapter(createConfig());

    expect(adapter.capabilities).toEqual({
      maxChars: 300,
      maxImages: 4,
      supportsThread: true,
      supportsMentions: false,
    });
    expect(adapter.requiresRedirect).toBe(false);
  });

  it('startConnect throws since Bluesky has no redirect flow', () => {
    const adapter = new BlueskyAdapter(createConfig());

    expect(() => adapter.startConnect()).toThrow(/redirect-based/);
  });

  it('connect creates a session from the app password and returns the tokens', async () => {
    const accessJwt = fakeAccessJwt('did:plc:abc');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse(200, { accessJwt, refreshJwt: 'refresh-jwt', handle: 'jane.bsky.social', did: 'did:plc:abc' })
    );

    const adapter = new BlueskyAdapter(createConfig());
    const result = await adapter.connect(
      { id: 'user-1' },
      { type: 'app_password', identifier: 'jane.bsky.social', appPassword: 'xxxx-xxxx-xxxx-xxxx' }
    );

    expect(result).toEqual({ handle: 'jane.bsky.social', accessToken: accessJwt, refreshToken: 'refresh-jwt' });
  });

  it('refreshToken exchanges the refresh JWT for a new session', async () => {
    const newAccessJwt = fakeAccessJwt('did:plc:abc');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse(200, {
        accessJwt: newAccessJwt,
        refreshJwt: 'new-refresh-jwt',
        handle: 'jane.bsky.social',
        did: 'did:plc:abc',
      })
    );

    const adapter = new BlueskyAdapter(createConfig());
    const result = await adapter.refreshToken('old-refresh-jwt');

    expect(result).toEqual({ accessToken: newAccessJwt, refreshToken: 'new-refresh-jwt' });
    const [, requestInit] = fetchMock.mock.calls[0]!;
    expect((requestInit!.headers as Record<string, string>).authorization).toBe('Bearer old-refresh-jwt');
  });

  it('refreshToken surfaces a mappable error when the refresh JWT is invalid', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('ExpiredToken', { status: 401 }));

    const adapter = new BlueskyAdapter(createConfig());

    await expect(adapter.refreshToken('dead-refresh-jwt')).rejects.toThrow(BlueskyApiError);
  });

  it('connect rejects credentials that are not app_password', async () => {
    const adapter = new BlueskyAdapter(createConfig());

    await expect(
      adapter.connect(
        { id: 'user-1' },
        { type: 'oauth2_code', code: 'x', redirectUri: 'https://app.test', state: 'state', handle: 'jane' }
      )
    ).rejects.toThrow(/app_password/);
  });

  it('publish chains a thread using root/parent refs derived from the DID in the access token', async () => {
    const accessJwt = fakeAccessJwt('did:plc:abc');
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(200, { uri: 'at://did:plc:abc/app.bsky.feed.post/1', cid: 'cid-1' }))
      .mockResolvedValueOnce(jsonResponse(200, { uri: 'at://did:plc:abc/app.bsky.feed.post/2', cid: 'cid-2' }));

    const adapter = new BlueskyAdapter(createConfig());
    const target: NetworkAdapterPostTarget = {
      id: 'target-1',
      postId: 'post-1',
      socialAccountId: 'acc-1',
      accessToken: accessJwt,
    };
    const items: NetworkAdapterPostItem[] = [
      { id: 'item-1', orderIndex: 0, text: 'first' },
      { id: 'item-2', orderIndex: 1, text: 'second' },
    ];

    const results = await adapter.publish(target, items);

    expect(results).toEqual([
      {
        postTargetId: 'target-1',
        postItemId: 'item-1',
        externalId: 'at://did:plc:abc/app.bsky.feed.post/1#cid-1',
        status: 'success',
      },
      {
        postTargetId: 'target-1',
        postItemId: 'item-2',
        externalId: 'at://did:plc:abc/app.bsky.feed.post/2#cid-2',
        status: 'success',
      },
    ]);

    const secondCallBody = JSON.parse(fetchMock.mock.calls[1]![1]!.body as string);
    expect(secondCallBody.repo).toBe('did:plc:abc');
    expect(secondCallBody.record.reply.root.uri).toBe('at://did:plc:abc/app.bsky.feed.post/1');
    expect(secondCallBody.record.reply.parent.uri).toBe('at://did:plc:abc/app.bsky.feed.post/1');
  });

  describe('mapError', () => {
    const adapter = new BlueskyAdapter(createConfig());

    it('maps 401 to token_expired', () => {
      expect(adapter.mapError(new BlueskyApiError(401, 'unauthorized'))).toEqual({
        code: 'token_expired',
        message: 'Bluesky session expired or invalid',
        retryable: false,
      });
    });

    it('maps 429 to rate_limited (retryable)', () => {
      expect(adapter.mapError(new BlueskyApiError(429, 'too many requests'))).toEqual({
        code: 'rate_limited',
        message: 'Bluesky API rate limit exceeded',
        retryable: true,
      });
    });

    it('maps 400 to content_rejected', () => {
      expect(adapter.mapError(new BlueskyApiError(400, 'invalid record'))).toEqual({
        code: 'content_rejected',
        message: 'invalid record',
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
