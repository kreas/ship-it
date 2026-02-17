import { generateImage } from "@/lib/services/image-generation";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { prompt, aspectRatio, workspaceId, artifactId } = await req.json();

    if (!prompt) {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
    }

    const result = await generateImage({
      prompt,
      aspectRatio: aspectRatio || "1:1",
      workspaceId: workspaceId || "default",
      artifactId: artifactId || crypto.randomUUID(),
    });

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
