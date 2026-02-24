import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAdTools } from "./ad-tools";

type AdToolWithExecute = { execute: (input: unknown) => Promise<unknown> };
function getExecute(tools: ReturnType<typeof createAdTools>, name: keyof ReturnType<typeof createAdTools>) {
  return (tools[name] as unknown as AdToolWithExecute).execute;
}

const mockCreateAdArtifact = vi.fn();
const mockUpdateAdArtifactContent = vi.fn();
const mockAttachAdArtifactToIssue = vi.fn();
const mockGetWorkspaceBrand = vi.fn();
const mockMergeWorkspaceBrandIntoContent = vi.fn();

vi.mock("@/lib/actions/ad-artifacts", () => ({
  createAdArtifact: (...args: unknown[]) => mockCreateAdArtifact(...args),
  updateAdArtifactContent: (...args: unknown[]) => mockUpdateAdArtifactContent(...args),
  attachAdArtifactToIssue: (...args: unknown[]) => mockAttachAdArtifactToIssue(...args),
}));

vi.mock("@/lib/actions/brand", () => ({
  getWorkspaceBrand: (...args: unknown[]) => mockGetWorkspaceBrand(...args),
}));

vi.mock("@/lib/ads/merge-workspace-brand", () => ({
  mergeWorkspaceBrandIntoContent: (content: unknown) => mockMergeWorkspaceBrandIntoContent(content),
}));

describe("createAdTools", () => {
  const baseContext = { workspaceId: "workspace-1" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetWorkspaceBrand.mockResolvedValue(null);
    mockCreateAdArtifact.mockResolvedValue({
      id: "artifact-1",
      name: "Test Ad",
      platform: "instagram",
      templateType: "feed-post",
    });
  });

  it("returns all ad tool names", () => {
    const tools = createAdTools(baseContext);
    expect(Object.keys(tools)).toEqual([
      "create_ad_instagram_feed_post",
      "create_ad_instagram_carousel",
      "create_ad_instagram_story",
      "create_ad_instagram_reel",
      "create_ad_tiktok_story",
      "create_ad_tiktok_cta",
      "create_ad_linkedin_single_image",
      "create_ad_linkedin_carousel",
      "create_ad_google_search_ad",
      "create_ad_facebook_in_stream_video",
    ]);
  });

  describe("tool execute - create path", () => {
    it("creates artifact and returns success", async () => {
      const tools = createAdTools(baseContext);
      const result = await getExecute(tools, "create_ad_instagram_feed_post")({
        name: "My Ad",
        type: "ad-template:instagram-feed-post",
        content: { headline: "Test" },
      });

      expect(result).toEqual({
        success: true,
        artifactId: "artifact-1",
        attachmentId: undefined,
        name: "My Ad",
        platform: "instagram",
        templateType: "feed-post",
        type: "ad-template:instagram-feed-post",
      });
      expect(mockCreateAdArtifact).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: "workspace-1",
          platform: "instagram",
          templateType: "feed-post",
          name: "My Ad",
        })
      );
    });

    it("merges workspace brand when brand exists", async () => {
      mockGetWorkspaceBrand.mockResolvedValue({
        name: "Acme",
        resolvedLogoUrl: "https://logo",
        websiteUrl: "https://acme.com",
        primaryColor: "#000",
      });
      mockMergeWorkspaceBrandIntoContent.mockImplementation((c: unknown) => c);

      const tools = createAdTools(baseContext);
      await getExecute(tools, "create_ad_instagram_feed_post")({
        name: "Ad",
        type: "ad-template:instagram-feed-post",
        content: {},
      });

      expect(mockMergeWorkspaceBrandIntoContent).toHaveBeenCalled();
    });
  });

  describe("tool execute - update path", () => {
    it("updates existing artifact when existingArtifactId provided", async () => {
      mockUpdateAdArtifactContent.mockResolvedValue({
        id: "artifact-2",
        name: "Updated",
        platform: "instagram",
        templateType: "feed-post",
      });

      const tools = createAdTools(baseContext);
      const result = await getExecute(tools, "create_ad_instagram_feed_post")({
        name: "Updated Ad",
        type: "ad-template:instagram-feed-post",
        content: {},
        existingArtifactId: "artifact-2",
      });

      expect(result).toEqual({
        success: true,
        updated: true,
        artifactId: "artifact-2",
        name: "Updated",
        platform: "instagram",
        templateType: "feed-post",
        type: "ad-template:instagram-feed-post",
      });
      expect(mockUpdateAdArtifactContent).toHaveBeenCalledWith("artifact-2", expect.any(String));
      expect(mockCreateAdArtifact).not.toHaveBeenCalled();
    });

    it("returns error when update returns null", async () => {
      mockUpdateAdArtifactContent.mockResolvedValue(null);

      const tools = createAdTools(baseContext);
      const result = await getExecute(tools, "create_ad_instagram_feed_post")({
        name: "Ad",
        type: "ad-template:instagram-feed-post",
        content: {},
        existingArtifactId: "missing-id",
      });

      expect(result).toEqual({ success: false, error: "Artifact not found or update failed" });
    });
  });

  describe("tool execute - maxUses limit", () => {
    it("returns error after MAX_AD_TOOL_USES (5) invocations per request", async () => {
      const tools = createAdTools(baseContext);
      const execute = getExecute(tools, "create_ad_instagram_feed_post");
      const input = { name: "Ad", type: "ad-template:instagram-feed-post", content: {} };

      for (let i = 0; i < 5; i++) {
        const result = await execute(input);
        expect(result).toMatchObject({ success: true });
      }

      const sixth = await execute(input);
      expect(sixth).toEqual({
        success: false,
        error: "Ad tool use limit reached (5 per message). Send a new message to create more ads.",
      });
      expect(mockCreateAdArtifact).toHaveBeenCalledTimes(5);
    });

    it("shares usage counter across different ad tools", async () => {
      const tools = createAdTools(baseContext);
      const feedExecute = getExecute(tools, "create_ad_instagram_feed_post");
      const carouselExecute = getExecute(tools, "create_ad_instagram_carousel");

      for (let i = 0; i < 3; i++) {
        await feedExecute({ name: "A", type: "ad-template:instagram-feed-post", content: {} });
      }
      for (let i = 0; i < 2; i++) {
        await carouselExecute({ name: "B", type: "ad-template:instagram-carousel", content: {} });
      }
      const sixth = await feedExecute({ name: "C", type: "ad-template:instagram-feed-post", content: {} });

      expect(sixth).toMatchObject({ success: false, error: expect.stringContaining("limit reached") });
    });
  });

  describe("tool execute - error handling", () => {
    it("returns error when createAdArtifact throws", async () => {
      mockCreateAdArtifact.mockRejectedValue(new Error("DB error"));

      const tools = createAdTools(baseContext);
      const result = await getExecute(tools, "create_ad_instagram_feed_post")({
        name: "Ad",
        type: "ad-template:instagram-feed-post",
        content: {},
      });

      expect(result).toEqual({ success: false, error: "DB error" });
    });

    it("returns generic error for non-Error throw", async () => {
      mockCreateAdArtifact.mockRejectedValue("string error");

      const tools = createAdTools(baseContext);
      const result = await getExecute(tools, "create_ad_instagram_feed_post")({
        name: "Ad",
        type: "ad-template:instagram-feed-post",
        content: {},
      });

      expect(result).toEqual({ success: false, error: "Unknown error creating ad artifact" });
    });
  });

  describe("tool execute - auto-attach to issue", () => {
    it("calls attachAdArtifactToIssue when issueId in context", async () => {
      mockAttachAdArtifactToIssue.mockResolvedValue({ success: true, attachmentId: "att-1" });

      const tools = createAdTools({ ...baseContext, issueId: "issue-1" });
      const result = await getExecute(tools, "create_ad_instagram_feed_post")({
        name: "Ad",
        type: "ad-template:instagram-feed-post",
        content: {},
      });

      expect(result).toMatchObject({ success: true, attachmentId: "att-1" });
      expect(mockAttachAdArtifactToIssue).toHaveBeenCalledWith("artifact-1", "issue-1");
    });
  });
});
