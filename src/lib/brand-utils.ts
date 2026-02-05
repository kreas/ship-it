/**
 * Server-side brand utilities that require database access.
 * For client-safe utilities, import from ./brand-formatters instead.
 */
import type { Brand, WorkspaceSoul } from "./types";
import { db } from "./db";
import { workspaces, brands } from "./db/schema";
import { eq } from "drizzle-orm";
import { getWorkspaceSoul } from "./soul-utils";

// Re-export client-safe function for convenience
export { buildBrandSystemPrompt } from "./brand-formatters";

/**
 * Load workspace context (soul and brand) in parallel.
 * Use this in API routes to efficiently fetch both context sources.
 */
export async function loadWorkspaceContext(
  workspaceId: string | undefined
): Promise<{ soul: WorkspaceSoul | null; brand: Brand | null }> {
  const [soul, brand] = await Promise.all([
    getWorkspaceSoul(workspaceId),
    getWorkspaceBrandForPrompt(workspaceId),
  ]);
  return { soul, brand };
}

/**
 * Load the brand linked to a workspace for prompt injection.
 * Returns null if the workspace doesn't exist or has no brand linked.
 *
 * NOTE: This is a server-only function. Do not import this file in client components.
 * Use ./brand-formatters for client-safe utilities.
 */
export async function getWorkspaceBrandForPrompt(
  workspaceId: string | undefined
): Promise<Brand | null> {
  if (!workspaceId) return null;

  // Get workspace's brandId
  const workspace = await db
    .select({ brandId: workspaces.brandId })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .get();

  if (!workspace?.brandId) return null;

  // Fetch the brand
  const brand = await db
    .select()
    .from(brands)
    .where(eq(brands.id, workspace.brandId))
    .get();

  return brand ?? null;
}
