export class BlueskyApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string
  ) {
    super(`Bluesky API error ${status}: ${body}`);
  }
}

export interface BlueskySession {
  accessJwt: string;
  refreshJwt: string;
  handle: string;
  did: string;
}

export interface BlueskyPostRef {
  uri: string;
  cid: string;
}

/**
 * Thin wrapper around the AT Protocol (Bluesky) XRPC endpoints needed by the
 * Bluesky adapter. Kept free of NestJS/Prisma concerns so it can be
 * unit-tested by mocking `fetch`.
 */
export class BlueskyApiClient {
  constructor(private readonly serviceUrl: string) {}

  async createSession(identifier: string, password: string): Promise<BlueskySession> {
    const response = await fetch(`${this.serviceUrl}/xrpc/com.atproto.server.createSession`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });

    if (!response.ok) {
      throw new BlueskyApiError(response.status, await response.text());
    }

    return (await response.json()) as BlueskySession;
  }

  async refreshSession(refreshJwt: string): Promise<BlueskySession> {
    const response = await fetch(`${this.serviceUrl}/xrpc/com.atproto.server.refreshSession`, {
      method: 'POST',
      headers: { authorization: `Bearer ${refreshJwt}` },
    });

    if (!response.ok) {
      throw new BlueskyApiError(response.status, await response.text());
    }

    return (await response.json()) as BlueskySession;
  }

  async createPost(
    accessJwt: string,
    did: string,
    params: { text: string; reply?: { root: BlueskyPostRef; parent: BlueskyPostRef } }
  ): Promise<BlueskyPostRef> {
    const response = await fetch(`${this.serviceUrl}/xrpc/com.atproto.repo.createRecord`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessJwt}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        repo: did,
        collection: 'app.bsky.feed.post',
        record: {
          $type: 'app.bsky.feed.post',
          text: params.text,
          createdAt: new Date().toISOString(),
          ...(params.reply ? { reply: params.reply } : {}),
        },
      }),
    });

    if (!response.ok) {
      throw new BlueskyApiError(response.status, await response.text());
    }

    return (await response.json()) as BlueskyPostRef;
  }
}
