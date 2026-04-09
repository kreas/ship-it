/**
 * Runway Write Operations — week item create and update
 *
 * Handles creating new week items and updating individual fields
 * with idempotency checks and audit logging.
 */

import { getRunwayDb } from "@/lib/db/runway";
import { weekItems, updates } from "@/lib/db/runway-schema";
import { eq } from "drizzle-orm";
import {
  generateIdempotencyKey,
  generateId,
  getClientOrFail,
  findProjectByFuzzyName,
  findWeekItemByFuzzyTitleWithDisambiguation,
  getWeekItemsForWeek,
  checkIdempotency,
  validateField,
} from "./operations-utils";
import type { OperationResult } from "./operations-writes";

// ── Create Week Item ─────────────────────────────────────

export interface CreateWeekItemParams {
  clientSlug?: string;
  projectName?: string;
  weekOf: string;
  dayOfWeek?: string;
  date?: string;
  title: string;
  status?: string;
  category?: string;
  owner?: string;
  resources?: string;
  notes?: string;
  updatedBy: string;
}

export async function createWeekItem(
  params: CreateWeekItemParams
): Promise<OperationResult> {
  const {
    clientSlug,
    projectName,
    weekOf,
    dayOfWeek,
    date,
    title,
    status,
    category,
    owner,
    resources,
    notes,
    updatedBy,
  } = params;
  const db = getRunwayDb();

  let clientId: string | null = null;
  let clientName: string | undefined;
  let projectId: string | null = null;

  if (clientSlug) {
    const lookup = await getClientOrFail(clientSlug);
    if (!lookup.ok) return lookup;
    clientId = lookup.client.id;
    clientName = lookup.client.name;

    if (projectName) {
      const project = await findProjectByFuzzyName(
        lookup.client.id,
        projectName
      );
      projectId = project?.id ?? null;
    }
  }

  const idemKey = generateIdempotencyKey(
    "create-week-item",
    clientId ?? "none",
    title,
    weekOf,
    updatedBy
  );

  if (await checkIdempotency(idemKey)) {
    return {
      ok: true,
      message: "Week item already created (duplicate request).",
      data: { clientName, title },
    };
  }

  const itemId = generateId();
  await db.insert(weekItems).values({
    id: itemId,
    clientId,
    projectId,
    weekOf,
    dayOfWeek: dayOfWeek ?? null,
    date: date ?? null,
    title,
    status: status ?? null,
    category: category ?? null,
    owner: owner ?? null,
    resources: resources ?? null,
    notes: notes ?? null,
    sortOrder: 999,
  });

  await db.insert(updates).values({
    id: generateId(),
    idempotencyKey: idemKey,
    clientId,
    updatedBy,
    updateType: "new-week-item",
    newValue: title,
    summary: `New week item${clientName ? ` (${clientName})` : ""}: ${title}`,
  });

  return {
    ok: true,
    message: `Added '${title}' to week of ${weekOf}.`,
    data: { clientName, title },
  };
}

// ── Update Week Item Field ───────────────────────────────

const ALLOWED_WEEK_FIELDS = [
  "title",
  "status",
  "date",
  "dayOfWeek",
  "owner",
  "resources",
  "notes",
  "category",
] as const;

type WeekItemField = (typeof ALLOWED_WEEK_FIELDS)[number];

const FIELD_TO_COLUMN: Record<
  WeekItemField,
  keyof typeof weekItems.$inferSelect
> = {
  title: "title",
  status: "status",
  date: "date",
  dayOfWeek: "dayOfWeek",
  owner: "owner",
  resources: "resources",
  notes: "notes",
  category: "category",
};

export interface UpdateWeekItemFieldParams {
  weekOf: string;
  weekItemTitle: string;
  field: string;
  newValue: string;
  updatedBy: string;
}

export async function updateWeekItemField(
  params: UpdateWeekItemFieldParams
): Promise<OperationResult> {
  const { weekOf, weekItemTitle, field, newValue, updatedBy } = params;
  const db = getRunwayDb();

  const fieldError = validateField(field, ALLOWED_WEEK_FIELDS);
  if (fieldError) return fieldError;

  const typedField = field as WeekItemField;

  const fuzzyResult = await findWeekItemByFuzzyTitleWithDisambiguation(weekOf, weekItemTitle);
  if (fuzzyResult.kind === "ambiguous") {
    return {
      ok: false,
      error: `Multiple week items match '${weekItemTitle}': ${fuzzyResult.options.map((i) => i.title).join(", ")}. Which one?`,
      available: fuzzyResult.options.map((i) => i.title),
    };
  }
  if (fuzzyResult.kind === "none") {
    const weekItemsList = await getWeekItemsForWeek(weekOf);
    return {
      ok: false,
      error: `Week item '${weekItemTitle}' not found for week of ${weekOf}.`,
      available: weekItemsList.map((i) => i.title),
    };
  }
  const item = fuzzyResult.value;

  const columnKey = FIELD_TO_COLUMN[typedField];
  const previousValue = String(item[columnKey] ?? "");

  const idemKey = generateIdempotencyKey(
    "week-field-change",
    item.id,
    field,
    newValue,
    updatedBy
  );

  if (await checkIdempotency(idemKey)) {
    return {
      ok: true,
      message: "Update already applied (duplicate request).",
      data: { weekItemTitle: item.title, field, previousValue, newValue },
    };
  }

  await db
    .update(weekItems)
    .set({ [columnKey]: newValue, updatedAt: new Date() })
    .where(eq(weekItems.id, item.id));

  await db.insert(updates).values({
    id: generateId(),
    idempotencyKey: idemKey,
    clientId: item.clientId,
    updatedBy,
    updateType: "week-field-change",
    previousValue,
    newValue,
    summary: `Week item '${item.title}': ${field} changed from "${previousValue}" to "${newValue}"`,
  });

  return {
    ok: true,
    message: `Updated ${field} for '${item.title}'.`,
    data: { weekItemTitle: item.title, field, previousValue, newValue },
  };
}
