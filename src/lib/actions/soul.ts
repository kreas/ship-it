"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { workspaces } from "../db/schema";
import { eq } from "drizzle-orm";
import type { WorkspaceSoul } from "../types";
import { requireWorkspaceAccess } from "./workspace";

/**
 * Get the soul configuration for a workspace
 */
export async function getSoul(workspaceId: string): Promise<WorkspaceSoul | null> {
  await requireWorkspaceAccess(workspaceId);

  const workspace = await db
    .select({ soul: workspaces.soul })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .get();

  if (!workspace?.soul) {
    return null;
  }

  try {
    return JSON.parse(workspace.soul) as WorkspaceSoul;
  } catch {
    return null;
  }
}

/**
 * Update the soul configuration for a workspace
 */
export async function updateSoul(
  workspaceId: string,
  soul: WorkspaceSoul
): Promise<WorkspaceSoul> {
  await requireWorkspaceAccess(workspaceId, "admin");

  const now = new Date().toISOString();
  const updatedSoul: WorkspaceSoul = {
    ...soul,
    updatedAt: now,
  };

  await db
    .update(workspaces)
    .set({
      soul: JSON.stringify(updatedSoul),
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, workspaceId));

  revalidatePath(`/w`);

  return updatedSoul;
}

/**
 * Delete the soul configuration for a workspace
 */
export async function deleteSoul(workspaceId: string): Promise<void> {
  await requireWorkspaceAccess(workspaceId, "admin");

  await db
    .update(workspaces)
    .set({
      soul: null,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, workspaceId));

  revalidatePath(`/w`);
}

