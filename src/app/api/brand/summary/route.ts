import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { brands } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateBrandSummaryContent } from "@/lib/inngest/functions/brand-summary-generation";

export const maxDuration = 60;

const inputSchema = z.object({
  brandId: z.string(),
});

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { brandId } = inputSchema.parse(body);

    // Get brand and verify ownership
    const brand = await db
      .select()
      .from(brands)
      .where(and(eq(brands.id, brandId), eq(brands.userId, userId)))
      .get();

    if (!brand) {
      return NextResponse.json(
        { error: "Brand not found or access denied" },
        { status: 404 }
      );
    }

    // Use the shared generation function
    const summary = await generateBrandSummaryContent({
      brandName: brand.name,
      websiteUrl: brand.websiteUrl,
      industry: brand.industry,
      tagline: brand.tagline,
      description: brand.description,
    });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Brand summary generation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
