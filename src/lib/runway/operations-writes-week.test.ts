import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock state ──────────────────────────────────────────
const mockInsertValues = vi.fn();
const mockUpdateSet = vi.fn();
const mockUpdateWhere = vi.fn();

vi.mock("@/lib/db/runway", () => ({
  getRunwayDb: () => ({
    insert: vi.fn(() => ({ values: mockInsertValues })),
    update: vi.fn(() => ({
      set: vi.fn((...args: unknown[]) => {
        mockUpdateSet(...args);
        return { where: mockUpdateWhere };
      }),
    })),
  }),
}));

vi.mock("@/lib/db/runway-schema", () => ({
  weekItems: { id: "id" },
  updates: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ eq: [a, b] })),
}));

const mockGetClientBySlug = vi.fn();
const mockFindProjectByFuzzyName = vi.fn();
const mockFindWeekItemByFuzzyTitle = vi.fn();
const mockGetWeekItemsForWeek = vi.fn();
const mockCheckIdempotency = vi.fn();

vi.mock("./operations-utils", () => ({
  generateIdempotencyKey: (...parts: string[]) => parts.join("|"),
  generateId: () => "mock-id-12345678901234",
  getClientOrFail: async (slug: string) => {
    const client = await mockGetClientBySlug(slug);
    if (!client) return { ok: false, error: `Client '${slug}' not found.` };
    return { ok: true, client };
  },
  findProjectByFuzzyName: (...args: unknown[]) =>
    mockFindProjectByFuzzyName(...args),
  findWeekItemByFuzzyTitleWithDisambiguation: async (...args: unknown[]) => {
    const result = await mockFindWeekItemByFuzzyTitle(...args);
    if (!result) return { kind: "none" };
    if (result === "__AMBIGUOUS__") return { kind: "ambiguous", options: [{ title: "CDS Review" }, { title: "CDS Delivery" }] };
    return { kind: "match", value: result };
  },
  getWeekItemsForWeek: (...args: unknown[]) =>
    mockGetWeekItemsForWeek(...args),
  checkIdempotency: (...args: unknown[]) => mockCheckIdempotency(...args),
  validateField: (field: string, allowed: readonly string[]) => {
    if (!allowed.includes(field)) {
      return { ok: false, error: `Invalid field '${field}'. Allowed fields: ${allowed.join(", ")}` };
    }
    return null;
  },
}));

const client = { id: "c1", name: "Convergix", slug: "convergix" };

beforeEach(() => {
  vi.clearAllMocks();
  mockCheckIdempotency.mockResolvedValue(false);
});

describe("createWeekItem", () => {
  it("creates week item successfully", async () => {
    const { createWeekItem } = await import("./operations-writes-week");
    const result = await createWeekItem({
      weekOf: "2026-04-06",
      title: "CDS Review",
      updatedBy: "kathy",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toContain("CDS Review");
      expect(result.data?.title).toBe("CDS Review");
    }
    expect(mockInsertValues).toHaveBeenCalledTimes(2); // weekItem + audit
  });

  it("creates week item with client and project", async () => {
    mockGetClientBySlug.mockResolvedValue(client);
    mockFindProjectByFuzzyName.mockResolvedValue({ id: "p1", name: "CDS Messaging" });

    const { createWeekItem } = await import("./operations-writes-week");
    const result = await createWeekItem({
      clientSlug: "convergix",
      projectName: "CDS Messaging",
      weekOf: "2026-04-06",
      title: "CDS Review Meeting",
      owner: "Kathy",
      updatedBy: "kathy",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data?.clientName).toBe("Convergix");
    }
  });

  it("returns error when client not found", async () => {
    mockGetClientBySlug.mockResolvedValue(null);

    const { createWeekItem } = await import("./operations-writes-week");
    const result = await createWeekItem({
      clientSlug: "unknown",
      weekOf: "2026-04-06",
      title: "Test",
      updatedBy: "jason",
    });

    expect(result.ok).toBe(false);
  });

  it("returns early on duplicate request", async () => {
    mockCheckIdempotency.mockResolvedValue(true);

    const { createWeekItem } = await import("./operations-writes-week");
    const result = await createWeekItem({
      weekOf: "2026-04-06",
      title: "CDS Review",
      updatedBy: "kathy",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toContain("duplicate");
    }
    expect(mockInsertValues).not.toHaveBeenCalled();
  });
});

describe("updateWeekItemField", () => {
  const weekItem = {
    id: "wi1",
    title: "CDS Review",
    status: null,
    date: "2026-04-07",
    dayOfWeek: "tuesday",
    owner: "Kathy",
    resources: "Roz",
    notes: null,
    category: "review",
    clientId: "c1",
  };

  it("updates field successfully", async () => {
    mockFindWeekItemByFuzzyTitle.mockResolvedValue(weekItem);

    const { updateWeekItemField } = await import("./operations-writes-week");
    const result = await updateWeekItemField({
      weekOf: "2026-04-06",
      weekItemTitle: "CDS Review",
      field: "status",
      newValue: "completed",
      updatedBy: "kathy",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({
        weekItemTitle: "CDS Review",
        field: "status",
        previousValue: "",
        newValue: "completed",
      });
    }
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed" })
    );
  });

  it("returns error with available titles when item not found", async () => {
    mockFindWeekItemByFuzzyTitle.mockResolvedValue(null);
    mockGetWeekItemsForWeek.mockResolvedValue([
      { title: "CDS Review" },
      { title: "Widget Delivery" },
    ]);

    const { updateWeekItemField } = await import("./operations-writes-week");
    const result = await updateWeekItemField({
      weekOf: "2026-04-06",
      weekItemTitle: "Nonexistent",
      field: "status",
      newValue: "completed",
      updatedBy: "kathy",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.available).toEqual(["CDS Review", "Widget Delivery"]);
    }
  });

  it("returns early on duplicate request", async () => {
    mockFindWeekItemByFuzzyTitle.mockResolvedValue(weekItem);
    mockCheckIdempotency.mockResolvedValue(true);

    const { updateWeekItemField } = await import("./operations-writes-week");
    const result = await updateWeekItemField({
      weekOf: "2026-04-06",
      weekItemTitle: "CDS Review",
      field: "owner",
      newValue: "Lane",
      updatedBy: "kathy",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message).toContain("duplicate");
    }
    expect(mockUpdateSet).not.toHaveBeenCalled();
  });

  it("returns disambiguation error when multiple items match", async () => {
    // Override the mock to return "ambiguous" — signal via a special sentinel
    mockFindWeekItemByFuzzyTitle.mockResolvedValue("__AMBIGUOUS__");

    const { updateWeekItemField } = await import("./operations-writes-week");
    const result = await updateWeekItemField({
      weekOf: "2026-04-06",
      weekItemTitle: "CDS",
      field: "status",
      newValue: "completed",
      updatedBy: "kathy",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Multiple week items match");
    }
  });

  it("rejects invalid field name", async () => {
    const { updateWeekItemField } = await import("./operations-writes-week");
    const result = await updateWeekItemField({
      weekOf: "2026-04-06",
      weekItemTitle: "CDS Review",
      field: "invalid",
      newValue: "foo",
      updatedBy: "kathy",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("invalid");
    }
  });
});
