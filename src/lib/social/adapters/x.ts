import type {
  PlatformAdapter,
  OAuthTokens,
  PkceOptions,
  PlatformUserProfile,
  PlatformPost,
  ListPostsOptions,
  ListPostsResult,
} from "./types";

const X_AUTH_BASE = "https://twitter.com/i/oauth2/authorize";
const X_TOKEN_URL = "https://api.x.com/2/oauth2/token";
const X_API_BASE = "https://api.x.com/2";

const X_SCOPES = ["tweet.read", "users.read", "offline.access"];

function getConfig() {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/oauth/x/callback`;

  if (!clientId || !clientSecret) {
    throw new Error(
      "X_CLIENT_ID and X_CLIENT_SECRET are required for X (Twitter) integration"
    );
  }

  return { clientId, clientSecret, redirectUri };
}

/** Build basic auth header for X token endpoint */
function getBasicAuthHeader(): string {
  const { clientId, clientSecret } = getConfig();
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
}

export class XAdapter implements PlatformAdapter {
  platform = "x";

  /** User ID cached from getUserProfile for listPosts */
  private cachedUserId: string | null = null;

  getAuthorizationUrl(state: string, _pkce?: PkceOptions): string {
    const { clientId, redirectUri } = getConfig();

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: X_SCOPES.join(" "),
      state,
      // X OAuth 2.0 supports PKCE but it's optional for confidential clients
      // with a client_secret. We use plain flow for simplicity.
      code_challenge: "challenge",
      code_challenge_method: "plain",
    });

    return `${X_AUTH_BASE}?${params}`;
  }

  async exchangeCode(code: string, _codeVerifier?: string): Promise<OAuthTokens> {
    const { redirectUri } = getConfig();

    const response = await fetch(X_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: getBasicAuthHeader(),
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code_verifier: "challenge", // Matches plain code_challenge
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code: ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
      token_type: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      scopes: data.scope ? data.scope.split(" ") : X_SCOPES,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const response = await fetch(X_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: getBasicAuthHeader(),
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      scopes: data.scope ? data.scope.split(" ") : X_SCOPES,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async getUserProfile(accessToken: string): Promise<PlatformUserProfile> {
    const response = await fetch(
      `${X_API_BASE}/users/me?user.fields=id,name,username,profile_image_url`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch profile: ${error}`);
    }

    const result = (await response.json()) as {
      data: {
        id: string;
        name: string;
        username: string;
        profile_image_url?: string;
      };
    };

    const user = result.data;

    return {
      platformUserId: user.id,
      username: user.username,
      displayName: user.name,
      profilePictureUrl: user.profile_image_url,
    };
  }

  async listPosts(
    accessToken: string,
    options?: ListPostsOptions
  ): Promise<ListPostsResult> {
    // We need the user ID for listing tweets — get it if not cached
    if (!this.cachedUserId) {
      const profile = await this.getUserProfile(accessToken);
      this.cachedUserId = profile.platformUserId;
    }

    const limit = Math.min(options?.limit ?? 25, 100);
    const params = new URLSearchParams({
      "tweet.fields": "id,text,created_at,public_metrics,entities",
      max_results: String(Math.max(limit, 5)), // X API minimum is 5
    });

    if (options?.after) {
      params.set("pagination_token", options.after);
    }

    const response = await fetch(
      `${X_API_BASE}/users/${this.cachedUserId}/tweets?${params}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch tweets: ${error}`);
    }

    const result = (await response.json()) as {
      data?: Array<{
        id: string;
        text: string;
        created_at?: string;
        public_metrics?: {
          like_count: number;
          reply_count: number;
          retweet_count: number;
          impression_count?: number;
          quote_count?: number;
        };
      }>;
      meta?: {
        next_token?: string;
        result_count: number;
      };
    };

    const tweets = result.data || [];

    const posts: PlatformPost[] = tweets.map((tweet) => ({
      platformPostId: tweet.id,
      postType: "text" as const,
      caption: tweet.text,
      permalink: `https://x.com/i/status/${tweet.id}`,
      likeCount: tweet.public_metrics?.like_count,
      commentCount: tweet.public_metrics?.reply_count,
      shareCount: tweet.public_metrics?.retweet_count,
      viewCount: tweet.public_metrics?.impression_count,
      publishedAt: tweet.created_at
        ? new Date(tweet.created_at)
        : undefined,
    }));

    return {
      posts,
      nextCursor: result.meta?.next_token,
      hasMore: !!result.meta?.next_token,
    };
  }

  async getPost(
    accessToken: string,
    platformPostId: string
  ): Promise<PlatformPost | null> {
    const response = await fetch(
      `${X_API_BASE}/tweets/${platformPostId}?tweet.fields=id,text,created_at,public_metrics,entities`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      const error = await response.text();
      throw new Error(`Failed to fetch tweet: ${error}`);
    }

    const result = (await response.json()) as {
      data?: {
        id: string;
        text: string;
        created_at?: string;
        public_metrics?: {
          like_count: number;
          reply_count: number;
          retweet_count: number;
          impression_count?: number;
        };
      };
    };

    const tweet = result.data;
    if (!tweet) return null;

    return {
      platformPostId: tweet.id,
      postType: "text",
      caption: tweet.text,
      permalink: `https://x.com/i/status/${tweet.id}`,
      likeCount: tweet.public_metrics?.like_count,
      commentCount: tweet.public_metrics?.reply_count,
      shareCount: tweet.public_metrics?.retweet_count,
      viewCount: tweet.public_metrics?.impression_count,
      publishedAt: tweet.created_at
        ? new Date(tweet.created_at)
        : undefined,
    };
  }
}
