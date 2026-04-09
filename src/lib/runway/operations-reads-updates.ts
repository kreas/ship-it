/**
 * Runway Read Operations — recent updates query
 *
 * Powers "what did I update?" and "what happened with X this week?" queries.
 */

import { getRunwayDb } from "@/lib/db/runway";
import { updates, projects, clients } from "@/lib/db/runway-schema";
import { desc } from "drizzle-orm";
import { matchesSubstring, getClientBySlug } from "./operations-utils";

export interface RecentUpdate {
  clientName: string | null;
  projectName: string | null;
  updateType: string | null;
  summary: string | null;
  previousValue: string | null;
  newValue: string | null;
  createdAt: Date | null;
}

export interface GetRecentUpdatesParams {
  updatedBy?: string;
  clientSlug?: string;
  since?: string; // ISO date
  limit?: number;
}

export async function getRecentUpdates(
  params: GetRecentUpdatesParams = {}
): Promise<RecentUpdate[]> {
  const {
    updatedBy,
    clientSlug,
    since,
    limit = 20,
  } = params;

  const db = getRunwayDb();

  // Build a project name map
  const allProjects = await db.select().from(projects);
  const projectNameMap = new Map(allProjects.map((p) => [p.id, p.name]));

  // Build a client name map
  const allClients = await db.select().from(clients);
  const clientNameMap = new Map(allClients.map((c) => [c.id, c.name]));

  // Get client ID filter if clientSlug provided
  let clientIdFilter: string | undefined;
  if (clientSlug) {
    const client = await getClientBySlug(clientSlug);
    if (client) clientIdFilter = client.id;
  }

  // Compute since date
  const sinceDate = since
    ? new Date(since)
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Query all recent updates, then filter in JS for flexibility
  const allUpdates = await db
    .select()
    .from(updates)
    .orderBy(desc(updates.createdAt));

  const results: RecentUpdate[] = [];

  for (const u of allUpdates) {
    if (results.length >= limit) break;

    // Filter by date
    if (u.createdAt && u.createdAt < sinceDate) break; // ordered desc, so stop early

    // Filter by updatedBy (substring match)
    if (updatedBy && !matchesSubstring(u.updatedBy, updatedBy)) continue;

    // Filter by client
    if (clientIdFilter && u.clientId !== clientIdFilter) continue;

    results.push({
      clientName: u.clientId ? clientNameMap.get(u.clientId) ?? null : null,
      projectName: u.projectId ? projectNameMap.get(u.projectId) ?? null : null,
      updateType: u.updateType,
      summary: u.summary,
      previousValue: u.previousValue ?? null,
      newValue: u.newValue ?? null,
      createdAt: u.createdAt,
    });
  }

  return results;
}
