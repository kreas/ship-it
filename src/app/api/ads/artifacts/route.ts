import {
  createAdArtifact,
  getWorkspaceAdArtifacts,
  getChatAdArtifacts,
  updateAdArtifactMedia,
} from "@/lib/actions/ad-artifacts";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workspaceId, artifact } = body;

    if (!workspaceId || !artifact) {
      return Response.json(
        { error: "workspaceId and artifact are required" },
        { status: 400 }
      );
    }

    const saved = await createAdArtifact({
      workspaceId,
      chatId: artifact.chatId,
      messageId: artifact.messageId,
      platform: artifact.platform || "unknown",
      templateType: artifact.templateType || artifact.type || "unknown",
      name: artifact.name || "Untitled Ad",
      content: typeof artifact.content === "string"
        ? artifact.content
        : JSON.stringify(artifact.content),
      mediaAssets: artifact.mediaUrls
        ? JSON.stringify(artifact.mediaUrls)
        : undefined,
      brandId: artifact.brandId,
    });

    return Response.json({ artifact: saved });
  } catch (error) {
    console.error("[ads/artifacts POST] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to save artifact" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const chatId = searchParams.get("chatId");

    if (chatId) {
      const artifacts = await getChatAdArtifacts(chatId);
      return Response.json({ artifacts });
    }

    if (workspaceId) {
      const artifacts = await getWorkspaceAdArtifacts(workspaceId);
      return Response.json({ artifacts });
    }

    return Response.json(
      { error: "workspaceId or chatId is required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[ads/artifacts GET] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to fetch artifacts" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { artifactId, mediaUrls } = await req.json();

    if (!artifactId || !mediaUrls) {
      return Response.json(
        { error: "artifactId and mediaUrls are required" },
        { status: 400 }
      );
    }

    const updated = await updateAdArtifactMedia(
      artifactId,
      JSON.stringify(mediaUrls)
    );

    if (!updated) {
      return Response.json({ error: "Artifact not found" }, { status: 404 });
    }

    return Response.json({ artifact: updated });
  } catch (error) {
    console.error("[ads/artifacts PATCH] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to update artifact" },
      { status: 500 }
    );
  }
}
