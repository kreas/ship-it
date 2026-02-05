import { describe, it, expect } from "vitest";
import { buildBrandSystemPrompt, type BrandPromptInput } from "./brand-formatters";

// Factory helper for creating test brands
function createBrand(overrides: Partial<BrandPromptInput> = {}): BrandPromptInput {
  return {
    name: "Test Brand",
    tagline: null,
    summary: null,
    websiteUrl: null,
    industry: null,
    ...overrides,
  };
}

describe("buildBrandSystemPrompt", () => {
  it("returns empty string when brand is null", () => {
    const result = buildBrandSystemPrompt(null);
    expect(result).toBe("");
  });

  it("returns empty string when summary is null", () => {
    const brand = createBrand({ summary: null });
    const result = buildBrandSystemPrompt(brand);
    expect(result).toBe("");
  });

  it("returns empty string when summary is empty string", () => {
    const brand = createBrand({ summary: "" });
    const result = buildBrandSystemPrompt(brand);
    expect(result).toBe("");
  });

  it("builds prompt with name and summary", () => {
    const brand = createBrand({
      name: "Acme Corp",
      summary: "A company that makes everything.",
    });

    const result = buildBrandSystemPrompt(brand);

    expect(result).toContain("## Brand Context");
    expect(result).toContain("**Brand:** Acme Corp");
    expect(result).toContain("**About the Brand:**");
    expect(result).toContain("A company that makes everything.");
  });

  it("includes tagline when present", () => {
    const brand = createBrand({
      name: "Acme Corp",
      tagline: "Making everything better",
      summary: "A company that makes everything.",
    });

    const result = buildBrandSystemPrompt(brand);

    expect(result).toContain("**Tagline:** Making everything better");
  });

  it("includes industry when present", () => {
    const brand = createBrand({
      name: "Acme Corp",
      industry: "Technology",
      summary: "A company that makes everything.",
    });

    const result = buildBrandSystemPrompt(brand);

    expect(result).toContain("**Industry:** Technology");
  });

  it("includes website URL when present", () => {
    const brand = createBrand({
      name: "Acme Corp",
      websiteUrl: "https://acme.example.com",
      summary: "A company that makes everything.",
    });

    const result = buildBrandSystemPrompt(brand);

    expect(result).toContain("**Website:** https://acme.example.com");
  });

  it("includes all optional fields when present", () => {
    const brand = createBrand({
      name: "Acme Corp",
      tagline: "Making everything better",
      industry: "Technology",
      websiteUrl: "https://acme.example.com",
      summary: "A company that makes everything.",
    });

    const result = buildBrandSystemPrompt(brand);

    expect(result).toContain("## Brand Context");
    expect(result).toContain("**Brand:** Acme Corp");
    expect(result).toContain("**Tagline:** Making everything better");
    expect(result).toContain("**Industry:** Technology");
    expect(result).toContain("**Website:** https://acme.example.com");
    expect(result).toContain("**About the Brand:**");
    expect(result).toContain("A company that makes everything.");
  });

  it("omits optional fields when not present", () => {
    const brand = createBrand({
      name: "Minimal Brand",
      summary: "Just the basics.",
      tagline: null,
      industry: null,
      websiteUrl: null,
    });

    const result = buildBrandSystemPrompt(brand);

    expect(result).not.toContain("**Tagline:**");
    expect(result).not.toContain("**Industry:**");
    expect(result).not.toContain("**Website:**");
    expect(result).toContain("**Brand:** Minimal Brand");
    expect(result).toContain("Just the basics.");
  });
});
