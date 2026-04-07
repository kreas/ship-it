/**
 * Runway Read Operations — Client & Project queries
 */

import { getRunwayDb } from "@/lib/db/runway";
import { projects } from "@/lib/db/runway-schema";
import { asc } from "drizzle-orm";
import {
  getAllClients,
  getClientNameMap,
  groupBy,
  matchesSubstring,
} from "./operations";

export async function getClientsWithCounts() {
  const db = getRunwayDb();
  const allClients = await getAllClients();
  const allProjects = await db.select().from(projects);

  const projectsByClient = groupBy(allProjects, (p) => p.clientId);
  const countByClient = new Map(
    [...projectsByClient.entries()].map(([k, v]) => [k, v.length])
  );

  return allClients.map((c) => ({
    name: c.name,
    slug: c.slug,
    contractValue: c.contractValue,
    contractStatus: c.contractStatus,
    contractTerm: c.contractTerm,
    team: c.team,
    projectCount: countByClient.get(c.id) ?? 0,
  }));
}

export async function getProjectsFiltered(opts?: {
  clientSlug?: string;
  status?: string;
  owner?: string;
  waitingOn?: string;
}) {
  const db = getRunwayDb();
  const allClients = await getAllClients();
  const clientNameById = await getClientNameMap();
  const clientBySlug = new Map(allClients.map((c) => [c.slug, c]));

  let projectList = await db
    .select()
    .from(projects)
    .orderBy(asc(projects.sortOrder));

  if (opts?.clientSlug) {
    const client = clientBySlug.get(opts.clientSlug);
    if (client) {
      projectList = projectList.filter((p) => p.clientId === client.id);
    }
  }

  if (opts?.status) {
    projectList = projectList.filter((p) => p.status === opts.status);
  }

  if (opts?.owner) {
    projectList = projectList.filter((p) => matchesSubstring(p.owner, opts.owner!));
  }

  if (opts?.waitingOn) {
    projectList = projectList.filter((p) => matchesSubstring(p.waitingOn, opts.waitingOn!));
  }

  return projectList.map((p) => ({
    name: p.name,
    client: clientNameById.get(p.clientId) ?? "Unknown",
    status: p.status,
    category: p.category,
    owner: p.owner,
    waitingOn: p.waitingOn,
    target: p.target,
    notes: p.notes,
    staleDays: p.staleDays,
  }));
}
