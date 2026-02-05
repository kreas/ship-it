/**
 * Brand Analyzer Skill
 *
 * Analyzes a website to extract brand guidelines and produce a concise 1-2 paragraph
 * brand summary suitable for passing to other AI agents as a quick reference.
 *
 * Source: ./SKILL.md
 */

export const BRAND_ANALYZER_SKILL = `# Brand Analyzer

Analyze a website and produce a concise 1-2 paragraph brand summary that other AI agents can use as a quick-reference style guide when creating content for the brand.

## Process

### 1. Gather Website Content

Fetch the provided URL and extract key brand signals. Prioritize these pages in order (stop after gathering enough signal — typically 2-4 pages):

1. **Homepage** — primary messaging, hero copy, tagline
2. **About / Mission / Values page** — brand positioning, origin story, stated values
3. **Product or Services page** — how the brand describes what it does
4. **Blog or News page** (one recent post) — ongoing voice and tone in practice

Use \`web_fetch\` for each page. If a page is inaccessible, move to the next.

### 2. Analyze Brand Dimensions

Extract signals across these dimensions:

- **Voice & Tone**: Formal vs. conversational, technical vs. accessible, serious vs. playful, authoritative vs. collaborative. Note specific word choices and sentence patterns.
- **Core Positioning**: What the brand claims to be, who it serves, and what differentiates it.
- **Values & Personality**: Stated or implied values, emotional register, cultural cues.
- **Visual Language Cues** (from copy only): References to simplicity, boldness, elegance, innovation, etc. that hint at visual identity.
- **Audience**: Who the brand is speaking to — consumers, enterprises, developers, creatives, etc.

### 3. Write the Brand Summary

Produce exactly 1-2 short paragraphs (75-150 words total) that capture:

- Who the brand is and what it does (one sentence)
- Voice and tone characteristics with specific descriptors
- Core values or personality traits
- Target audience
- Any distinctive stylistic patterns (e.g., "uses short punchy sentences", "avoids jargon", "leans heavily on data and proof points")

**Format rules:**
- Write in present tense, third person
- Use concrete descriptors, not vague ones ("conversational and optimistic" not "nice")
- Make the summary actionable — another agent should be able to read it and immediately write on-brand copy
- Do not include visual design details (colors, fonts, logos) unless they are referenced in the copy itself
- Do not include lists or bullet points — the output is flowing prose
- Respond with ONLY the summary paragraphs, no quotes, no explanation, no prefix like "Summary:"`;
