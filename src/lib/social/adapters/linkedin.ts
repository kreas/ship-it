import type {
  PlatformAdapter,
  OAuthTokens,
  PkceOptions,
  PlatformUserProfile,
  PlatformPost,
  ListPostsOptions,
  ListPostsResult,
} from "./types";

const LINKEDIN_AUTH_BASE = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_API_BASE = "https://api.linkedin.com/v2";
const LINKEDIN_API_VERSION = "202401";

const LINKEDIN_SCOPES = ["openid", "profile", "w_member_social"];

function getConfig() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/oauth/linkedin/callback`;

  if (!clientId || !clientSecret) {
    throw new Error(
      "LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET are required for LinkedIn integration"
    );
  }

  return { clientId, clientSecret, redirectUri };
}

/** Common headers for LinkedIn API requests */
function getApiHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "LinkedIn-Version": LINKEDIN_API_VERSION,
    "X-Restli-Protocol-Version": "2.0.0",
  };
}

export class LinkedInAdapter implements PlatformAdapter {
  platform = "linkedin";

  getAuthorizationUrl(state: string, _pkce?: PkceOptions): string {
    const { clientId, redirectUri } = getConfig();

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: LINKEDIN_SCOPES.join(" "),
      state,
    });

    return `${LINKEDIN_AUTH_BASE}?${params}`;
  }

  async exchangeCode(code: string, _codeVerifier?: string): Promise<OAuthTokens> {
    const { clientId, clientSecret, redirectUri } = getConfig();

    const response = await fetch(LINKEDIN_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code: ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
      refresh_token_expires_in?: number;
      scope?: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      scopes: data.scope ? data.scope.split(" ") : LINKEDIN_SCOPES,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const { clientId, clientSecret } = getConfig();

    const response = await fetch(LINKEDIN_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
      scope?: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      scopes: data.scope ? data.scope.split(" ") : LINKEDIN_SCOPES,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async getUserProfile(accessToken: string): Promise<PlatformUserProfile> {
    // LinkedIn OpenID Connect userinfo endpoint
    const response = await fetch(`${LINKEDIN_API_BASE}/userinfo`, {
      headers: getApiHeaders(accessToken),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch profile: ${error}`);
    }

    const data = (await response.json()) as {
      sub: string;
      name: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
      email?: string;
    };

    return {
      platformUserId: data.sub,
      username: data.name,
      displayName: data.name,
      profilePictureUrl: data.picture,
    };
  }

  async listPosts(
    accessToken: string,
    options?: ListPostsOptions
  ): Promise<ListPostsResult> {
    // Get user ID first for the author URN
    const profile = await this.getUserProfile(accessToken);
    const authorUrn = `urn:li:person:${profile.platformUserId}`;

    const count = Math.min(options?.limit ?? 25, 100);
    const params = new URLSearchParams({
      author: authorUrn,
      q: "author",
      count: String(count),
      sortBy: "LAST_MODIFIED",
    });

    if (options?.after) {
      params.set("start", options.after);
    }

    const response = await fetch(`${LINKEDIN_API_BASE}/posts?${params}`, {
      headers: getApiHeaders(accessToken),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch posts: ${error}`);
    }

    const data = (await response.json()) as {
      elements: Array<{
        id: string;
        commentary?: string;
        publishedAt?: number;
        lifecycleState?: string;
        content?: {
          article?: { title?: string; description?: string };
          media?: { id?: string };
        };
        distribution?: {
          feedDistribution?: string;
        };
      }>;
      paging?: {
        start: number;
        count: number;
        total: number;
      };
    };

    const posts: PlatformPost[] = data.elements.map((post) => ({
      platformPostId: post.id,
      postType: post.content?.media ? "image" as const : "text" as const,
      caption: post.commentary,
      permalink: `https://www.linkedin.com/feed/update/${post.id}`,
      publishedAt: post.publishedAt
        ? new Date(post.publishedAt)
        : undefined,
    }));

    // Calculate next cursor for pagination
    const paging = data.paging;
    const nextStart = paging ? paging.start + paging.count : undefined;
    const hasMore = paging ? paging.start + paging.count < paging.total : false;

    return {
      posts,
      nextCursor: hasMore && nextStart !== undefined ? String(nextStart) : undefined,
      hasMore,
    };
  }

  async getPost(
    accessToken: string,
    platformPostId: string
  ): Promise<PlatformPost | null> {
    const response = await fetch(
      `${LINKEDIN_API_BASE}/posts/${platformPostId}`,
      {
        headers: getApiHeaders(accessToken),
      }
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      const error = await response.text();
      throw new Error(`Failed to fetch post: ${error}`);
    }

    const post = (await response.json()) as {
      id: string;
      commentary?: string;
      publishedAt?: number;
      lifecycleState?: string;
      content?: {
        article?: { title?: string; description?: string };
        media?: { id?: string };
      };
    };

    return {
      platformPostId: post.id,
      postType: post.content?.media ? "image" : "text",
      caption: post.commentary,
      permalink: `https://www.linkedin.com/feed/update/${post.id}`,
      publishedAt: post.publishedAt
        ? new Date(post.publishedAt)
        : undefined,
    };
  }
}
