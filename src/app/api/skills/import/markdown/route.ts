import { NextResponse } from "next/server";
import matter from "gray-matter";
import { db } from "@/lib/db";
import { workspaces, workspaceMembers, workspaceSkills } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserId } from "@/lib/auth";

/**
 * Import a skill from pasted markdown content
 */
export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { markdown, workspaceId } = (await req.json()) as {
      markdown: string;
      workspaceId: string;
    };

    if (!markdown || typeof markdown !== "string") {
      return NextResponse.json(
        { error: "Markdown content required" },
        { status: 400 }
      );
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: "Workspace ID required" },
        { status: 400 }
      );
    }

    // Verify workspace exists and user has admin access
    const workspace = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .get();

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    const member = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .get();

    if (!member || member.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Parse the markdown with frontmatter
    const { data, content } = matter(markdown);

    if (!data.name || !data.description) {
      return NextResponse.json(
        {
          error:
            "Markdown must have YAML frontmatter with 'name' and 'description' fields",
        },
        { status: 400 }
      );
    }

    // Generate skill ID and save
    const skillId = crypto.randomUUID();
    const now = new Date();

    const [skill] = await db
      .insert(workspaceSkills)
      .values({
        id: skillId,
        workspaceId,
        name: data.name,
        description: data.description,
        content: content.trim(),
        assets: null,
        isEnabled: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json({
      success: true,
      skill: {
        id: skill.id,
        name: skill.name,
        description: skill.description,
      },
    });
  } catch (error) {
    console.error("Markdown import error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to import skill",
      },
      { status: 500 }
    );
  }
}
