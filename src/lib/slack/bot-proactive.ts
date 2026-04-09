/**
 * Proactive follow-up formatter for the Runway Slack bot.
 *
 * After processing a team member's update, the bot checks for stale items
 * on accounts they lead and sends a friendly nudge if any need attention.
 */

import type { StaleAccountItem } from "@/lib/runway/operations";

const MAX_ITEMS = 5;

/**
 * Format a proactive follow-up message for stale items.
 * Returns empty string if no items.
 */
export function formatProactiveFollowUp(
  staleItems: StaleAccountItem[],
  excludeProjectNames?: string[]
): string {
  let items = staleItems;

  // Exclude projects the user just updated in this conversation
  if (excludeProjectNames?.length) {
    const excluded = new Set(excludeProjectNames.map((n) => n.toLowerCase()));
    items = items.filter((i) => !excluded.has(i.projectName.toLowerCase()));
  }

  if (items.length === 0) return "";

  const shown = items.slice(0, MAX_ITEMS);
  const remaining = items.length - shown.length;

  const lines = shown.map((item) => {
    const staleNote = item.staleDays > 0 ? ` (${item.staleDays}d stale)` : "";
    return `- ${item.clientName}: ${item.projectName}${staleNote}`;
  });

  let message = "While I have you -- a few items on your accounts haven't been updated recently:\n\n";
  message += lines.join("\n");

  if (remaining > 0) {
    message += `\n- ...and ${remaining} more`;
  }

  message += "\n\nAny updates on these, or should I leave them as-is?";
  return message;
}
