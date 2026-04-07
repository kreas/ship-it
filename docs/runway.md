# Runway System

Civilization Agency's triage board for tracking client work, pipeline, and weekly schedules. Designed for the office TV and web access. Phase 0 of the full PM tool.

## Overview

Runway shows everything in flight on one screen: this week's calendar, project status by account, and unsigned SOWs. Team members update it via Slack DMs to a bot that uses AI to interpret updates and write to the database.

```
Browser (/runway)
  → page.tsx (RSC, queries DB)
    → RunwayBoard (client component, 3 views)

Slack DM
  → /api/slack/events (HMAC verified)
    → Inngest (durable processing)
      → bot.ts (Haiku + tools)
        → operations layer → DB
        → updates channel post

Claude Code / Open Brain
  → /api/mcp/runway (Bearer token)
    → MCP server with tools
      → operations layer → DB
```

## Database

Runway uses a **separate Turso database** (`RUNWAY_DATABASE_URL`), not the main R1 database. Schema is in `src/lib/db/runway-schema.ts`, client factory in `src/lib/db/runway.ts`.

### Tables

| Table | Purpose |
|-------|---------|
| `clients` | Agency clients (Convergix, LPPC, etc.) with contract info |
| `projects` | Work items under each client, with status and category |
| `week_items` | Calendar entries by date, linked to clients |
| `pipeline_items` | Unsigned SOWs and new business, linked to clients |
| `updates` | Audit log of all changes (idempotency-keyed) |
| `team_members` | Civilization team with Slack user IDs |

### Separate Drizzle Config

```bash
pnpm runway:generate  # Generate migrations
pnpm runway:push      # Push schema to Turso
pnpm runway:studio    # Open Drizzle Studio
pnpm runway:seed      # Seed from src/app/runway/data.ts
```

All Runway DB scripts export env vars from `.env.local` because drizzle-kit and tsx don't auto-load it.

## Operations Layer

All database reads and writes go through `src/lib/runway/operations*.ts`. No consumer (MCP tools, bot tools, queries) imports from `@/lib/db/` directly.

| File | Purpose |
|------|---------|
| `operations.ts` | Shared queries (client cache, name map, fuzzy match), utilities (`groupBy`, `matchesSubstring`, `getClientOrFail`), re-exports from split modules |
| `operations-reads.ts` | Read operations: clients with counts, filtered projects (owner/waitingOn), week items, pipeline, person workload |
| `operations-writes.ts` | Status updates with idempotency and audit logging |
| `operations-add.ts` | New projects and free-form updates |
| `operations-context.ts` | Team members (with roleCategory/accountsLed), client contacts, update history |

### Client Cache

`operations.ts` uses a 5-second in-memory cache for client rows to avoid repeated DB round-trips within a single request. The cache expires so concurrent requests don't serve stale data.

### Shared Utilities

`operations.ts` exports helpers used across modules:

- `getClientOrFail(slug)` — looks up client, returns `{ ok, client }` or standard error result (used by writes + add operations)
- `matchesSubstring(value, search)` — case-insensitive substring match (used by read operations for owner/waitingOn filters)
- `groupBy(items, keyFn)` — generic array grouping (used by reads and board queries)
- `clientNotFoundError(slug)` — standard error result for missing clients

### Idempotency

All write operations generate a deterministic idempotency key (SHA-256 hash of operation parts). Duplicate requests return success without writing.

## Reference Data

Static lookup tables for clients and team members, used by the bot system prompt and contact tools. Easier to edit than DB rows.

| File | Purpose |
|------|---------|
| `src/lib/runway/reference/clients.ts` | 13 clients with slugs, nicknames, and contacts |
| `src/lib/runway/reference/team.ts` | 8 team members with roles, accountsLed, titles |
| `src/lib/runway/date-constants.ts` | Shared `DAY_NAMES`, `MONTH_NAMES`, `MONTH_NAMES_SHORT` |

### Client References

Each entry has `slug`, `fullName`, `nicknames[]`, and `contacts[]`. Used by `buildBotSystemPrompt` for the client map section and by the `get_client_contacts` bot tool.

### Team References

Each entry has `fullName`, `firstName`, `nicknames[]`, `roleCategory` (creative/dev/am/pm/leadership/community), `accountsLed[]`, and `title`. Used by the system prompt for the team roster and name disambiguation.

Key disambiguation: "Lane" defaults to Lane Jordan (Creative Director), not Ronan Lane (PM).

## Board UI

Server-rendered page at `/runway` with three client-side views:

| View | Component | Data Source |
|------|-----------|-------------|
| This Week | `TodaySection` + `DayColumn` | `getWeekItems()` split by current week |
| By Account | `AccountSection` | `getClientsWithProjects()` |
| Pipeline | `PipelineRow` | `getPipeline()` |

### Data Flow

```
page.tsx (RSC)
  → Promise.all([getClientsWithProjects(), getWeekItems(), getPipeline()])
  → Splits week items into thisWeek/upcoming by current Monday
  → Maps DB shapes to UI types (src/app/runway/types.ts)
  → RunwayBoard (client component)
    → Pre-computes todayColumn, restOfWeek from thisWeek
    → mergeWeekendDays() combines Sat+Sun into single Weekend column
    → groupByWeek() groups upcoming days under "w/o M/D" headers
    → Tab state selects view
    → Leaf components render data
```

### Auto-Refresh

`RunwayBoard` uses a `useEffect` with `setInterval` to call `router.refresh()` every 5 minutes. This keeps the TV display current without manual browser refresh. The RSC re-fetches all data on refresh.

### Weekend Merge

`mergeWeekendDays(days)` scans for adjacent Saturday + Sunday `DayItem` entries and combines them into a single "Weekend" column. If only one weekend day has items, it passes through unchanged. Applied to both the This Week and Upcoming sections.

### Week Dividers

`groupByWeek(days)` groups upcoming day columns by their week's Monday, rendering each group under an "Upcoming w/o M/D" header (e.g., "Upcoming w/o 4/13"). This visually separates weeks in the Upcoming section.

### Card Hierarchy

`DayItemCard` renders fields in this order: account name (uppercase, prominent), project/task title, owner via `MetadataLabel` (if present), notes. The type tag (delivery, review, kickoff, etc.) appears on the right. Both `sm` (day columns) and `lg` (today section) sizes share the same `ACCOUNT_CLASS` constant for the account label.

### Scroll Constraints

Day columns use `max-h-[60vh] overflow-y-auto` so they scroll internally instead of growing infinitely. The Today section uses `max-h-[70vh]`. This keeps the TV display readable when a day has many items.

### Account View

`AccountSection` shows projects as divider-separated sections (border-t between items) sorted by target date. Key behaviors:

- **Date sorting**: `targetSortKey()` parses `M/D` patterns from free-text target strings. Items with no parseable date sort to the end.
- **Target display**: Target dates are shown via `MetadataLabel` inline with owner and waiting-on fields — no separate short date on the right side.
- **Contract label expansion**: `formatContractTerm()` expands abbreviations (MSA, SOW, NDA) in contract term strings for readability.
- **Graceful nulls**: Missing `contractValue` or `contractTerm` fields are simply not rendered (no empty elements).

### Pipeline View

`PipelineRow` displays unsigned SOWs with these behaviors:

- **Status labels**: `no-sow` displays as "Drafting" (same label as `drafting`, different color). `sow-sent` displays as "SOW Sent", `verbal` as "Verbal".
- **Waiting on fallback**: `getWaitingOnDisplay()` returns the explicit `waitingOn` name if set. For `sow-sent` and `verbal` statuses without a name, falls back to "Client". Other statuses show nothing.
- **Next Steps prefix**: Notes are shown with a "Next Steps:" label prefix.

### Shared Display Components

`status-badge.tsx` exports reusable badge and label components:

- `StatusBadge` — project status (in-production, blocked, etc.)
- `ContractBadge` — contract state (expired, unsigned)
- `StaleBadge` — stale-days indicator
- `MetadataLabel` — "Label: Value" pattern with configurable color (used by AccountSection, PipelineRow, and DayItemCard)

### Blocked Override

`DayItemCard` uses `getEffectiveType(item)` to override the display type to `"blocked"` (red) when notes contain hold/blocked language ("holds until", "on hold", "blocked", "not starting until"). This prevents items like "AARP API meeting" from showing as KICKOFF when they're actually held pending SOW signature.

### Types

UI types are in `src/app/runway/types.ts`. DB types are inferred from Drizzle schema. `page.tsx` maps between them to keep schema imports out of client components.

## MCP Server

Documented in [MCP Integration](./mcp-integration.md#standalone-mcp-servers-runway). Bearer token auth at `POST /api/mcp/runway`. 11 tools wrapping the operations layer (includes `get_person_workload` for cross-client workload queries).

## Slack Bot

### Flow

1. Team member DMs the bot (text and/or images)
2. `POST /api/slack/events` verifies HMAC signature, extracts image file metadata, dispatches to Inngest
3. Inngest function (`runway/slack.message`) downloads images via Slack API (with `Promise.allSettled` for graceful failure), then calls `handleDirectMessage`
4. `handleDirectMessage` builds a dynamic system prompt via `buildBotSystemPrompt`, sends text + images as AI SDK content blocks to Haiku with 8 tools
5. Bot responds in thread, posts formatted update to updates channel

### Dynamic System Prompt

`src/lib/runway/bot-context.ts` builds a context-rich prompt with 10 sections:

1. Core rules (status values, update workflow)
2. Date context (today, this week's Monday, yesterday, tomorrow)
3. Identity context (who's talking — name, role, accounts led)
4. Team roster (all members with roles and accounts)
5. Client map (nicknames, slugs, contacts)
6. Natural language glossary ("out the door" = delivered, "sitting on it" = awaiting client, etc.)
7. Role-based behavior (AM vs creative vs PM query interpretation)
8. Proactive behavior (suggest related updates, flag contradictions)
9. Tone rules (no AI voice, acknowledge frustration)
10. Unsupported features (graceful handling of availability, reminders)

The prompt is built per-message using the team member's record from the DB and the current date. Unknown Slack users get a null record and the bot asks who they are.

### Image Attachments

When a user sends images in a DM:

1. `route.ts` extracts `event.files`, filters to `image/*` mimetypes
2. Messages with only images (no text) are dispatched normally
3. Inngest downloads each image using `SLACK_BOT_TOKEN` auth, converts to base64
4. Failed downloads are skipped gracefully (`Promise.allSettled`)
5. `bot.ts` sends images as AI SDK `ImagePart` content blocks alongside text

### Bot Tools

Defined in `src/lib/slack/bot-tools.ts`. Same operations as MCP but wrapped as AI SDK `tool()` calls with `postUpdate` side effect:

| Tool | Purpose |
|------|---------|
| `get_clients` | List clients with project counts |
| `get_projects` | List projects filtered by client, owner, or waitingOn |
| `get_pipeline` | List unsigned SOWs |
| `get_week_items` | Calendar items for a week, optionally filtered by owner |
| `get_person_workload` | Cross-client view of a person's projects and week items |
| `get_client_contacts` | Contact names and roles for a client (from reference data) |
| `update_project_status` | Change status + post to updates channel |
| `add_update` | Log free-form update + post to updates channel |

### Updates Channel

`src/lib/slack/updates-channel.ts` posts formatted messages:

```
*Convergix*
_Project:_ CDS Messaging
_Update:_ In Production -> Sent to Client
_Updated by:_ Kathy Horn, Apr. 5 2026 at 10:14 AM
```

### Security

- **Signature verification**: `src/lib/slack/verify.ts` uses `crypto.timingSafeEqual` for HMAC-SHA256
- **Replay protection**: Rejects timestamps older than 5 minutes
- **Bot loop prevention**: Ignores messages with `bot_id` or `subtype`

## Inngest

The Slack bot uses Inngest for durable processing so the webhook can respond within Slack's 3-second timeout.

```typescript
// src/lib/inngest/functions/runway-slack-message.ts
export const processRunwaySlackMessage = inngest.createFunction(
  { id: "runway-slack-message", retries: 2, concurrency: { limit: 3 } },
  { event: "runway/slack.message" },
  async ({ event, step }) => {
    const { slackUserId, channelId, messageText, messageTs, imageFiles } = event.data;

    // Download images (graceful failure via Promise.allSettled)
    const images = await step.run("download-images", async () => { /* ... */ });

    // Process message with text + images
    await step.run("process-message", async () => {
      await handleDirectMessage(slackUserId, channelId, messageText, messageTs, images);
    });
  },
);
```

Requires `pnpm dev:inngest` (or `pnpm dev:all`) running alongside the dev server.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `RUNWAY_DATABASE_URL` | Turso connection URL |
| `RUNWAY_AUTH_TOKEN` | Turso auth token |
| `RUNWAY_MCP_API_KEY` | Bearer token for MCP endpoint |
| `SLACK_BOT_TOKEN` | Slack app bot token |
| `SLACK_SIGNING_SECRET` | HMAC signing secret |
| `SLACK_UPDATES_CHANNEL_ID` | Channel for update logs |

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/db/runway-schema.ts` | Database schema (6 tables) |
| `src/lib/db/runway.ts` | Database client factory |
| `src/lib/runway/operations.ts` | Shared operations entry point + utilities |
| `src/lib/runway/bot-context.ts` | Dynamic system prompt builder (10 sections) |
| `src/lib/runway/date-constants.ts` | Shared date formatting constants |
| `src/lib/runway/reference/clients.ts` | Client reference data (nicknames, contacts) |
| `src/lib/runway/reference/team.ts` | Team reference data (roles, accounts led) |
| `src/lib/mcp/runway-server.ts` | MCP server factory |
| `src/lib/mcp/runway-tools.ts` | MCP tool registrations (11 tools) |
| `src/app/api/mcp/runway/route.ts` | MCP HTTP endpoint |
| `src/app/api/slack/events/route.ts` | Slack webhook handler (text + images) |
| `src/lib/slack/bot.ts` | AI bot orchestration (text + image content blocks) |
| `src/lib/slack/bot-tools.ts` | Bot tool definitions (8 tools) |
| `src/lib/slack/verify.ts` | Slack signature verification |
| `src/lib/slack/updates-channel.ts` | Updates channel posting |
| `src/app/runway/page.tsx` | Board page (RSC, data transformation) |
| `src/app/runway/runway-board.tsx` | Board client component (3 views) |
| `src/app/runway/queries.ts` | Board-specific DB queries |
| `src/app/runway/date-utils.ts` | `parseISODate`, `getMonday`, `getMondayISODate` |
| `src/app/runway/components/day-item-card.tsx` | Card component (account-first hierarchy, blocked override) |
| `src/app/runway/components/status-badge.tsx` | Shared badge and label components |
| `src/app/runway/data.ts` | Seed data (13 clients, typed exports) |
| `scripts/seed-runway.ts` | Seed script (imports from date-utils) |

## Related Documentation

- [MCP Integration](./mcp-integration.md#standalone-mcp-servers-runway) - MCP server details
- [AI SDK Integration](./ai-sdk.md) - How `generateText` and tools work
