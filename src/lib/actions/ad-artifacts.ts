"use server";

import { db } from "../db";
import { adArtifacts } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { generateDownloadUrl, deleteObject } from "../storage/r2-client";
import { renderAdToHtml } from "../ad-html-templates";
import { attachContentToIssue } from "./attachments";
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

    return artifact;
  } catch (error) {
    console.error("Failed to create ad artifact:", error);
    console.error("Input was:", JSON.stringify(input, null, 2));
    throw error;
  }
}

/** Shape compatible with ArtifactMediaUrls for initial media in ArtifactProvider */
export type ResolvedMediaBySlot = Array<{
  imageUrls: string[];
  videoUrls: string[];
  currentIndex: number;
  currentImageUrl: string | null;
  generatedAt: Date;
  showVideo: boolean;
}>;

/**
 * Get a single ad artifact with fresh signed URLs for media.
 * resolvedMediaBySlot can be passed as initialMediaUrls to ArtifactProvider so generated images show on reload.
 */
export async function getAdArtifact(
  artifactId: string
): Promise<
  (AdArtifact & { resolvedMediaUrls: string[]; resolvedMediaBySlot: ResolvedMediaBySlot }) | null
> {
  const artifact = await db
    .select()
    .from(adArtifacts)
    .where(eq(adArtifacts.id, artifactId))
    .get();

  if (!artifact) return null;

  const resolvedMediaUrls: string[] = [];
  const resolvedMediaBySlot: ResolvedMediaBySlot = [];

  if (artifact.mediaAssets) {
    try {
      const assets = JSON.parse(artifact.mediaAssets) as Array<{
        storageKey?: string;
        imageUrls?: string[];
      }>;
      for (const asset of assets) {
        const imageUrls: string[] = [];
        if (asset.storageKey) {
          const url = await generateDownloadUrl(asset.storageKey);
          imageUrls.push(url);
          resolvedMediaUrls.push(url);
        }
        if (asset.imageUrls) {
          imageUrls.push(...asset.imageUrls);
          resolvedMediaUrls.push(...asset.imageUrls);
        }
        resolvedMediaBySlot.push({
          imageUrls,
          videoUrls: [],
          currentIndex: 0,
          currentImageUrl: imageUrls[0] ?? null,
          generatedAt: new Date(),
          showVideo: false,
        });
      }
    } catch {
      // Ignore parse errors
    }
  }

  return { ...artifact, resolvedMediaUrls, resolvedMediaBySlot };
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
 * Attach an ad artifact's HTML preview to an issue (on-demand).
 */
export async function attachAdArtifactToIssue(
  artifactId: string,
  issueId: string
): Promise<{ success: true; attachmentId: string } | { success: false; error: string }> {
  try {
    const artifact = await db
      .select()
      .from(adArtifacts)
      .where(eq(adArtifacts.id, artifactId))
      .get();

    if (!artifact) {
      return { success: false, error: "Artifact not found" };
    }

    let parsedContent: unknown;
    try {
      parsedContent = JSON.parse(artifact.content);
    } catch {
      parsedContent = artifact.content;
    }

    // Resolve media URLs from R2 storage so the HTML includes actual images
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
          if (asset.imageUrls) {
            resolvedMediaUrls.push(...asset.imageUrls);
          }
        }
      } catch {
        // Ignore parse errors
      }
    }

    const html = renderAdToHtml(artifact.platform, artifact.templateType, parsedContent, resolvedMediaUrls);
    if (!html) {
      return { success: false, error: "Failed to render ad HTML" };
    }

    const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9-_ ]/g, "").trim();
    const filename = `${sanitize(artifact.name)} - ${sanitize(artifact.platform)} ${sanitize(artifact.templateType)}.html`;
    const attachment = await attachContentToIssue(issueId, html, filename, "text/html");

    return { success: true, attachmentId: attachment.id };
  } catch (error) {
    console.error("Failed to attach ad artifact to issue:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
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
