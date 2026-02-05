/**
 * Shared utilities for building contextual system prompts with soul and brand context.
 * Used by all chat API routes to maintain consistent prompt structure.
 */
import type { WorkspaceSoul, Brand } from "@/lib/types";
import { buildSoulSystemPrompt } from "@/lib/soul-utils";
import { buildBrandSystemPrompt } from "@/lib/brand-formatters";

/**
 * Build a system prompt with optional soul and brand context prepended.
 * Context is added before the base prompt with a separator when present.
 *
 * @param basePrompt - The main system prompt for the chat endpoint
 * @param soul - Optional workspace soul configuration
 * @param brand - Optional brand configuration (must have summary to be included)
 * @returns Combined system prompt with context prepended if available
 */
export function buildContextualSystemPrompt(
  basePrompt: string,
  soul: WorkspaceSoul | null,
  brand: Brand | null
): string {
  // Build context parts (soul first, then brand)
  const contextParts: string[] = [];
  if (soul?.name) contextParts.push(buildSoulSystemPrompt(soul));
  if (brand?.summary) contextParts.push(buildBrandSystemPrompt(brand));

  // Prepend context to base prompt with separator if any context exists
  if (contextParts.length > 0) {
    return `${contextParts.join("\n\n")}\n\n---\n\n${basePrompt}`;
  }

  return basePrompt;
}
