import type {
  PlatformAdapter,
  OAuthTokens,
  PlatformUserProfile,
  PlatformPost,
  ListPostsOptions,
  ListPostsResult,
} from "./types";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

const FACEBOOK_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_read_user_content",
];

function getConfig() {
  const clientId = process.env.FACEBOOK_APP_ID;
  const clientSecret = process.env.FACEBOOK_APP_SECRET;
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/oauth/facebook/callback`;

  if (!clientId || !clientSecret) {
    throw new Error(
      "FACEBOOK_APP_ID and FACEBOOK_APP_SECRET are required for Facebook integration"
    );
  }

  return { clientId, clientSecret, redirectUri };
}

export class FacebookAdapter implements PlatformAdapter {
  platform = "facebook";

  getAuthorizationUrl(state: string): string {
    const { clientId, redirectUri } = getConfig();

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: FACEBOOK_SCOPES.join(","),
      response_type: "code",
      state,
    });

    return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokens> {
    const { clientId, clientSecret, redirectUri } = getConfig();

    // Exchange code for short-lived token
    const tokenResponse = await fetch(
      `${GRAPH_API_BASE}/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Failed to exchange code: ${error}`);
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      token_type: string;
      expires_in?: number;
    };

    // Exchange for long-lived token
    const longLivedResponse = await fetch(
      `${GRAPH_API_BASE}/oauth/access_token?${new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: clientId,
        client_secret: clientSecret,
        fb_exchange_token: tokenData.access_token,
      })}`
    );

    if (!longLivedResponse.ok) {
      // Fall back to short-lived token
      return {
        accessToken: tokenData.access_token,
        scopes: FACEBOOK_SCOPES,
        expiresAt: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000)
          : undefined,
      };
    }

    const longLivedData = (await longLivedResponse.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
    };

    return {
      accessToken: longLivedData.access_token,
      scopes: FACEBOOK_SCOPES,
      expiresAt: new Date(Date.now() + longLivedData.expires_in * 1000),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const { clientId, clientSecret } = getConfig();

    // Facebook long-lived tokens are refreshed by exchanging them again
    const response = await fetch(
      `${GRAPH_API_BASE}/oauth/access_token?${new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: clientId,
        client_secret: clientSecret,
        fb_exchange_token: refreshToken,
      })}`
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
    };

    return {
      accessToken: data.access_token,
      scopes: FACEBOOK_SCOPES,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async getUserProfile(accessToken: string): Promise<PlatformUserProfile> {
    const response = await fetch(
      `${GRAPH_API_BASE}/me?fields=id,name&access_token=${accessToken}`
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch profile: ${error}`);
    }

    const data = (await response.json()) as {
      id: string;
      name: string;
    };

    return {
      platformUserId: data.id,
      username: data.name,
      displayName: data.name,
    };
  }

  /**
   * Get the first Page managed by this user.
   * Returns the page ID and page access token.
   */
  private async getPageInfo(
    userAccessToken: string
  ): Promise<{ pageId: string; pageAccessToken: string } | null> {
    const response = await fetch(
      `${GRAPH_API_BASE}/me/accounts?fields=id,name,access_token&access_token=${userAccessToken}`
    );

    if (!response.ok) return null;

    const data = (await response.json()) as {
      data: Array<{
        id: string;
        name: string;
        access_token: string;
      }>;
    };

    const page = data.data[0];
    if (!page) return null;

    return { pageId: page.id, pageAccessToken: page.access_token };
  }

  async listPosts(
    accessToken: string,
    options?: ListPostsOptions
  ): Promise<ListPostsResult> {
    // Try to get page posts first, fall back to user feed
    const page = await this.getPageInfo(accessToken);
    const endpoint = page
      ? `${GRAPH_API_BASE}/${page.pageId}/posts`
      : `${GRAPH_API_BASE}/me/posts`;
    const token = page ? page.pageAccessToken : accessToken;

    const limit = options?.limit ?? 25;
    const params = new URLSearchParams({
      fields:
        "id,message,full_picture,permalink_url,created_time,shares,reactions.summary(true),comments.summary(true)",
      limit: String(limit),
      access_token: token,
    });

    if (options?.after) {
      params.set("after", options.after);
    }

    const response = await fetch(`${endpoint}?${params}`);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch posts: ${error}`);
    }

    const data = (await response.json()) as {
      data: Array<{
        id: string;
        message?: string;
        full_picture?: string;
        permalink_url?: string;
        created_time?: string;
        shares?: { count: number };
        reactions?: { summary: { total_count: number } };
        comments?: { summary: { total_count: number } };
      }>;
      paging?: {
        cursors?: { after?: string };
        next?: string;
      };
    };

    const posts: PlatformPost[] = data.data.map((item) => ({
      platformPostId: item.id,
      postType: item.full_picture ? "image" as const : "text" as const,
      caption: item.message,
      mediaUrl: item.full_picture,
      permalink: item.permalink_url,
      likeCount: item.reactions?.summary.total_count,
      commentCount: item.comments?.summary.total_count,
      shareCount: item.shares?.count,
      publishedAt: item.created_time
        ? new Date(item.created_time)
        : undefined,
    }));

    return {
      posts,
      nextCursor: data.paging?.cursors?.after,
      hasMore: !!data.paging?.next,
    };
  }

  async getPost(
    accessToken: string,
    platformPostId: string
  ): Promise<PlatformPost | null> {
    const page = await this.getPageInfo(accessToken);
    const token = page ? page.pageAccessToken : accessToken;

    const response = await fetch(
      `${GRAPH_API_BASE}/${platformPostId}?fields=id,message,full_picture,permalink_url,created_time,shares,reactions.summary(true),comments.summary(true)&access_token=${token}`
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      const error = await response.text();
      throw new Error(`Failed to fetch post: ${error}`);
    }

    const item = (await response.json()) as {
      id: string;
      message?: string;
      full_picture?: string;
      permalink_url?: string;
      created_time?: string;
      shares?: { count: number };
      reactions?: { summary: { total_count: number } };
      comments?: { summary: { total_count: number } };
    };

    return {
      platformPostId: item.id,
      postType: item.full_picture ? "image" : "text",
      caption: item.message,
      mediaUrl: item.full_picture,
      permalink: item.permalink_url,
      likeCount: item.reactions?.summary.total_count,
      commentCount: item.comments?.summary.total_count,
      shareCount: item.shares?.count,
      publishedAt: item.created_time
        ? new Date(item.created_time)
        : undefined,
    };
  }
}
