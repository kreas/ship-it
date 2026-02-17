"use server";

import { db } from "../db";
import { adArtifacts } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { generateDownloadUrl, deleteObject } from "../storage/r2-client";
import type { AdArtifact } from "../types";

/**
 * Create a new ad artifact
 */
export async function createAdArtifact(input: {
  workspaceId: string;
  chatId?: string;
  messageId?: string;
  platform: string;
  templateType: string;
  name: string;
  content: string;
  mediaAssets?: string;
  brandId?: string;
}): Promise<AdArtifact> {
  try {
    const [artifact] = await db
      .insert(adArtifacts)
      .values({
        workspaceId: input.workspaceId,
        chatId: input.chatId ?? null,
        messageId: input.messageId ?? null,
        platform: input.platform,
        templateType: input.templateType,
        name: input.name,
        content: input.content,
        mediaAssets: input.mediaAssets ?? null,
        brandId: input.brandId ?? null,
      })
      .returning();

    console.log("created ad artifact", artifact);

    return artifact;
  } catch (error) {
    console.error("Failed to create ad artifact:", error);
    console.error("Input was:", JSON.stringify(input, null, 2));
    throw error;
  }
}

/**
 * Get a single ad artifact with fresh signed URLs for media
 */
export async function getAdArtifact(
  artifactId: string
): Promise<(AdArtifact & { resolvedMediaUrls: string[] }) | null> {
  const artifact = await db
    .select()
    .from(adArtifacts)
    .where(eq(adArtifacts.id, artifactId))
    .get();

  if (!artifact) return null;

  // Resolve storage keys to signed download URLs
  const resolvedMediaUrls: string[] = [];
  if (artifact.mediaAssets) {
    try {
      const assets = JSON.parse(artifact.mediaAssets) as Array<{
        storageKey?: string;
        imageUrls?: string[];
      }>;
      for (const asset of assets) {
        if (asset.storageKey) {
          const url = await generateDownloadUrl(asset.storageKey);
          resolvedMediaUrls.push(url);
        }
        // Also handle ArtifactMediaUrls format with imageUrls array
        if (asset.imageUrls) {
          resolvedMediaUrls.push(...asset.imageUrls);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  return { ...artifact, resolvedMediaUrls };
}

/**
 * Get all ad artifacts for a workspace
 */
export async function getWorkspaceAdArtifacts(
  workspaceId: string
): Promise<AdArtifact[]> {
  return db
    .select()
    .from(adArtifacts)
    .where(eq(adArtifacts.workspaceId, workspaceId))
    .orderBy(desc(adArtifacts.createdAt))
    .all();
}

/**
 * Get ad artifacts for a specific chat
 */
export async function getChatAdArtifacts(chatId: string): Promise<AdArtifact[]> {
  return db
    .select()
    .from(adArtifacts)
    .where(eq(adArtifacts.chatId, chatId))
    .orderBy(desc(adArtifacts.createdAt))
    .all();
}

/**
 * Update ad artifact media assets
 */
export async function updateAdArtifactMedia(
  artifactId: string,
  mediaAssets: string
): Promise<AdArtifact | null> {
  const [updated] = await db
    .update(adArtifacts)
    .set({
      mediaAssets,
      updatedAt: new Date(),
    })
    .where(eq(adArtifacts.id, artifactId))
    .returning();

  return updated ?? null;
}

/**
 * Delete an ad artifact and clean up R2 media
 */
export async function deleteAdArtifact(artifactId: string): Promise<void> {
  const artifact = await db
    .select()
    .from(adArtifacts)
    .where(eq(adArtifacts.id, artifactId))
    .get();

  if (!artifact) return;

  // Clean up R2 media assets
  if (artifact.mediaAssets) {
    try {
      const assets = JSON.parse(artifact.mediaAssets) as Array<{
        storageKey?: string;
      }>;
      for (const asset of assets) {
        if (asset.storageKey) {
          await deleteObject(asset.storageKey).catch(() => {});
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  await db.delete(adArtifacts).where(eq(adArtifacts.id, artifactId));
}
