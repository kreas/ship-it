/**
 * Runway Write Operations — project field updates
 *
 * Handles updates to individual project fields (name, dueDate, owner, etc.)
 * with idempotency checks and audit logging.
 */

import { getRunwayDb } from "@/lib/db/runway";
import { projects, updates } from "@/lib/db/runway-schema";
import { eq } from "drizzle-orm";
import {
  generateIdempotencyKey,
  generateId,
  getClientOrFail,
  resolveProjectOrFail,
  checkIdempotency,
  validateField,
} from "./operations-utils";
import type { OperationResult } from "./operations-writes";

const ALLOWED_FIELDS = [
  "name",
  "dueDate",
  "owner",
  "resources",
  "waitingOn",
  "target",
  "notes",
] as const;

type ProjectField = (typeof ALLOWED_FIELDS)[number];

// Map field names to Drizzle column references
const FIELD_TO_COLUMN: Record<ProjectField, keyof typeof projects.$inferSelect> = {
  name: "name",
  dueDate: "dueDate",
  owner: "owner",
  resources: "resources",
  waitingOn: "waitingOn",
  target: "target",
  notes: "notes",
};

export interface UpdateProjectFieldParams {
  clientSlug: string;
  projectName: string;
  field: string;
  newValue: string;
  updatedBy: string;
}

export async function updateProjectField(
  params: UpdateProjectFieldParams
): Promise<OperationResult> {
  const { clientSlug, projectName, field, newValue, updatedBy } = params;
  const db = getRunwayDb();

  const fieldError = validateField(field, ALLOWED_FIELDS);
  if (fieldError) return fieldError;

  const typedField = field as ProjectField;

  const lookup = await getClientOrFail(clientSlug);
  if (!lookup.ok) return lookup;
  const { client } = lookup;

  const projectLookup = await resolveProjectOrFail(client.id, client.name, projectName);
  if (!projectLookup.ok) return projectLookup;
  const project = projectLookup.project;

  const columnKey = FIELD_TO_COLUMN[typedField];
  const previousValue = String(project[columnKey] ?? "");

  const idemKey = generateIdempotencyKey(
    "field-change",
    project.id,
    field,
    newValue,
    updatedBy
  );

  if (await checkIdempotency(idemKey)) {
    return {
      ok: true,
      message: "Update already applied (duplicate request).",
      data: {
        clientName: client.name,
        projectName: project.name,
        field,
        previousValue,
        newValue,
      },
    };
  }

  await db
    .update(projects)
    .set({ [columnKey]: newValue, updatedAt: new Date() })
    .where(eq(projects.id, project.id));

  const summary = `${client.name} / ${project.name}: ${field} changed from "${previousValue}" to "${newValue}"`;
  await db.insert(updates).values({
    id: generateId(),
    idempotencyKey: idemKey,
    projectId: project.id,
    clientId: client.id,
    updatedBy,
    updateType: "field-change",
    previousValue,
    newValue,
    summary,
    metadata: JSON.stringify({ field }),
  });

  return {
    ok: true,
    message: `Updated ${field} for ${client.name} / ${project.name}.`,
    data: {
      clientName: client.name,
      projectName: project.name,
      field,
      previousValue,
      newValue,
    },
  };
}
