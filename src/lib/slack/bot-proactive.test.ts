import { describe, it, expect } from "vitest";
import { formatProactiveFollowUp } from "./bot-proactive";
import type { StaleAccountItem } from "@/lib/runway/operations";

function item(overrides: Partial<StaleAccountItem> = {}): StaleAccountItem {
  return {
    clientName: "Convergix",
    projectName: "CDS Messaging",
    staleDays: 10,
    ...overrides,
  };
}

describe("formatProactiveFollowUp", () => {
  it("returns empty string for empty list", () => {
    expect(formatProactiveFollowUp([])).toBe("");
  });

  it("formats a single item", () => {
    const result = formatProactiveFollowUp([item()]);
    expect(result).toContain("Got a minute");
    expect(result).toContain("Convergix: CDS Messaging (10d stale)");
    expect(result).toContain("Any updates on these");
    expect(result).not.toContain("more");
  });

  it("formats 3 items", () => {
    const items = [
      item({ projectName: "Project A", staleDays: 20 }),
      item({ clientName: "LPPC", projectName: "Project B", staleDays: 5 }),
      item({ projectName: "Project C", staleDays: 0 }),
    ];
    const result = formatProactiveFollowUp(items);
    expect(result).toContain("Project A (20d stale)");
    expect(result).toContain("LPPC: Project B (5d stale)");
    expect(result).toContain("Project C");
    // staleDays=0 should not show stale note
    expect(result).not.toContain("(0d stale)");
  });

  it("truncates to 5 items and shows remaining count", () => {
    const items = Array.from({ length: 7 }, (_, i) =>
      item({ projectName: `Project ${i + 1}`, staleDays: 30 - i })
    );
    const result = formatProactiveFollowUp(items);
    expect(result).toContain("Project 1");
    expect(result).toContain("Project 5");
    expect(result).not.toContain("Project 6");
    expect(result).toContain("and 2 more");
  });

  it("excludes projects the user just updated", () => {
    const items = [
      item({ projectName: "CDS Messaging", staleDays: 10 }),
      item({ projectName: "Website", staleDays: 5 }),
    ];
    const result = formatProactiveFollowUp(items, ["CDS Messaging"]);
    expect(result).not.toContain("CDS Messaging");
    expect(result).toContain("Website");
  });

  it("returns empty string when all items are excluded", () => {
    const items = [item({ projectName: "CDS Messaging" })];
    const result = formatProactiveFollowUp(items, ["cds messaging"]);
    expect(result).toBe("");
  });
});
