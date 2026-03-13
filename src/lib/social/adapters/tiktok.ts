import type {
  PlatformAdapter,
  OAuthTokens,
  PlatformUserProfile,
  PlatformPost,
  ListPostsOptions,
  ListPostsResult,
  PkceOptions,
} from "./types";

const TIKTOK_AUTH_BASE = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

const TIKTOK_SCOPES = ["user.info.basic", "video.list"];

function getConfig() {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/oauth/tiktok/callback`;

  if (!clientKey || !clientSecret) {
    throw new Error(
      "TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET are required for TikTok integration"
    );
  }

  return { clientKey, clientSecret, redirectUri };
}

export class TikTokAdapter implements PlatformAdapter {
  platform = "tiktok";

  /**
   * TikTok requires PKCE: code_challenge and code_challenge_method on the
   * authorize URL, and code_verifier when exchanging the code. The OAuth
   * route generates PKCE, stores code_verifier in sealed state, and passes
   * pkce here so we can add code_challenge to the URL.
   */
  getAuthorizationUrl(state: string, pkce?: PkceOptions): string {
    const { clientKey, redirectUri } = getConfig();

    const params = new URLSearchParams({
      client_key: clientKey,
      redirect_uri: redirectUri,
      scope: TIKTOK_SCOPES.join(","),
      response_type: "code",
      state,
    });

    if (pkce) {
      params.set("code_challenge", pkce.codeChallenge);
      params.set("code_challenge_method", pkce.codeChallengeMethod);
    }

    return `${TIKTOK_AUTH_BASE}?${params}`;
  }

  async exchangeCode(code: string, codeVerifier?: string): Promise<OAuthTokens> {
    const { clientKey, clientSecret, redirectUri } = getConfig();

    const body = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });
    if (codeVerifier) {
      body.set("code_verifier", codeVerifier);
    }

    const response = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code: ${error}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      open_id: string;
      scope: string;
      token_type: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      scopes: data.scope ? data.scope.split(",") : TIKTOK_SCOPES,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const { clientKey, clientSecret } = getConfig();

    const response = await fetch(`${TIKTOK_API_BASE}/oauth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
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
      open_id: string;
      scope: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      scopes: data.scope ? data.scope.split(",") : TIKTOK_SCOPES,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async getUserProfile(accessToken: string): Promise<PlatformUserProfile> {
    const response = await fetch(`${TIKTOK_API_BASE}/user/info/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: ["open_id", "display_name", "avatar_url", "username"],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch profile: ${error}`);
    }

    const result = (await response.json()) as {
      data: {
        user: {
          open_id: string;
          display_name: string;
          avatar_url?: string;
          username?: string;
        };
      };
      error: { code: string; message: string };
    };

    if (result.error?.code !== "ok" && result.error?.code) {
      throw new Error(`TikTok API error: ${result.error.message}`);
    }

    const user = result.data.user;

    return {
      platformUserId: user.open_id,
      username: user.username || user.display_name,
      displayName: user.display_name,
      profilePictureUrl: user.avatar_url,
    };
  }

  async listPosts(
    accessToken: string,
    options?: ListPostsOptions
  ): Promise<ListPostsResult> {
    const limit = options?.limit ?? 20;

    const body: Record<string, unknown> = {
      max_count: Math.min(limit, 20), // TikTok max is 20 per request
    };

    if (options?.after) {
      body.cursor = parseInt(options.after, 10);
    }

    const response = await fetch(`${TIKTOK_API_BASE}/video/list/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch videos: ${error}`);
    }

    const result = (await response.json()) as {
      data: {
        videos: Array<{
          id: string;
          title?: string;
          cover_image_url?: string;
          share_url?: string;
          like_count?: number;
          comment_count?: number;
          share_count?: number;
          view_count?: number;
          create_time?: number;
        }>;
        cursor?: number;
        has_more?: boolean;
      };
      error: { code: string; message: string };
    };

    if (result.error?.code !== "ok" && result.error?.code) {
      throw new Error(`TikTok API error: ${result.error.message}`);
    }

    const videos = result.data.videos || [];

    const posts: PlatformPost[] = videos.map((video) => ({
      platformPostId: video.id,
      postType: "video" as const,
      caption: video.title,
      thumbnailUrl: video.cover_image_url,
      permalink: video.share_url,
      likeCount: video.like_count,
      commentCount: video.comment_count,
      shareCount: video.share_count,
      viewCount: video.view_count,
      publishedAt: video.create_time
        ? new Date(video.create_time * 1000)
        : undefined,
    }));

    return {
      posts,
      nextCursor: result.data.cursor?.toString(),
      hasMore: result.data.has_more ?? false,
    };
  }

  async getPost(
    accessToken: string,
    platformPostId: string
  ): Promise<PlatformPost | null> {
    const response = await fetch(`${TIKTOK_API_BASE}/video/query/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filters: {
          video_ids: [platformPostId],
        },
        fields: [
          "id",
          "title",
          "cover_image_url",
          "share_url",
          "like_count",
          "comment_count",
          "share_count",
          "view_count",
          "create_time",
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      const error = await response.text();
      throw new Error(`Failed to fetch video: ${error}`);
    }

    const result = (await response.json()) as {
      data: {
        videos: Array<{
          id: string;
          title?: string;
          cover_image_url?: string;
          share_url?: string;
          like_count?: number;
          comment_count?: number;
          share_count?: number;
          view_count?: number;
          create_time?: number;
        }>;
      };
      error: { code: string; message: string };
    };

    const video = result.data.videos?.[0];
    if (!video) return null;

    return {
      platformPostId: video.id,
      postType: "video",
      caption: video.title,
      thumbnailUrl: video.cover_image_url,
      permalink: video.share_url,
      likeCount: video.like_count,
      commentCount: video.comment_count,
      shareCount: video.share_count,
      viewCount: video.view_count,
      publishedAt: video.create_time
        ? new Date(video.create_time * 1000)
        : undefined,
    };
  }
}
