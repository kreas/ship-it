import { describe, it, expect } from "vitest";
import { mergeWeekendDays, groupByWeek } from "./runway-board-utils";
import type { DayItem } from "./types";

function day(date: string, label: string, itemCount = 0): DayItem {
  return {
    date,
    label,
    items: Array.from({ length: itemCount }, (_, i) => ({
      title: `Item ${i + 1}`,
      account: "Test",
      type: "delivery" as const,
    })),
  };
}

describe("mergeWeekendDays", () => {
  it("merges adjacent Saturday and Sunday into a Weekend column", () => {
    const days = [
      day("2026-04-06", "Mon"),
      day("2026-04-11", "Sat", 1),
      day("2026-04-12", "Sun", 2),
    ];
    const result = mergeWeekendDays(days);
    expect(result).toHaveLength(2);
    expect(result[1].label).toBe("Weekend");
    expect(result[1].items).toHaveLength(3);
    expect(result[1].date).toBe("2026-04-11");
  });

  it("passes through Saturday-only without merging", () => {
    const days = [
      day("2026-04-06", "Mon"),
      day("2026-04-11", "Sat", 1),
    ];
    const result = mergeWeekendDays(days);
    expect(result).toHaveLength(2);
    expect(result[1].label).toBe("Sat");
  });

  it("passes through Sunday-only without merging", () => {
    const days = [
      day("2026-04-12", "Sun", 1),
      day("2026-04-13", "Mon"),
    ];
    const result = mergeWeekendDays(days);
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe("Sun");
  });

  it("returns empty array for empty input", () => {
    expect(mergeWeekendDays([])).toEqual([]);
  });

  it("leaves weekdays unchanged", () => {
    const days = [
      day("2026-04-06", "Mon"),
      day("2026-04-07", "Tue"),
      day("2026-04-08", "Wed"),
    ];
    const result = mergeWeekendDays(days);
    expect(result).toHaveLength(3);
    expect(result.map((d) => d.label)).toEqual(["Mon", "Tue", "Wed"]);
  });

  it("handles non-adjacent Saturday and Sunday (not merged)", () => {
    const days = [
      day("2026-04-11", "Sat", 1),
      day("2026-04-06", "Mon"),
      day("2026-04-12", "Sun", 1),
    ];
    const result = mergeWeekendDays(days);
    // Sat followed by Mon, not Sun — no merge
    expect(result).toHaveLength(3);
  });
});

describe("groupByWeek", () => {
  it("groups days by their Monday", () => {
    const days = [
      day("2026-04-06", "Mon"),
      day("2026-04-07", "Tue"),
      day("2026-04-08", "Wed"),
    ];
    const result = groupByWeek(days);
    expect(result).toHaveLength(1);
    expect(result[0].mondayDate).toBe("2026-04-06");
    expect(result[0].days).toHaveLength(3);
  });

  it("produces w/o M/D label", () => {
    const days = [day("2026-04-06", "Mon")];
    const result = groupByWeek(days);
    expect(result[0].label).toBe("w/o 4/6");
  });

  it("separates days from different weeks", () => {
    const days = [
      day("2026-04-08", "Wed"),
      day("2026-04-13", "Mon"),
      day("2026-04-14", "Tue"),
    ];
    const result = groupByWeek(days);
    expect(result).toHaveLength(2);
    expect(result[0].mondayDate).toBe("2026-04-06");
    expect(result[0].days).toHaveLength(1);
    expect(result[1].mondayDate).toBe("2026-04-13");
    expect(result[1].days).toHaveLength(2);
  });

  it("returns empty array for empty input", () => {
    expect(groupByWeek([])).toEqual([]);
  });

  it("groups weekend days with their week's Monday", () => {
    const days = [
      day("2026-04-10", "Fri"),
      day("2026-04-11", "Sat"),
    ];
    const result = groupByWeek(days);
    expect(result).toHaveLength(1);
    expect(result[0].mondayDate).toBe("2026-04-06");
    expect(result[0].days).toHaveLength(2);
  });
});
