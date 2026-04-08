import type { DayItem } from "./types";
import { parseISODate, getMondayISODate } from "./date-utils";

export interface WeekGroup {
  mondayDate: string;
  label: string;
  days: DayItem[];
}

/**
 * Merge adjacent Saturday/Sunday DayItems into a single "Weekend" column.
 * If only one of Sat/Sun exists, it passes through unchanged.
 */
export function mergeWeekendDays(days: DayItem[]): DayItem[] {
  const result: DayItem[] = [];
  let i = 0;
  while (i < days.length) {
    const d = parseISODate(days[i].date);
    const dayOfWeek = d.getDay();

    if (dayOfWeek === 6 && i + 1 < days.length) {
      const next = parseISODate(days[i + 1].date);
      if (next.getDay() === 0) {
        result.push({
          date: days[i].date,
          label: "Weekend",
          items: [...days[i].items, ...days[i + 1].items],
        });
        i += 2;
        continue;
      }
    }
    result.push(days[i]);
    i++;
  }
  return result;
}

/**
 * Group days by their week's Monday, producing a "w/o M/D" label for each group.
 */
export function groupByWeek(days: DayItem[]): WeekGroup[] {
  const groups: Map<string, DayItem[]> = new Map();
  for (const day of days) {
    const monday = getMondayISODate(parseISODate(day.date));
    const existing = groups.get(monday);
    if (existing) {
      existing.push(day);
    } else {
      groups.set(monday, [day]);
    }
  }
  return Array.from(groups.entries()).map(([monday, weekDays]) => {
    const d = parseISODate(monday);
    return {
      mondayDate: monday,
      label: `w/o ${d.getMonth() + 1}/${d.getDate()}`,
      days: weekDays,
    };
  });
}
