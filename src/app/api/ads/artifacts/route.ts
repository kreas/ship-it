import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createAdArtifact,
  getWorkspaceAdArtifacts,
  getChatAdArtifacts,
  updateAdArtifactMedia,
} from "@/lib/actions/ad-artifacts";
import { requireWorkspaceAccess } from "@/lib/actions/workspace";
import { getWorkspaceBrand } from "@/lib/actions/brand";
import { mergeWorkspaceBrandIntoContent } from "@/lib/ads/merge-workspace-brand";

const postArtifactSchema = z.object({
  workspaceId: z.string().min(1),
  artifact: z.object({
    chatId: z.string().optional(),
    messageId: z.string().optional(),
    platform: z.string().optional(),
    templateType: z.string().optional(),
    type: z.string().optional(),
    name: z.string().optional(),
    content: z.union([z.string(), z.record(z.unknown())]),
    mediaUrls: z.array(z.unknown()).optional(),
    brandId: z.string().optional(),
  }),
});

const getQuerySchema = z
  .object({
    workspaceId: z.string().min(1).optional(),
    chatId: z.string().min(1).optional(),
  })
  .refine((data) => data.workspaceId ?? data.chatId, {
    message: "workspaceId or chatId is required",
  });

const patchArtifactSchema = z.object({
  artifactId: z.string().min(1),
  mediaUrls: z.array(z.unknown()),
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
    const parsed = postArtifactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { workspaceId, artifact } = parsed.data;
    await requireWorkspaceAccess(workspaceId, "member");

    const platform = artifact.platform || "unknown";
    const templateType = artifact.templateType || artifact.type || "unknown";
    let content = artifact.content;
    const brand = await getWorkspaceBrand(workspaceId);
    if (brand) {
      const contentObj =
        typeof content === "string" ? (JSON.parse(content) as Record<string, unknown>) : { ...content };
      const merged = mergeWorkspaceBrandIntoContent(
        contentObj,
        {
          name: brand.name,
          resolvedLogoUrl: brand.resolvedLogoUrl ?? null,
          websiteUrl: brand.websiteUrl ?? null,
          primaryColor: brand.primaryColor ?? null,
        },
        platform,
        templateType
      );
      content = JSON.stringify(merged);
    } else if (typeof content !== "string") {
      content = JSON.stringify(content);
    }

    const saved = await createAdArtifact({
      workspaceId,
      chatId: artifact.chatId,
      messageId: artifact.messageId,
      platform: artifact.platform || "unknown",
      templateType: artifact.templateType || artifact.type || "unknown",
      name: artifact.name || "Untitled Ad",
      content,
      mediaAssets: artifact.mediaUrls
        ? JSON.stringify(artifact.mediaUrls)
        : undefined,
      brandId: artifact.brandId,
    });

    return NextResponse.json({ artifact: saved });
  } catch (error) {
    if (isAccessDenied(error)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("[ads/artifacts POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to save artifact" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = {
      workspaceId: searchParams.get("workspaceId") ?? undefined,
      chatId: searchParams.get("chatId") ?? undefined,
    };
    const parsed = getQuerySchema.safeParse(query);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { workspaceId, chatId } = parsed.data;

    if (workspaceId) {
      await requireWorkspaceAccess(workspaceId, "member");
      const artifacts = await getWorkspaceAdArtifacts(workspaceId);
      return NextResponse.json({ artifacts });
    }

    const artifacts = await getChatAdArtifacts(chatId!);
    return NextResponse.json({ artifacts });
  } catch (error) {
    if (isAccessDenied(error)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("[ads/artifacts GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch artifacts" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const parsed = patchArtifactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { artifactId, mediaUrls } = parsed.data;

    const updated = await updateAdArtifactMedia(
      artifactId,
      JSON.stringify(mediaUrls)
    );

    if (!updated) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    return NextResponse.json({ artifact: updated });
  } catch (error) {
    if (isAccessDenied(error)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    console.error("[ads/artifacts PATCH] Error:", error);
    return NextResponse.json(
      { error: "Failed to update artifact" },
      { status: 500 }
    );
  }
}
