import { NextResponse } from "next/server";
import { z } from "zod";
import { generateImage } from "@/lib/services/image-generation";
import { updateAdArtifactMedia, refreshAdAttachment } from "@/lib/actions/ad-artifacts";
import { requireWorkspaceAccess } from "@/lib/actions/workspace";
import { db } from "@/lib/db";
import { adArtifacts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const maxDuration = 60;

type MediaAssetSlot = { storageKey?: string; imageUrls?: string[] };

const generateImageSchema = z
  .object({
    prompt: z.string().min(1),
    aspectRatio: z.string().optional(),
    workspaceId: z.string().min(1).optional(),
    artifactId: z.string().min(1).optional(),
    mediaIndex: z.number().int().min(0).optional(),
  })
  .refine((data) => data.workspaceId ?? data.artifactId, {
    message: "workspaceId or artifactId is required",
  });

function isAccessDenied(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("Access denied") || error.message.includes("not a member"))
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = generateImageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { prompt, aspectRatio, workspaceId, artifactId, mediaIndex = 0 } = parsed.data;

    let effectiveWorkspaceId: string;
    let artifactRow: { workspaceId: string; mediaAssets: string | null } | null = null;

    if (artifactId) {
      const row = await db
        .select({ workspaceId: adArtifacts.workspaceId, mediaAssets: adArtifacts.mediaAssets })
        .from(adArtifacts)
        .where(eq(adArtifacts.id, artifactId))
        .get();
      if (!row) {
        return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
      }
      artifactRow = row;
      await requireWorkspaceAccess(row.workspaceId, "member");
      effectiveWorkspaceId = row.workspaceId;
    } else {
      await requireWorkspaceAccess(workspaceId!, "member");
      effectiveWorkspaceId = workspaceId!;
    }

    const result = await generateImage({
      prompt,
      aspectRatio: aspectRatio ?? "1:1",
      workspaceId: effectiveWorkspaceId,
      artifactId: artifactId ?? crypto.randomUUID(),
      mediaIndex,
    });

    // Persist storageKey to artifact so the image is available on chat reload
    if (artifactId && artifactRow) {
      const assets: MediaAssetSlot[] = artifactRow.mediaAssets
        ? (JSON.parse(artifactRow.mediaAssets) as MediaAssetSlot[])
        : [];
      while (assets.length <= mediaIndex) {
        assets.push({});
      }
      assets[mediaIndex] = { ...assets[mediaIndex], storageKey: result.storageKey };
      await updateAdArtifactMedia(artifactId, JSON.stringify(assets));

      // Refresh the HTML attachment with new media
      refreshAdAttachment(artifactId).catch((err) =>
        console.error("Failed to refresh ad attachment:", err)
      );
    }

    return NextResponse.json({
      url: result.downloadUrl,
      storageKey: result.storageKey,
      prompt: result.prompt,
      aspectRatio: result.aspectRatio,
    });
  } catch (error) {
    if (isAccessDenied(error)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("[generate-image] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
