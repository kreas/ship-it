import { describe, it, expect } from "vitest";
import { fuzzyMatch, fuzzyMatchProject, fuzzyMatchWeekItem, validateField } from "./operations-utils";

describe("fuzzyMatchProject", () => {
  const projects = [
    { name: "Impact Report Dev" },
    { name: "Impact Report Design" },
    { name: "Website Redesign" },
    { name: "CDS Messaging" },
  ];

  it("exact match wins over substring", () => {
    const result = fuzzyMatchProject(projects, "CDS Messaging");
    expect(result.kind).toBe("match");
    if (result.kind === "match") {
      expect(result.value.name).toBe("CDS Messaging");
    }
  });

  it("exact match is case-insensitive", () => {
    const result = fuzzyMatchProject(projects, "cds messaging");
    expect(result.kind).toBe("match");
    if (result.kind === "match") {
      expect(result.value.name).toBe("CDS Messaging");
    }
  });

  it("starts-with wins over contains when unique", () => {
    const result = fuzzyMatchProject(projects, "Website");
    expect(result.kind).toBe("match");
    if (result.kind === "match") {
      expect(result.value.name).toBe("Website Redesign");
    }
  });

  it("single substring match returns match (not ambiguous)", () => {
    const result = fuzzyMatchProject(projects, "Redesign");
    expect(result.kind).toBe("match");
    if (result.kind === "match") {
      expect(result.value.name).toBe("Website Redesign");
    }
  });

  it("multiple substring matches return ambiguous with options", () => {
    const result = fuzzyMatchProject(projects, "Impact Report");
    expect(result.kind).toBe("ambiguous");
    if (result.kind === "ambiguous") {
      expect(result.options).toHaveLength(2);
      expect(result.options.map((p) => p.name)).toContain("Impact Report Dev");
      expect(result.options.map((p) => p.name)).toContain("Impact Report Design");
    }
  });

  it("no match returns none", () => {
    const result = fuzzyMatchProject(projects, "Nonexistent");
    expect(result.kind).toBe("none");
  });

  it("multiple starts-with matches return ambiguous", () => {
    const result = fuzzyMatchProject(projects, "Impact");
    expect(result.kind).toBe("ambiguous");
    if (result.kind === "ambiguous") {
      expect(result.options).toHaveLength(2);
    }
  });
});

describe("fuzzyMatchWeekItem", () => {
  const items = [
    { title: "CDS Review Meeting" },
    { title: "CDS Delivery" },
    { title: "Widget Launch" },
  ];

  it("exact match wins", () => {
    const result = fuzzyMatchWeekItem(items, "Widget Launch");
    expect(result.kind).toBe("match");
    if (result.kind === "match") {
      expect(result.value.title).toBe("Widget Launch");
    }
  });

  it("ambiguous when multiple CDS items match", () => {
    const result = fuzzyMatchWeekItem(items, "CDS");
    expect(result.kind).toBe("ambiguous");
    if (result.kind === "ambiguous") {
      expect(result.options).toHaveLength(2);
    }
  });

  it("unique substring returns match", () => {
    const result = fuzzyMatchWeekItem(items, "Launch");
    expect(result.kind).toBe("match");
    if (result.kind === "match") {
      expect(result.value.title).toBe("Widget Launch");
    }
  });
});

describe("fuzzyMatch — dash normalization", () => {
  const projects = [
    { name: "Impact Report \u2014 Dev" },
    { name: "Impact Report \u2014 Design" },
    { name: "CDS Messaging" },
  ];

  it("matches em dash name with plain text (no dash)", () => {
    const result = fuzzyMatchProject(projects, "Impact Report Dev");
    expect(result.kind).toBe("match");
    if (result.kind === "match") {
      expect(result.value.name).toBe("Impact Report \u2014 Dev");
    }
  });

  it("matches em dash name with hyphen", () => {
    const result = fuzzyMatchProject(projects, "Impact Report - Dev");
    expect(result.kind).toBe("match");
    if (result.kind === "match") {
      expect(result.value.name).toBe("Impact Report \u2014 Dev");
    }
  });

  it("exact match still works without dashes", () => {
    const result = fuzzyMatchProject(projects, "CDS Messaging");
    expect(result.kind).toBe("match");
    if (result.kind === "match") {
      expect(result.value.name).toBe("CDS Messaging");
    }
  });

  it("matches en dash name with plain text", () => {
    const items = [{ name: "Brand Refresh \u2013 Phase 2" }];
    const result = fuzzyMatchProject(items, "Brand Refresh Phase 2");
    expect(result.kind).toBe("match");
    if (result.kind === "match") {
      expect(result.value.name).toBe("Brand Refresh \u2013 Phase 2");
    }
  });

  it("matches double-hyphen name with plain text", () => {
    const items = [{ name: "CDS -- Final Review" }];
    const result = fuzzyMatchProject(items, "CDS Final Review");
    expect(result.kind).toBe("match");
    if (result.kind === "match") {
      expect(result.value.name).toBe("CDS -- Final Review");
    }
  });

  it("ambiguous cases still return ambiguous after normalization", () => {
    const result = fuzzyMatchProject(projects, "Impact Report");
    expect(result.kind).toBe("ambiguous");
    if (result.kind === "ambiguous") {
      expect(result.options).toHaveLength(2);
    }
  });
});

describe("fuzzyMatch (generic)", () => {
  const items = [
    { label: "Alpha Beta" },
    { label: "Alpha Gamma" },
    { label: "Delta" },
  ];

  it("works with custom getText extractor", () => {
    const result = fuzzyMatch(items, "Delta", (i) => i.label);
    expect(result.kind).toBe("match");
    if (result.kind === "match") {
      expect(result.value.label).toBe("Delta");
    }
  });

  it("returns ambiguous for multiple matches with custom extractor", () => {
    const result = fuzzyMatch(items, "Alpha", (i) => i.label);
    expect(result.kind).toBe("ambiguous");
    if (result.kind === "ambiguous") {
      expect(result.options).toHaveLength(2);
    }
  });

  it("returns none when no match", () => {
    const result = fuzzyMatch(items, "Zeta", (i) => i.label);
    expect(result.kind).toBe("none");
  });
});

describe("validateField", () => {
  const allowed = ["name", "dueDate", "owner"] as const;

  it("returns null for valid field", () => {
    expect(validateField("name", allowed)).toBeNull();
    expect(validateField("dueDate", allowed)).toBeNull();
  });

  it("returns error for invalid field", () => {
    const result = validateField("invalid", allowed);
    expect(result).not.toBeNull();
    expect(result!.ok).toBe(false);
    expect(result!.error).toContain("invalid");
    expect(result!.error).toContain("Allowed fields");
  });
});
