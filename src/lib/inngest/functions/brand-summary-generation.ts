import { inngest } from "../client";
import { db } from "@/lib/db";
import { brands } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs } from "ai";
import { BRAND_ANALYZER_SKILL } from "@/skills/internal/brand-guidelines-short";

// Use Sonnet for better quality summaries
const GENERATION_MODEL = "claude-sonnet-4-5";

const SUMMARY_PROMPT_NO_WEBSITE = `You are a brand strategist creating a concise summary for AI agents.

Based on the brand information provided, write a brief 1-3 sentence summary that captures:
- What the brand does (core business/product)
- Who they serve (target audience)
- Their value proposition or what makes them unique

This summary will be used as context for AI agents working on marketing content for this brand. Be factual and informative - avoid marketing fluff.

Respond with ONLY the summary text, no quotes, no explanation, no prefix like "Summary:".`;

/**
 * Generate a brand summary using AI
 * This function can be used by both the API route and the Inngest background job
 */
export async function generateBrandSummaryContent(options: {
  brandName: string;
  websiteUrl?: string | null;
  industry?: string | null;
  tagline?: string | null;
  description?: string | null;
}): Promise<string> {
  const { brandName, websiteUrl, industry, tagline, description } = options;

  // Build brand context for generation
  let brandContext = `Brand: ${brandName}`;

  if (industry) {
    brandContext += `\nIndustry: ${industry}`;
  }

  if (tagline) {
    brandContext += `\nTagline: ${tagline}`;
  }

  if (description) {
    brandContext += `\nDescription: ${description}`;
  }

  if (websiteUrl) {
    // Use the brand analyzer skill with web_fetch tool
    // The AI will fetch multiple pages (2-4) and analyze the brand
    const result = await generateText({
      model: anthropic(GENERATION_MODEL),
      system: BRAND_ANALYZER_SKILL,
      messages: [
        {
          role: "user",
          content: `Analyze this brand and produce a brand summary:\n\n${brandContext}\n\nWebsite URL: ${websiteUrl}\n\nOnly respond with the brand summary. This will be displayed to the user so no additional comments are needed.`,
        },
      ],
      tools: {
        web_fetch: anthropic.tools.webFetch_20250910({ maxUses: 5 }),
      },
      // Allow multiple steps for fetching 2-4 pages + final response
      stopWhen: stepCountIs(6),
    });

    return result.text.trim();
  } else {
    // No website - use simple prompt with available brand info
    const result = await generateText({
      model: anthropic(GENERATION_MODEL),
      system: SUMMARY_PROMPT_NO_WEBSITE,
      prompt: brandContext,
    });

    return result.text.trim();
  }
}

export const generateBrandSummary = inngest.createFunction(
  {
    id: "brand-summary-generation",
    name: "Brand Summary Generation",
    retries: 2,
    concurrency: {
      limit: 3,
    },
  },
  { event: "brand/summary.generate" },
  async ({ event, step }) => {
    const { brandId, brandName, websiteUrl, industry, tagline, description } =
      event.data;

    // Step 1: Generate the summary
    const summary = await step.run("generate-summary", async () => {
      return generateBrandSummaryContent({
        brandName,
        websiteUrl,
        industry,
        tagline,
        description,
      });
    });

    // Step 2: Save to database
    const savedResult = await step.run("save-summary", async () => {
      await db
        .update(brands)
        .set({
          summary,
          updatedAt: new Date(),
        })
        .where(eq(brands.id, brandId));

      return { status: "completed", summaryLength: summary.length };
    });

    return savedResult;
  }
);
