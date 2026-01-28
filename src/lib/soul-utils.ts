import type { WorkspaceSoul } from "./types";

/**
 * Export a WorkspaceSoul configuration as a Markdown string.
 * Used for downloading as a system prompt file.
 */
export function exportSoulAsMarkdown(soul: WorkspaceSoul): string {
  const lines: string[] = [];

  lines.push(`# ${soul.name || "AI Assistant"}`);
  lines.push("");

  if (soul.personality) {
    lines.push("## Personality");
    lines.push(soul.personality);
    lines.push("");
  }

  lines.push("## Communication Style");
  lines.push(`- **Tone:** ${soul.tone}`);
  lines.push(`- **Response Length:** ${soul.responseLength}`);
  lines.push("");

  if (soul.primaryGoals.length > 0) {
    lines.push("## Primary Goals");
    soul.primaryGoals.forEach((goal) => {
      lines.push(`- ${goal}`);
    });
    lines.push("");
  }

  if (soul.domainExpertise.length > 0) {
    lines.push("## Domain Expertise");
    soul.domainExpertise.forEach((expertise) => {
      lines.push(`- ${expertise}`);
    });
    lines.push("");
  }

  if (soul.doRules.length > 0) {
    lines.push("## Do's (Things to Always Do)");
    soul.doRules.forEach((rule) => {
      lines.push(`- ${rule}`);
    });
    lines.push("");
  }

  if (soul.dontRules.length > 0) {
    lines.push("## Don'ts (Things to Avoid)");
    soul.dontRules.forEach((rule) => {
      lines.push(`- ${rule}`);
    });
    lines.push("");
  }

  const terminologyEntries = Object.entries(soul.terminology);
  if (terminologyEntries.length > 0) {
    lines.push("## Terminology");
    terminologyEntries.forEach(([term, definition]) => {
      lines.push(`- **${term}:** ${definition}`);
    });
    lines.push("");
  }

  if (soul.greeting) {
    lines.push("## Custom Greeting");
    lines.push(soul.greeting);
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Create a default WorkspaceSoul with empty/default values.
 */
export function createDefaultSoul(): WorkspaceSoul {
  const now = new Date().toISOString();
  return {
    name: "",
    personality: "",
    primaryGoals: [],
    tone: "friendly",
    responseLength: "moderate",
    domainExpertise: [],
    terminology: {},
    doRules: [],
    dontRules: [],
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}
