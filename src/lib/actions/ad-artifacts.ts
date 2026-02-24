"use server";

import { db } from "../db";
import { adArtifacts, attachments, workspaceChats } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { generateDownloadUrl, deleteObject, uploadContent } from "../storage/r2-client";
import { renderAdToHtml } from "../ad-html-templates";
import { attachContentToIssue } from "./attachments";
import { requireWorkspaceAccess } from "./workspace";
import type { AdArtifact } from "../types";
function isEmptyUrl(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value !== "string") return true;
  return value.trim() === "";
}

/**
 * When profile/company image URL is empty and we have a generated image in slot 0,
 * substitute it into content and return content media starting at index 1
 * (so content image indices stay 0-based for the frontend).
 */
function mergeProfileMediaIntoContent(
  content: Record<string, unknown>,
  resolvedMediaBySlot: ResolvedMediaBySlot
): { mergedContent: Record<string, unknown>; contentMediaBySlot: ResolvedMediaBySlot } {
  const profileUrl = resolvedMediaBySlot[0]?.currentImageUrl ?? null;
  if (!profileUrl) return { mergedContent: content, contentMediaBySlot: resolvedMediaBySlot };

  const profile = content.profile && typeof content.profile === "object" ? (content.profile as Record<string, unknown>) : null;
  const company = content.company && typeof content.company === "object" ? (content.company as Record<string, unknown>) : null;
  const needsFill =
    (profile && (isEmptyUrl(profile.image) || isEmptyUrl(profile.profileImageUrl) || isEmptyUrl(profile.imageUrl))) ||
    (company && isEmptyUrl(company.logo)) ||
    isEmptyUrl(content.profileImageUrl);
  if (!needsFill) return { mergedContent: content, contentMediaBySlot: resolvedMediaBySlot };

  const merged = JSON.parse(JSON.stringify(content)) as Record<string, unknown>;
  if (merged.profile && typeof merged.profile === "object") {
    const p = merged.profile as Record<string, unknown>;
    if (isEmptyUrl(p.image)) p.image = profileUrl;
    if (isEmptyUrl(p.profileImageUrl)) p.profileImageUrl = profileUrl;
    if (isEmptyUrl(p.imageUrl)) p.imageUrl = profileUrl;
  }
  if (merged.company && typeof merged.company === "object") {
    const c = merged.company as Record<string, unknown>;
    if (isEmptyUrl(c.logo)) c.logo = profileUrl;
  }
  if (isEmptyUrl(merged.profileImageUrl)) merged.profileImageUrl = profileUrl;

  return {
    mergedContent: merged,
    contentMediaBySlot: resolvedMediaBySlot,
  };
}

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
  await requireWorkspaceAccess(input.workspaceId, "member");
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

  await requireWorkspaceAccess(artifact.workspaceId);

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

  let contentForResponse: string = artifact.content;
  try {
    const parsed = typeof artifact.content === "string" ? JSON.parse(artifact.content) : artifact.content;
    if (parsed && typeof parsed === "object") {
      const { mergedContent } = mergeProfileMediaIntoContent(
        parsed as Record<string, unknown>,
        resolvedMediaBySlot
      );
      contentForResponse = JSON.stringify(mergedContent);
    }
  } catch {
    // Keep original content
  }

  return {
    ...artifact,
    content: contentForResponse,
    resolvedMediaUrls,
    resolvedMediaBySlot,
  };
}

/**
 * Get all ad artifacts for a workspace
 */
export async function getWorkspaceAdArtifacts(
  workspaceId: string
): Promise<AdArtifact[]> {
  await requireWorkspaceAccess(workspaceId);
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
  const chat = await db
    .select({ workspaceId: workspaceChats.workspaceId })
    .from(workspaceChats)
    .where(eq(workspaceChats.id, chatId))
    .get();
  if (!chat) return [];
  await requireWorkspaceAccess(chat.workspaceId);
  return db
    .select()
    .from(adArtifacts)
    .where(eq(adArtifacts.chatId, chatId))
    .orderBy(desc(adArtifacts.createdAt))
    .all();
}

/**
 * Update ad artifact content (copy/text fields)
 */
export async function updateAdArtifactContent(
  artifactId: string,
  content: string
): Promise<AdArtifact | null> {
  const existing = await db
    .select({ workspaceId: adArtifacts.workspaceId })
    .from(adArtifacts)
    .where(eq(adArtifacts.id, artifactId))
    .get();
  if (!existing) return null;
  await requireWorkspaceAccess(existing.workspaceId, "member");
  const [updated] = await db
    .update(adArtifacts)
    .set({ content, updatedAt: new Date() })
    .where(eq(adArtifacts.id, artifactId))
    .returning();

  if (updated) {
    // Fire-and-forget: re-render any linked HTML attachment
    refreshAdAttachment(artifactId).catch(() => {});
  }

  return updated ?? null;
}

/**
 * Update ad artifact media assets
 */
export async function updateAdArtifactMedia(
  artifactId: string,
  mediaAssets: string
): Promise<AdArtifact | null> {
  const existing = await db
    .select({ workspaceId: adArtifacts.workspaceId })
    .from(adArtifacts)
    .where(eq(adArtifacts.id, artifactId))
    .get();
  if (!existing) return null;
  await requireWorkspaceAccess(existing.workspaceId, "member");
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

    await requireWorkspaceAccess(artifact.workspaceId, "member");

    let parsedContent: unknown;
    try {
      parsedContent = JSON.parse(artifact.content);
    } catch {
      parsedContent = artifact.content;
    }

    // Resolve media URLs from R2 storage so the HTML includes actual images
    const resolvedMediaBySlotForHtml: ResolvedMediaBySlot = [];
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
          }
          if (asset.imageUrls) imageUrls.push(...asset.imageUrls);
          resolvedMediaBySlotForHtml.push({
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
    const { mergedContent: contentForHtml, contentMediaBySlot } = mergeProfileMediaIntoContent(
      parsedContent as Record<string, unknown>,
      resolvedMediaBySlotForHtml
    );
    // Slot 0 = profile (already in contentForHtml); HTML templates expect mediaUrls[0] = first content image
    const contentOnlySlots = contentMediaBySlot.slice(1);
    const contentMediaUrls = contentOnlySlots.map((s) => s.currentImageUrl).filter(Boolean) as string[];

    const html = renderAdToHtml(artifact.platform, artifact.templateType, contentForHtml, contentMediaUrls);
    if (!html) {
      return { success: false, error: "Failed to render ad HTML" };
    }

    const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9-_ ]/g, "").trim();
    const filename = `${sanitize(artifact.name)} - ${sanitize(artifact.platform)} ${sanitize(artifact.templateType)}.html`;
    const attachment = await attachContentToIssue(issueId, html, filename, "text/html");

    // Store the attachmentId on the artifact for later refresh
    await db
      .update(adArtifacts)
      .set({ issueAttachmentId: attachment.id, updatedAt: new Date() })
      .where(eq(adArtifacts.id, artifactId));

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
 * Re-render and overwrite the HTML attachment for an ad artifact.
 * Called after media is generated so the attachment reflects current images.
 */
export async function refreshAdAttachment(artifactId: string): Promise<void> {
  const artifact = await db
    .select()
    .from(adArtifacts)
    .where(eq(adArtifacts.id, artifactId))
    .get();

  if (!artifact?.issueAttachmentId) return;

  await requireWorkspaceAccess(artifact.workspaceId, "member");

  const attachment = await db
    .select()
    .from(attachments)
    .where(eq(attachments.id, artifact.issueAttachmentId))
    .get();

  if (!attachment) return;

  // Resolve current media URLs
  const resolvedMediaBySlotForHtml: ResolvedMediaBySlot = [];
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
        }
        if (asset.imageUrls) imageUrls.push(...asset.imageUrls);
        resolvedMediaBySlotForHtml.push({
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

  let parsedContent: unknown;
  try {
    parsedContent = JSON.parse(artifact.content);
  } catch {
    parsedContent = artifact.content;
  }
  const { mergedContent: contentForHtml, contentMediaBySlot } = mergeProfileMediaIntoContent(
    parsedContent as Record<string, unknown>,
    resolvedMediaBySlotForHtml
  );
  // Slot 0 = profile (already in contentForHtml); HTML templates expect mediaUrls[0] = first content image
  const contentOnlySlots = contentMediaBySlot.slice(1);
  const contentMediaUrls = contentOnlySlots.map((s) => s.currentImageUrl).filter(Boolean) as string[];

  const html = renderAdToHtml(artifact.platform, artifact.templateType, contentForHtml, contentMediaUrls);
  if (!html) return;

  // Overwrite the R2 object at the same storage key
  await uploadContent(attachment.storageKey, html, "text/html");

  // Update attachment size in DB
  const size = Buffer.byteLength(html, "utf-8");
  await db
    .update(attachments)
    .set({ size })
    .where(eq(attachments.id, attachment.id));
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

  await requireWorkspaceAccess(artifact.workspaceId, "admin");

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
