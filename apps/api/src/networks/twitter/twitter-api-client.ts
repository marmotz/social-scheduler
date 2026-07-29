export class TwitterApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string
  ) {
    super(`Twitter API error ${status}: ${body}`);
  }
}

export interface TwitterTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export interface TwitterTweet {
  id: string;
}

/**
 * Thin wrapper around the X API v2 endpoints needed by the Twitter adapter.
 * Kept free of NestJS/Prisma concerns so it can be unit-tested by mocking `fetch`.
 */
export class TwitterApiClient {
  constructor(private readonly baseUrl: string) {}

  async exchangeAuthorizationCode(params: {
    code: string;
    redirectUri: string;
    codeVerifier: string;
    clientId: string;
    clientSecret: string;
  }): Promise<TwitterTokenResponse> {
    const response = await fetch(`${this.baseUrl}/2/oauth2/token`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from(`${params.clientId}:${params.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        code: params.code,
        grant_type: 'authorization_code',
        redirect_uri: params.redirectUri,
        code_verifier: params.codeVerifier,
      }),
    });

    if (!response.ok) {
      throw new TwitterApiError(response.status, await response.text());
    }

    return (await response.json()) as TwitterTokenResponse;
  }

  async refreshAccessToken(params: {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
  }): Promise<TwitterTokenResponse> {
    const response = await fetch(`${this.baseUrl}/2/oauth2/token`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        authorization: `Basic ${Buffer.from(`${params.clientId}:${params.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        refresh_token: params.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new TwitterApiError(response.status, await response.text());
    }

    return (await response.json()) as TwitterTokenResponse;
  }

  async createTweet(accessToken: string, params: { text: string; replyToTweetId?: string }): Promise<TwitterTweet> {
    const response = await fetch(`${this.baseUrl}/2/tweets`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        text: params.text,
        ...(params.replyToTweetId ? { reply: { in_reply_to_tweet_id: params.replyToTweetId } } : {}),
      }),
    });

    if (!response.ok) {
      throw new TwitterApiError(response.status, await response.text());
    }

    const body = (await response.json()) as { data: TwitterTweet };
    return body.data;
  }
}
