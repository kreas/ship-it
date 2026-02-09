"use server";

import { revalidatePath } from "next/cache";
import { db } from "../db";
import { epics } from "../db/schema";
import type { Epic, CreateEpicInput } from "../types";
import { requireWorkspaceAccess } from "./workspace";
import { getWorkspaceSlug } from "./helpers";

export async function createEpic(
  workspaceId: string,
  input: CreateEpicInput
): Promise<Epic> {
  await requireWorkspaceAccess(workspaceId, "member");

  const now = new Date();
  const newEpic: Epic = {
    id: crypto.randomUUID(),
    workspaceId,
    title: input.title,
    description: input.description ?? null,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(epics).values(newEpic);

  const slug = await getWorkspaceSlug(workspaceId);
  revalidatePath(slug ? `/w/${slug}` : "/");

  return newEpic;
}
