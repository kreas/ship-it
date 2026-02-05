import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Brand, WorkspaceSoul } from "./types";

// Helper to create mock brands
function createMockBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    id: "brand-1",
    userId: "user-1",
    name: "Test Brand",
    tagline: "Test tagline",
    description: "Test description",
    summary: "A brand summary for testing",
    logoUrl: "https://example.com/logo.png",
    logoStorageKey: null,
    logoBackground: null,
    websiteUrl: "https://example.com",
    primaryColor: "#ff0000",
    secondaryColor: "#00ff00",
    industry: "Technology",
    guidelines: null,
    guidelinesStatus: null,
    guidelinesUpdatedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

// Create chainable mock that properly handles get()
function createDbMock() {
  let getResult: unknown = undefined;

  const chainable = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => ({
      ...chainable,
      get: vi.fn().mockReturnValue(getResult),
    })),
    get: vi.fn().mockImplementation(() => getResult),
    // Helper methods for tests
    _setGetResult: (val: unknown) => { getResult = val; },
    _setGetResultSequence: (vals: unknown[]) => {
      let index = 0;
      chainable.where.mockImplementation(() => ({
        ...chainable,
        get: vi.fn().mockImplementation(() => vals[index++]),
      }));
    },
  };

  return chainable;
}

const mockDb = createDbMock();

vi.mock("./db", () => ({
  db: mockDb,
}));

const mockGetWorkspaceSoul = vi.fn();
vi.mock("./soul-utils", () => ({
  getWorkspaceSoul: (...args: unknown[]) => mockGetWorkspaceSoul(...args),
}));

describe("brand-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb._setGetResult(undefined);
    mockGetWorkspaceSoul.mockResolvedValue(null);
  });

  describe("getWorkspaceBrandForPrompt", () => {
    it("returns null when workspaceId is undefined", async () => {
      const { getWorkspaceBrandForPrompt } = await import("./brand-utils");
      const result = await getWorkspaceBrandForPrompt(undefined);
      expect(result).toBeNull();
    });

    it("returns null when workspace does not exist", async () => {
      mockDb._setGetResultSequence([undefined]);

      const { getWorkspaceBrandForPrompt } = await import("./brand-utils");
      const result = await getWorkspaceBrandForPrompt("workspace-1");

      expect(result).toBeNull();
    });

    it("returns null when workspace has no brandId", async () => {
      mockDb._setGetResultSequence([{ brandId: null }]);

      const { getWorkspaceBrandForPrompt } = await import("./brand-utils");
      const result = await getWorkspaceBrandForPrompt("workspace-1");

      expect(result).toBeNull();
    });

    it("returns null when brand does not exist", async () => {
      mockDb._setGetResultSequence([{ brandId: "brand-1" }, undefined]);

      const { getWorkspaceBrandForPrompt } = await import("./brand-utils");
      const result = await getWorkspaceBrandForPrompt("workspace-1");

      expect(result).toBeNull();
    });

    it("returns brand when workspace has brandId linked", async () => {
      const mockBrand = createMockBrand();
      mockDb._setGetResultSequence([{ brandId: "brand-1" }, mockBrand]);

      const { getWorkspaceBrandForPrompt } = await import("./brand-utils");
      const result = await getWorkspaceBrandForPrompt("workspace-1");

      expect(result).toEqual(mockBrand);
    });
  });

  describe("loadWorkspaceContext", () => {
    it("returns null soul and brand when workspaceId is undefined", async () => {
      const { loadWorkspaceContext } = await import("./brand-utils");
      const result = await loadWorkspaceContext(undefined);

      expect(result.soul).toBeNull();
      expect(result.brand).toBeNull();
    });

    it("loads soul and brand in parallel", async () => {
      const mockSoul: WorkspaceSoul = {
        name: "Test Soul",
        personality: "Helpful",
        primaryGoals: ["Help users"],
        tone: "friendly",
        responseLength: "moderate",
        domainExpertise: [],
        terminology: {},
        doRules: [],
        dontRules: [],
        version: 1,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };
      const mockBrand = createMockBrand();

      mockGetWorkspaceSoul.mockResolvedValue(mockSoul);
      mockDb._setGetResultSequence([{ brandId: "brand-1" }, mockBrand]);

      const { loadWorkspaceContext } = await import("./brand-utils");
      const result = await loadWorkspaceContext("workspace-1");

      expect(result.soul).toEqual(mockSoul);
      expect(result.brand).toEqual(mockBrand);
      expect(mockGetWorkspaceSoul).toHaveBeenCalledWith("workspace-1");
    });

    it("returns null brand when workspace has no brand linked", async () => {
      const mockSoul: WorkspaceSoul = {
        name: "Test Soul",
        personality: "Helpful",
        primaryGoals: ["Help users"],
        tone: "friendly",
        responseLength: "moderate",
        domainExpertise: [],
        terminology: {},
        doRules: [],
        dontRules: [],
        version: 1,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      mockGetWorkspaceSoul.mockResolvedValue(mockSoul);
      mockDb._setGetResultSequence([{ brandId: null }]);

      const { loadWorkspaceContext } = await import("./brand-utils");
      const result = await loadWorkspaceContext("workspace-1");

      expect(result.soul).toEqual(mockSoul);
      expect(result.brand).toBeNull();
    });
  });
});
