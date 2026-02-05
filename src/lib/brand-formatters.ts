import type { Brand } from "./types";

/**
 * Fields required for building brand system prompts.
 * Uses Pick to allow both full Brand objects and serialized versions from Inngest.
 */
export type BrandPromptInput = Pick<
  Brand,
  "name" | "tagline" | "industry" | "websiteUrl" | "summary"
>;

/**
 * Build a system prompt section from a Brand configuration.
 * Used to inject brand context into AI chat prompts.
 */
export function buildBrandSystemPrompt(brand: BrandPromptInput | null): string {
  if (!brand || !brand.summary) return "";

  const lines: string[] = [];

  lines.push("## Brand Context");
  lines.push("");

  // Brand name
  lines.push(`**Brand:** ${brand.name}`);

  // Tagline (optional)
  if (brand.tagline) {
    lines.push(`**Tagline:** ${brand.tagline}`);
  }

  // Industry (optional)
  if (brand.industry) {
    lines.push(`**Industry:** ${brand.industry}`);
  }

  // Website URL (optional)
  if (brand.websiteUrl) {
    lines.push(`**Website:** ${brand.websiteUrl}`);
  }

  // Summary (required - we checked above)
  lines.push("");
  lines.push("**About the Brand:**");
  lines.push(brand.summary);

  return lines.join("\n");
}
