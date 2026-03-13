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
const INSTAGRAM_API_BASE = "https://graph.instagram.com";

const INSTAGRAM_SCOPES = [
  "instagram_basic",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
];

const MEDIA_FIELDS = [
  "id",
  "caption",
  "media_type",
  "media_url",
  "thumbnail_url",
  "permalink",
  "timestamp",
  "like_count",
  "comments_count",
].join(",");

function getConfig() {
  const clientId = process.env.INSTAGRAM_APP_ID;
  const clientSecret = process.env.INSTAGRAM_APP_SECRET;
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/oauth/instagram/callback`;

  if (!clientId || !clientSecret) {
    throw new Error(
      "INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET are required for Instagram integration"
    );
  }

  return { clientId, clientSecret, redirectUri };
}

function mapMediaType(
  mediaType: string
): PlatformPost["postType"] {
  switch (mediaType) {
    case "IMAGE":
      return "image";
    case "VIDEO":
      return "video";
    case "CAROUSEL_ALBUM":
      return "carousel";
    default:
      return "image";
  }
}

export class InstagramAdapter implements PlatformAdapter {
  platform = "instagram";

  getAuthorizationUrl(state: string): string {
    const { clientId, redirectUri } = getConfig();

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: INSTAGRAM_SCOPES.join(","),
      response_type: "code",
      state,
    });

    return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?${params}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokens> {
    const { clientId, clientSecret, redirectUri } = getConfig();

    // Step 1: Exchange code for short-lived token
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

    // Step 2: Exchange short-lived token for long-lived token
    const longLivedResponse = await fetch(
      `${GRAPH_API_BASE}/oauth/access_token?${new URLSearchParams({
        grant_type: "fb_exchange_token",
        client_id: clientId,
        client_secret: clientSecret,
        fb_exchange_token: tokenData.access_token,
      })}`
    );

    if (!longLivedResponse.ok) {
      // If long-lived exchange fails, use short-lived token
      console.warn(
        "[Instagram] Long-lived token exchange failed, using short-lived token"
      );
      return {
        accessToken: tokenData.access_token,
        scopes: INSTAGRAM_SCOPES,
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
      scopes: INSTAGRAM_SCOPES,
      expiresAt: new Date(Date.now() + longLivedData.expires_in * 1000),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    // Instagram long-lived tokens are refreshed via this endpoint
    // (the "refreshToken" here is actually the current long-lived access token)
    const response = await fetch(
      `${INSTAGRAM_API_BASE}/refresh_access_token?${new URLSearchParams({
        grant_type: "ig_refresh_token",
        access_token: refreshToken,
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
      scopes: INSTAGRAM_SCOPES,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async getUserProfile(accessToken: string): Promise<PlatformUserProfile> {
    const response = await fetch(
      `${INSTAGRAM_API_BASE}/me?fields=id,username&access_token=${accessToken}`
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch profile: ${error}`);
    }

    const data = (await response.json()) as {
      id: string;
      username: string;
    };

    return {
      platformUserId: data.id,
      username: data.username,
    };
  }

  async listPosts(
    accessToken: string,
    options?: ListPostsOptions
  ): Promise<ListPostsResult> {
    const limit = options?.limit ?? 25;
    const params = new URLSearchParams({
      fields: MEDIA_FIELDS,
      limit: String(limit),
      access_token: accessToken,
    });

    if (options?.after) {
      params.set("after", options.after);
    }

    const response = await fetch(
      `${INSTAGRAM_API_BASE}/me/media?${params}`
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch posts: ${error}`);
    }

    const data = (await response.json()) as {
      data: Array<{
        id: string;
        caption?: string;
        media_type: string;
        media_url?: string;
        thumbnail_url?: string;
        permalink?: string;
        timestamp?: string;
        like_count?: number;
        comments_count?: number;
      }>;
      paging?: {
        cursors?: { after?: string };
        next?: string;
      };
    };

    const posts: PlatformPost[] = data.data.map((item) => ({
      platformPostId: item.id,
      postType: mapMediaType(item.media_type),
      caption: item.caption,
      mediaUrl: item.media_url,
      thumbnailUrl: item.thumbnail_url,
      permalink: item.permalink,
      likeCount: item.like_count,
      commentCount: item.comments_count,
      publishedAt: item.timestamp ? new Date(item.timestamp) : undefined,
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
    const response = await fetch(
      `${INSTAGRAM_API_BASE}/${platformPostId}?fields=${MEDIA_FIELDS}&access_token=${accessToken}`
    );

    if (!response.ok) {
      if (response.status === 404) return null;
      const error = await response.text();
      throw new Error(`Failed to fetch post: ${error}`);
    }

    const item = (await response.json()) as {
      id: string;
      caption?: string;
      media_type: string;
      media_url?: string;
      thumbnail_url?: string;
      permalink?: string;
      timestamp?: string;
      like_count?: number;
      comments_count?: number;
    };

    return {
      platformPostId: item.id,
      postType: mapMediaType(item.media_type),
      caption: item.caption,
      mediaUrl: item.media_url,
      thumbnailUrl: item.thumbnail_url,
      permalink: item.permalink,
      likeCount: item.like_count,
      commentCount: item.comments_count,
      publishedAt: item.timestamp ? new Date(item.timestamp) : undefined,
    };
  }
}
