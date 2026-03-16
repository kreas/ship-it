import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

const mockSealData = vi.fn().mockResolvedValue("sealed-state");
vi.mock("iron-session", () => ({
  sealData: (...args: unknown[]) => mockSealData(...args),
}));

const mockRequireWorkspaceAccess = vi.fn();
vi.mock("@/lib/actions/workspace", () => ({
  requireWorkspaceAccess: (...args: unknown[]) =>
    mockRequireWorkspaceAccess(...args),
}));

vi.mock("@/lib/social/adapters", () => ({
  getPlatformAdapter: () => ({
    getAuthorizationUrl: (state: string) =>
      `https://provider.example.com/auth?state=${state}`,
  }),
  getSupportedPlatforms: () => ["instagram", "facebook", "tiktok", "x", "linkedin"],
}));

vi.mock("@/lib/social/pkce", () => ({
  generatePkce: () => ({
    codeVerifier: "verifier",
    codeChallenge: "challenge",
    codeChallengeMethod: "S256" as const,
  }),
}));

const { GET } = await import("./route");

function createRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3000/api/oauth/instagram");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new Request(url.toString());
}

describe("OAuth init route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SOCIAL_TOKEN_ENCRYPTION_SECRET = "test-secret-at-least-32-chars-long!!";
    mockRequireWorkspaceAccess.mockResolvedValue({
      user: { id: "user-1" },
      member: { role: "member" },
      workspace: { id: "ws-1" },
    });
  });

  describe("returnUrl validation", () => {
    it("allows valid /w/ prefixed returnUrl", async () => {
      const req = createRequest({
        workspaceId: "ws-1",
        returnUrl: "/w/my-workspace/settings/social",
      });

      await expect(
        GET(req, { params: Promise.resolve({ platform: "instagram" }) })
      ).rejects.toThrow("NEXT_REDIRECT");

      const sealCall = mockSealData.mock.calls[0][0];
      expect(sealCall.returnUrl).toBe("/w/my-workspace/settings/social");
    });

    it("rejects absolute URLs and falls back to /", async () => {
      const req = createRequest({
        workspaceId: "ws-1",
        returnUrl: "https://evil.com/steal",
      });

      await expect(
        GET(req, { params: Promise.resolve({ platform: "instagram" }) })
      ).rejects.toThrow("NEXT_REDIRECT");

      const sealCall = mockSealData.mock.calls[0][0];
      expect(sealCall.returnUrl).toBe("/");
    });

    it("rejects protocol-relative URLs and falls back to /", async () => {
      const req = createRequest({
        workspaceId: "ws-1",
        returnUrl: "//evil.com/steal",
      });

      await expect(
        GET(req, { params: Promise.resolve({ platform: "instagram" }) })
      ).rejects.toThrow("NEXT_REDIRECT");

      const sealCall = mockSealData.mock.calls[0][0];
      expect(sealCall.returnUrl).toBe("/");
    });

    it("rejects paths not starting with /w/", async () => {
      const req = createRequest({
        workspaceId: "ws-1",
        returnUrl: "/some/other/path",
      });

      await expect(
        GET(req, { params: Promise.resolve({ platform: "instagram" }) })
      ).rejects.toThrow("NEXT_REDIRECT");

      const sealCall = mockSealData.mock.calls[0][0];
      expect(sealCall.returnUrl).toBe("/");
    });

    it("defaults to / when returnUrl is not provided", async () => {
      const req = createRequest({ workspaceId: "ws-1" });

      await expect(
        GET(req, { params: Promise.resolve({ platform: "instagram" }) })
      ).rejects.toThrow("NEXT_REDIRECT");

      const sealCall = mockSealData.mock.calls[0][0];
      expect(sealCall.returnUrl).toBe("/");
    });
  });

  describe("validation", () => {
    it("returns 400 for unsupported platform", async () => {
      const req = createRequest({ workspaceId: "ws-1" });

      const res = await GET(req, {
        params: Promise.resolve({ platform: "myspace" }),
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 when workspaceId is missing", async () => {
      const req = createRequest({});

      const res = await GET(req, {
        params: Promise.resolve({ platform: "instagram" }),
      });

      expect(res.status).toBe(400);
    });
  });
});
