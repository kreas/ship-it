/**
 * Runway Read Operations — Pipeline & Stale Items queries
 */

import { getRunwayDb } from "@/lib/db/runway";
import {
  projects,
  pipelineItems,
  updates,
} from "@/lib/db/runway-schema";
import { eq, asc, desc } from "drizzle-orm";
import { getClientBySlug, getClientNameMap, matchesSubstring } from "./operations";

export async function getPipelineData() {
  const db = getRunwayDb();
  const clientNameById = await getClientNameMap();

  const items = await db
    .select()
    .from(pipelineItems)
    .orderBy(asc(pipelineItems.sortOrder));

  return items.map((item) => ({
    account: item.clientId
      ? clientNameById.get(item.clientId) ?? null
      : null,
    name: item.name,
    status: item.status,
    estimatedValue: item.estimatedValue,
    waitingOn: item.waitingOn,
    notes: item.notes,
  }));
}

export interface StaleAccountItem {
  clientName: string;
  projectName: string;
  staleDays: number;
  lastUpdate?: string;
}

/**
 * Find stale projects for a set of client slugs.
 * A project is stale if staleDays >= 7 or it has no updates in the last 7 days.
 * Results are sorted by staleness (most stale first).
 */
export async function getStaleItemsForAccounts(
  clientSlugs: string[],
  personName?: string
): Promise<StaleAccountItem[]> {
  if (clientSlugs.length === 0) return [];

  const db = getRunwayDb();
  const results: StaleAccountItem[] = [];

  for (const slug of clientSlugs) {
    const client = await getClientBySlug(slug);
    if (!client) continue;

    const clientProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.clientId, client.id))
      .orderBy(asc(projects.sortOrder));

    // Get most recent update per project for this client
    const clientUpdates = await db
      .select()
      .from(updates)
      .where(eq(updates.clientId, client.id))
      .orderBy(desc(updates.createdAt));

    const latestUpdateByProject = new Map<string, Date>();
    for (const u of clientUpdates) {
      if (u.projectId && u.createdAt && !latestUpdateByProject.has(u.projectId)) {
        latestUpdateByProject.set(u.projectId, u.createdAt);
      }
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const project of clientProjects) {
      // Skip completed and on-hold projects
      if (project.status === "completed" || project.status === "on-hold") continue;

      // Filter by personName if provided — show items they own, resource, or unassigned
      if (personName) {
        const isOwner = matchesSubstring(project.owner, personName);
        const isResource = matchesSubstring(project.resources, personName);
        const isUnassigned = !project.owner && !project.resources;
        if (!isOwner && !isResource && !isUnassigned) continue;
      }

      const isStaleByStaleDays = project.staleDays != null && project.staleDays >= 7;
      const lastUpdate = latestUpdateByProject.get(project.id);
      const isStaleByUpdates = !lastUpdate || lastUpdate < sevenDaysAgo;

      if (isStaleByStaleDays || isStaleByUpdates) {
        results.push({
          clientName: client.name,
          projectName: project.name,
          staleDays: project.staleDays ?? 0,
          lastUpdate: lastUpdate?.toISOString(),
        });
      }
    }
  }

  results.sort((a, b) => b.staleDays - a.staleDays);
  return results;
}
