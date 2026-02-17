import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { knowledgeAssets, workspaceMembers } from "@/lib/db/schema";
import { getCurrentUserId } from "@/lib/auth";
import { getObjectBinary } from "@/lib/storage/r2-client";

interface RouteContext {
  params: Promise<{ assetId: string }>;
}

export async function GET(_req: Request, context: RouteContext) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assetId } = await context.params;
  const asset = await db
    .select()
    .from(knowledgeAssets)
    .where(eq(knowledgeAssets.id, assetId))
    .get();

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const member = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, asset.workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .get();

  if (!member) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const object = await getObjectBinary(asset.storageKey);
  if (!object) {
    return NextResponse.json({ error: "Asset content missing" }, { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": object.contentType,
      "Cache-Control": "private, max-age=300",
    },
  });
}
