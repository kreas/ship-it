import { generateImage } from "@/lib/services/image-generation";
import { updateAdArtifactMedia } from "@/lib/actions/ad-artifacts";
import { db } from "@/lib/db";
import { adArtifacts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const maxDuration = 60;

type MediaAssetSlot = { storageKey?: string; imageUrls?: string[] };

export async function POST(req: Request) {
  try {
    const { prompt, aspectRatio, workspaceId, artifactId, mediaIndex = 0 } =
      await req.json();

    if (!prompt) {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
    }

    // When artifactId is provided, fetch artifact for workspaceId (storage path) and for persisting media
    let artifactRow: { workspaceId: string; mediaAssets: string | null } | null = null;
    if (artifactId) {
      const row = await db
        .select({ workspaceId: adArtifacts.workspaceId, mediaAssets: adArtifacts.mediaAssets })
        .from(adArtifacts)
        .where(eq(adArtifacts.id, artifactId))
        .get();
      artifactRow = row ?? null;
    }

    const effectiveWorkspaceId =
      artifactRow?.workspaceId ?? workspaceId ?? "default";

    const result = await generateImage({
      prompt,
      aspectRatio: aspectRatio || "1:1",
      workspaceId: effectiveWorkspaceId,
      artifactId: artifactId || crypto.randomUUID(),
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
    }

    return Response.json({
      url: result.downloadUrl,
      storageKey: result.storageKey,
      prompt: result.prompt,
      aspectRatio: result.aspectRatio,
    });
  } catch (error) {
    console.error("[generate-image] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate image" },
      { status: 500 }
    );
  }
}
