import { describe, it, expect, vi, beforeEach } from "vitest";
import { SUPPORTED_PLATFORMS, PLATFORM_CONFIG } from "@/lib/social/constants";

// Mock social-accounts actions
const mockGetWorkspaceSocialAccount = vi.fn();
const mockEnsureValidToken = vi.fn();

vi.mock("@/lib/actions/social-accounts", () => ({
  getWorkspaceSocialAccount: (...args: unknown[]) =>
    mockGetWorkspaceSocialAccount(...args),
  ensureValidToken: (...args: unknown[]) => mockEnsureValidToken(...args),
}));

// Mock platform adapters
const mockGetUserProfile = vi.fn();
const mockListPosts = vi.fn();
const mockGetPost = vi.fn();

vi.mock("@/lib/social/adapters", () => ({
  getPlatformAdapter: () => ({
    getUserProfile: mockGetUserProfile,
    listPosts: mockListPosts,
    getPost: mockGetPost,
  }),
}));

// Import after mocks are set up
const { createSocialTools } = await import("./social-tools");

const WORKSPACE_ID = "ws-123";

function createMockAccount(platform: string) {
  return {
    id: `account-${platform}`,
    workspaceId: WORKSPACE_ID,
    userId: "user-1",
    platform,
    platformUserId: `${platform}-user-id`,
    platformUsername: `${platform}_user`,
    accessTokenSealed: "sealed-token",
    refreshTokenSealed: null,
    tokenExpiresAt: new Date(Date.now() + 3600000),
    scopes: JSON.stringify(["read"]),
    connectionStatus: "connected",
    lastRefreshedAt: new Date(),
    lastError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("createSocialTools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("tool registration", () => {
    it("registers discovery tools for all supported platforms", () => {
      const tools = createSocialTools({ workspaceId: WORKSPACE_ID });

      for (const platform of SUPPORTED_PLATFORMS) {
        expect(tools[platform]).toBeDefined();
      }
    });

    it("registers get_profile, list_posts, and get_post for each platform", () => {
      const tools = createSocialTools({ workspaceId: WORKSPACE_ID });

      for (const platform of SUPPORTED_PLATFORMS) {
        expect(tools[`${platform}_get_profile`]).toBeDefined();
        expect(tools[`${platform}_list_posts`]).toBeDefined();
        expect(tools[`${platform}_get_post`]).toBeDefined();
      }
    });

    it("registers exactly the tools listed in PLATFORM_CONFIG.executionTools", () => {
      const tools = createSocialTools({ workspaceId: WORKSPACE_ID });

      for (const platform of SUPPORTED_PLATFORMS) {
        const config = PLATFORM_CONFIG[platform];
        for (const toolName of config.executionTools) {
          expect(tools[toolName]).toBeDefined();
        }
      }
    });

    it("total tool count matches 4 per platform (1 discovery + 3 execution)", () => {
      const tools = createSocialTools({ workspaceId: WORKSPACE_ID });
      const expectedCount = SUPPORTED_PLATFORMS.length * 4;
      expect(Object.keys(tools).length).toBe(expectedCount);
    });
  });

  describe("discovery tool", () => {
    it("returns not_connected when no account exists", async () => {
      mockGetWorkspaceSocialAccount.mockResolvedValue(null);

      const tools = createSocialTools({ workspaceId: WORKSPACE_ID });
      const result = await tools.instagram.execute({}, { toolCallId: "test", messages: [], abortSignal: new AbortController().signal });

      expect(result).toMatchObject({
        platform: "instagram",
        connection_status: "not_connected",
        token_status: "missing",
        available_actions: [],
        ui_actions: [{ type: "connect_platform", platform: "instagram" }],
      });
      expect(result.blocked_actions.length).toBeGreaterThan(0);
    });

    it("returns expired when token refresh fails", async () => {
      mockGetWorkspaceSocialAccount.mockResolvedValue(
        createMockAccount("instagram")
      );
      mockEnsureValidToken.mockResolvedValue(null);

      const tools = createSocialTools({ workspaceId: WORKSPACE_ID });
      const result = await tools.instagram.execute({}, { toolCallId: "test", messages: [], abortSignal: new AbortController().signal });

      expect(result).toMatchObject({
        platform: "instagram",
        connection_status: "expired",
        token_status: "expired",
        ui_actions: [{ type: "reconnect_platform", platform: "instagram" }],
      });
    });

    it("returns connected with available actions when token is valid", async () => {
      mockGetWorkspaceSocialAccount.mockResolvedValue(
        createMockAccount("instagram")
      );
      mockEnsureValidToken.mockResolvedValue("valid-access-token");

      const tools = createSocialTools({ workspaceId: WORKSPACE_ID });
      const result = await tools.instagram.execute({}, { toolCallId: "test", messages: [], abortSignal: new AbortController().signal });

      expect(result).toMatchObject({
        platform: "instagram",
        connection_status: "connected",
        token_status: "valid",
        username: "instagram_user",
        blocked_actions: [],
        ui_actions: [],
      });
      expect(result.available_actions.length).toBeGreaterThan(0);
    });
  });

  describe("execution tools — validation", () => {
    it("returns error with connect UI action when account not connected", async () => {
      mockGetWorkspaceSocialAccount.mockResolvedValue(null);

      const tools = createSocialTools({ workspaceId: WORKSPACE_ID });
      const result = await tools.instagram_get_profile.execute(
        {},
        { toolCallId: "test", messages: [], abortSignal: new AbortController().signal }
      );

      expect(result).toMatchObject({
        success: false,
        ui_actions: [{ type: "connect_platform", platform: "instagram" }],
      });
      expect(result.error).toContain("not connected");
    });

    it("returns error with reconnect UI action when token expired", async () => {
      mockGetWorkspaceSocialAccount.mockResolvedValue(
        createMockAccount("instagram")
      );
      mockEnsureValidToken.mockResolvedValue(null);

      const tools = createSocialTools({ workspaceId: WORKSPACE_ID });
      const result = await tools.instagram_list_posts.execute(
        {},
        { toolCallId: "test", messages: [], abortSignal: new AbortController().signal }
      );

      expect(result).toMatchObject({
        success: false,
        ui_actions: [{ type: "reconnect_platform", platform: "instagram" }],
      });
      expect(result.error).toContain("expired");
    });
  });

  describe("execution tools — get_profile", () => {
    it("returns profile data on success", async () => {
      mockGetWorkspaceSocialAccount.mockResolvedValue(
        createMockAccount("instagram")
      );
      mockEnsureValidToken.mockResolvedValue("valid-token");
      mockGetUserProfile.mockResolvedValue({
        platformUserId: "ig-123",
        username: "testuser",
        displayName: "Test User",
      });

      const tools = createSocialTools({ workspaceId: WORKSPACE_ID });
      const result = await tools.instagram_get_profile.execute(
        {},
        { toolCallId: "test", messages: [], abortSignal: new AbortController().signal }
      );

      expect(result).toMatchObject({
        success: true,
        profile: { username: "testuser" },
      });
      expect(mockGetUserProfile).toHaveBeenCalledWith("valid-token");
    });
  });

  describe("execution tools — list_posts", () => {
    it("returns posts with pagination info", async () => {
      mockGetWorkspaceSocialAccount.mockResolvedValue(
        createMockAccount("facebook")
      );
      mockEnsureValidToken.mockResolvedValue("valid-token");
      mockListPosts.mockResolvedValue({
        posts: [{ id: "post-1", caption: "Hello" }],
        hasMore: false,
        nextCursor: null,
      });

      const tools = createSocialTools({ workspaceId: WORKSPACE_ID });
      const result = await tools.facebook_list_posts.execute(
        { limit: 5 },
        { toolCallId: "test", messages: [], abortSignal: new AbortController().signal }
      );

      expect(result).toMatchObject({
        success: true,
        count: 1,
        hasMore: false,
      });
      expect(mockListPosts).toHaveBeenCalledWith("valid-token", {
        limit: 5,
        after: undefined,
      });
    });
  });

  describe("execution tools — get_post", () => {
    it("returns post data on success", async () => {
      mockGetWorkspaceSocialAccount.mockResolvedValue(
        createMockAccount("x")
      );
      mockEnsureValidToken.mockResolvedValue("valid-token");
      mockGetPost.mockResolvedValue({ id: "tweet-1", caption: "Hello X" });

      const tools = createSocialTools({ workspaceId: WORKSPACE_ID });
      const result = await tools.x_get_post.execute(
        { postId: "tweet-1" },
        { toolCallId: "test", messages: [], abortSignal: new AbortController().signal }
      );

      expect(result).toMatchObject({ success: true, post: { id: "tweet-1" } });
    });

    it("returns error when post not found", async () => {
      mockGetWorkspaceSocialAccount.mockResolvedValue(
        createMockAccount("x")
      );
      mockEnsureValidToken.mockResolvedValue("valid-token");
      mockGetPost.mockResolvedValue(null);

      const tools = createSocialTools({ workspaceId: WORKSPACE_ID });
      const result = await tools.x_get_post.execute(
        { postId: "nonexistent" },
        { toolCallId: "test", messages: [], abortSignal: new AbortController().signal }
      );

      expect(result).toMatchObject({
        success: false,
        error: "Post not found",
      });
    });
  });

  describe("execution tools — error handling", () => {
    it("catches adapter errors and returns structured error", async () => {
      mockGetWorkspaceSocialAccount.mockResolvedValue(
        createMockAccount("tiktok")
      );
      mockEnsureValidToken.mockResolvedValue("valid-token");
      mockGetUserProfile.mockRejectedValue(new Error("API rate limited"));

      const tools = createSocialTools({ workspaceId: WORKSPACE_ID });
      const result = await tools.tiktok_get_profile.execute(
        {},
        { toolCallId: "test", messages: [], abortSignal: new AbortController().signal }
      );

      expect(result).toMatchObject({
        success: false,
        error: "API rate limited",
      });
    });
  });
});
