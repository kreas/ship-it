export interface OAuthConfig {
  authorizationUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  redirectUri: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes: string[];
}

export interface PlatformUserProfile {
  platformUserId: string;
  username: string;
  displayName?: string;
  profilePictureUrl?: string;
}

export interface PlatformPost {
  platformPostId: string;
  postType: "image" | "video" | "carousel" | "reel" | "story" | "text";
  caption?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  permalink?: string;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  viewCount?: number;
  publishedAt?: Date;
}

export interface ListPostsOptions {
  limit?: number;
  after?: string; // Cursor for pagination
}

export interface ListPostsResult {
  posts: PlatformPost[];
  nextCursor?: string;
  hasMore: boolean;
}

/** Optional PKCE params for platforms that require code_challenge on the authorize URL */
export interface PkceOptions {
  codeChallenge: string;
  codeChallengeMethod: "S256";
}

export interface PlatformAdapter {
  platform: string;

  /** Build the OAuth authorization URL the user is redirected to */
  getAuthorizationUrl(state: string, pkce?: PkceOptions): string;

  /** Exchange the OAuth code for tokens (codeVerifier required when PKCE was used) */
  exchangeCode(code: string, codeVerifier?: string): Promise<OAuthTokens>;

  /** Refresh an expired access token */
  refreshAccessToken(refreshToken: string): Promise<OAuthTokens>;

  /** Get the authenticated user's profile */
  getUserProfile(accessToken: string): Promise<PlatformUserProfile>;

  /** List recent posts */
  listPosts(
    accessToken: string,
    options?: ListPostsOptions
  ): Promise<ListPostsResult>;

  /** Get a single post by platform ID */
  getPost(
    accessToken: string,
    platformPostId: string
  ): Promise<PlatformPost | null>;
}
