import { describe, it, expect, vi, beforeEach } from "vitest";

// Track redirect calls
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

// Mock iron-session
const mockUnsealData = vi.fn();
vi.mock("iron-session", () => ({
  unsealData: (...args: unknown[]) => mockUnsealData(...args),
}));

// Mock adapters
const mockExchangeCode = vi.fn();
const mockGetUserProfile = vi.fn();
vi.mock("@/lib/social/adapters", () => ({
  getPlatformAdapter: () => ({
    exchangeCode: mockExchangeCode,
    getUserProfile: mockGetUserProfile,
  }),
}));

// Mock social account actions
const mockCreateSocialAccount = vi.fn();
const mockGetWorkspaceSocialAccount = vi.fn();
const mockUpdateSocialAccountTokens = vi.fn();
vi.mock("@/lib/actions/social-accounts", () => ({
  createSocialAccount: (...args: unknown[]) =>
    mockCreateSocialAccount(...args),
  getWorkspaceSocialAccount: (...args: unknown[]) =>
    mockGetWorkspaceSocialAccount(...args),
  updateSocialAccountTokens: (...args: unknown[]) =>
    mockUpdateSocialAccountTokens(...args),
}));

// Mock workspace auth
const mockRequireWorkspaceAccess = vi.fn();
vi.mock("@/lib/actions/workspace", () => ({
  requireWorkspaceAccess: (...args: unknown[]) =>
    mockRequireWorkspaceAccess(...args),
}));

const { GET } = await import("./route");

function createRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3000/api/oauth/instagram/callback");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new Request(url.toString());
}

const validState = {
  userId: "user-1",
  workspaceId: "ws-1",
  platform: "instagram",
  returnUrl: "/w/test/settings/social",
};

describe("OAuth callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SOCIAL_TOKEN_ENCRYPTION_SECRET = "test-secret-at-least-32-chars-long!!";
    // Default: authenticated user matches state userId
    mockRequireWorkspaceAccess.mockResolvedValue({
      user: { id: "user-1" },
      member: { role: "member" },
      workspace: { id: "ws-1" },
    });
  });

  describe("error handling", () => {
    it("redirects on OAuth provider error", async () => {
      const req = createRequest({
        error: "access_denied",
        error_description: "User denied access",
      });

      await expect(
        GET(req, { params: Promise.resolve({ platform: "instagram" }) })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(mockRedirect).toHaveBeenCalledWith(
        expect.stringContaining("oauth_error=User%20denied%20access")
      );
    });

    it("redirects when code or state is missing", async () => {
      const req = createRequest({ code: "abc" }); // no state

      await expect(
        GET(req, { params: Promise.resolve({ platform: "instagram" }) })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(mockRedirect).toHaveBeenCalledWith("/?oauth_error=missing_params");
    });

    it("redirects on invalid state", async () => {
      mockUnsealData.mockRejectedValue(new Error("Invalid seal"));

      const req = createRequest({ code: "abc", state: "bad-state" });

      await expect(
        GET(req, { params: Promise.resolve({ platform: "instagram" }) })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(mockRedirect).toHaveBeenCalledWith("/?oauth_error=invalid_state");
    });

    it("redirects on platform mismatch", async () => {
      mockUnsealData.mockResolvedValue({
        ...validState,
        platform: "facebook", // mismatch
      });

      const req = createRequest({ code: "abc", state: "sealed-state" });

      await expect(
        GET(req, { params: Promise.resolve({ platform: "instagram" }) })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(mockRedirect).toHaveBeenCalledWith("/?oauth_error=state_mismatch");
    });
  });

  describe("new account creation", () => {
    it("creates a new social account on first connect", async () => {
      mockUnsealData.mockResolvedValue(validState);
      mockExchangeCode.mockResolvedValue({
        accessToken: "access-123",
        refreshToken: "refresh-123",
        expiresAt: new Date("2025-12-31"),
        scopes: ["user_profile", "user_media"],
      });
      mockGetUserProfile.mockResolvedValue({
        platformUserId: "ig-user-1",
        username: "testuser",
      });
      mockGetWorkspaceSocialAccount.mockResolvedValue(null); // no existing
      mockCreateSocialAccount.mockResolvedValue({ id: "new-account" });

      const req = createRequest({ code: "auth-code", state: "sealed" });

      await expect(
        GET(req, { params: Promise.resolve({ platform: "instagram" }) })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(mockCreateSocialAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: "ws-1",
          userId: "user-1",
          platform: "instagram",
          platformUserId: "ig-user-1",
          platformUsername: "testuser",
          accessToken: "access-123",
        })
      );

      expect(mockRedirect).toHaveBeenCalledWith(
        expect.stringContaining("oauth_success=instagram")
      );
    });
  });

  describe("reconnect (existing account)", () => {
    it("updates tokens for an existing account", async () => {
      mockUnsealData.mockResolvedValue(validState);
      mockExchangeCode.mockResolvedValue({
        accessToken: "new-access",
        refreshToken: "new-refresh",
        expiresAt: new Date("2025-12-31"),
        scopes: ["read"],
      });
      mockGetUserProfile.mockResolvedValue({
        platformUserId: "ig-user-1",
        username: "testuser",
      });
      mockGetWorkspaceSocialAccount.mockResolvedValue({
        id: "existing-account-id",
      });
      mockUpdateSocialAccountTokens.mockResolvedValue(undefined);

      const req = createRequest({ code: "auth-code", state: "sealed" });

      await expect(
        GET(req, { params: Promise.resolve({ platform: "instagram" }) })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(mockUpdateSocialAccountTokens).toHaveBeenCalledWith(
        "existing-account-id",
        expect.objectContaining({
          accessToken: "new-access",
          refreshToken: "new-refresh",
        })
      );
      expect(mockCreateSocialAccount).not.toHaveBeenCalled();
    });
  });

  describe("authorization", () => {
    it("redirects when authenticated user differs from state userId", async () => {
      mockUnsealData.mockResolvedValue(validState); // userId: "user-1"
      mockRequireWorkspaceAccess.mockResolvedValue({
        user: { id: "different-user" }, // mismatch
        member: { role: "member" },
        workspace: { id: "ws-1" },
      });

      const req = createRequest({ code: "abc", state: "sealed" });

      await expect(
        GET(req, { params: Promise.resolve({ platform: "instagram" }) })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(mockRedirect).toHaveBeenCalledWith(
        expect.stringContaining(
          "oauth_error=OAuth+session+was+initiated+by+a+different+user"
        )
      );
    });
  });

  describe("token exchange failure", () => {
    it("redirects with error when token exchange fails", async () => {
      mockUnsealData.mockResolvedValue(validState);
      mockExchangeCode.mockRejectedValue(new Error("Invalid authorization code"));

      const req = createRequest({ code: "bad-code", state: "sealed" });

      await expect(
        GET(req, { params: Promise.resolve({ platform: "instagram" }) })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(mockRedirect).toHaveBeenCalledWith(
        expect.stringContaining("oauth_error=Invalid+authorization+code")
      );
    });
  });
});
