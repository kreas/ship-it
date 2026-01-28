import { describe, it, expect } from "vitest";
import { exportSoulAsMarkdown, createDefaultSoul } from "./soul-utils";
import type { WorkspaceSoul } from "./types";

function createTestSoul(overrides: Partial<WorkspaceSoul> = {}): WorkspaceSoul {
  const now = new Date().toISOString();
  return {
    name: "Luna",
    personality: "A helpful and friendly AI assistant.",
    primaryGoals: ["Help users complete tasks", "Provide accurate information"],
    tone: "friendly",
    responseLength: "moderate",
    domainExpertise: ["Software Development", "Project Management"],
    terminology: { Sprint: "A 2-week development cycle" },
    doRules: ["Be concise", "Ask clarifying questions"],
    dontRules: ["Provide medical advice", "Share personal opinions"],
    greeting: "Hello! How can I help you today?",
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("exportSoulAsMarkdown", () => {
  it("exports a fully configured soul with all fields", () => {
    const soul = createTestSoul();
    const markdown = exportSoulAsMarkdown(soul);

    // Check header
    expect(markdown).toContain("# Luna");

    // Check personality
    expect(markdown).toContain("## Personality");
    expect(markdown).toContain("A helpful and friendly AI assistant.");

    // Check communication style
    expect(markdown).toContain("## Communication Style");
    expect(markdown).toContain("- **Tone:** friendly");
    expect(markdown).toContain("- **Response Length:** moderate");

    // Check goals
    expect(markdown).toContain("## Primary Goals");
    expect(markdown).toContain("- Help users complete tasks");
    expect(markdown).toContain("- Provide accurate information");

    // Check expertise
    expect(markdown).toContain("## Domain Expertise");
    expect(markdown).toContain("- Software Development");
    expect(markdown).toContain("- Project Management");

    // Check do rules
    expect(markdown).toContain("## Do's (Things to Always Do)");
    expect(markdown).toContain("- Be concise");
    expect(markdown).toContain("- Ask clarifying questions");

    // Check don't rules
    expect(markdown).toContain("## Don'ts (Things to Avoid)");
    expect(markdown).toContain("- Provide medical advice");
    expect(markdown).toContain("- Share personal opinions");

    // Check terminology
    expect(markdown).toContain("## Terminology");
    expect(markdown).toContain("- **Sprint:** A 2-week development cycle");

    // Check greeting
    expect(markdown).toContain("## Custom Greeting");
    expect(markdown).toContain("Hello! How can I help you today?");
  });

  it("uses default name when name is empty", () => {
    const soul = createTestSoul({ name: "" });
    const markdown = exportSoulAsMarkdown(soul);

    expect(markdown).toContain("# AI Assistant");
  });

  it("omits empty sections", () => {
    const soul = createTestSoul({
      personality: "",
      primaryGoals: [],
      domainExpertise: [],
      doRules: [],
      dontRules: [],
      terminology: {},
      greeting: undefined,
    });
    const markdown = exportSoulAsMarkdown(soul);

    // Should NOT contain empty sections
    expect(markdown).not.toContain("## Personality");
    expect(markdown).not.toContain("## Primary Goals");
    expect(markdown).not.toContain("## Domain Expertise");
    expect(markdown).not.toContain("## Do's (Things to Always Do)");
    expect(markdown).not.toContain("## Don'ts (Things to Avoid)");
    expect(markdown).not.toContain("## Terminology");
    expect(markdown).not.toContain("## Custom Greeting");

    // Should still contain the required sections
    expect(markdown).toContain("# Luna");
    expect(markdown).toContain("## Communication Style");
  });

  it("handles minimal soul configuration", () => {
    const soul = createTestSoul({
      name: "Bot",
      personality: "",
      primaryGoals: [],
      domainExpertise: [],
      doRules: [],
      dontRules: [],
      terminology: {},
      greeting: undefined,
    });
    const markdown = exportSoulAsMarkdown(soul);

    // Should only have name and communication style
    const lines = markdown.split("\n").filter((l) => l.trim());
    expect(lines.length).toBeGreaterThanOrEqual(3); // header, style header, tone, response length
    expect(markdown).toContain("# Bot");
    expect(markdown).toContain("## Communication Style");
  });

  it("exports different tone and response length values", () => {
    const soul = createTestSoul({
      tone: "professional",
      responseLength: "detailed",
    });
    const markdown = exportSoulAsMarkdown(soul);

    expect(markdown).toContain("- **Tone:** professional");
    expect(markdown).toContain("- **Response Length:** detailed");
  });

  it("handles multiple terminology entries", () => {
    const soul = createTestSoul({
      terminology: {
        Sprint: "A 2-week cycle",
        Backlog: "List of work items",
        Standup: "Daily sync meeting",
      },
    });
    const markdown = exportSoulAsMarkdown(soul);

    expect(markdown).toContain("- **Sprint:** A 2-week cycle");
    expect(markdown).toContain("- **Backlog:** List of work items");
    expect(markdown).toContain("- **Standup:** Daily sync meeting");
  });
});

describe("createDefaultSoul", () => {
  it("creates a soul with empty values", () => {
    const soul = createDefaultSoul();

    expect(soul.name).toBe("");
    expect(soul.personality).toBe("");
    expect(soul.primaryGoals).toEqual([]);
    expect(soul.domainExpertise).toEqual([]);
    expect(soul.terminology).toEqual({});
    expect(soul.doRules).toEqual([]);
    expect(soul.dontRules).toEqual([]);
    expect(soul.greeting).toBeUndefined();
  });

  it("sets default tone and response length", () => {
    const soul = createDefaultSoul();

    expect(soul.tone).toBe("friendly");
    expect(soul.responseLength).toBe("moderate");
  });

  it("sets version to 1", () => {
    const soul = createDefaultSoul();

    expect(soul.version).toBe(1);
  });

  it("sets createdAt and updatedAt to current time", () => {
    const before = new Date().toISOString();
    const soul = createDefaultSoul();
    const after = new Date().toISOString();

    expect(soul.createdAt).toBeTruthy();
    expect(soul.updatedAt).toBeTruthy();
    expect(soul.createdAt).toBe(soul.updatedAt);
    expect(soul.createdAt >= before).toBe(true);
    expect(soul.createdAt <= after).toBe(true);
  });
});
