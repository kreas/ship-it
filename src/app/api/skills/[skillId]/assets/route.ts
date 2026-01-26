import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workspaceSkills, workspaceMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";
import { generateDownloadUrl } from "@/lib/storage/r2-client";
import type { SkillAsset } from "@/lib/types";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ skillId: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { skillId } = await params;

    // Get the skill
    const skill = await db
      .select()
      .from(workspaceSkills)
      .where(eq(workspaceSkills.id, skillId))
      .get();

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    // Verify user has access to this workspace
    const member = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, skill.workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .get();

    if (!member) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Parse assets and generate download URLs
    if (!skill.assets) {
      return NextResponse.json({ assets: [] });
    }

    const assets: SkillAsset[] = JSON.parse(skill.assets);
    const assetsWithUrls = await Promise.all(
      assets.map(async (asset) => ({
        ...asset,
        downloadUrl: await generateDownloadUrl(asset.storageKey),
      }))
    );

    return NextResponse.json({ assets: assetsWithUrls });
  } catch (error) {
    console.error("Error fetching skill assets:", error);
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 }
    );
  }
}
