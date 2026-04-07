# CC Prompt: Owner/Resource Separation + Data Update

## Context

You are on branch `feature/runway-bot-context` in the Runway project. Runway is a triage board for Civilization Agency. This prompt adds a `resources` column to separate "who owns delivery" from "who is doing the work," updates all week item data from a triaged CSV, adds contractor team members, updates bot tools and UI to reflect the new model, and syncs the seed script.

**Read these files before starting:** `docs/brain/brain-RULES.md`, `docs/ai-development-workflow.md`

**Branch:** `feature/runway-bot-context` (do NOT create a new branch)

**Tests:** Write tests alongside each step, not at the end. Run `pnpm test:run` after each step.

---

## Step 1: Schema — Add `resources` column to weekItems and projects, add `owner` to pipelineItems

**File:** `src/lib/db/runway-schema.ts`

Add to `weekItems` table (after the existing `owner` column):
```ts
resources: text("resources"), // comma-separated list of people doing the work
```

Add to `projects` table (after the existing `owner` column):
```ts
resources: text("resources"), // comma-separated list of people doing the work
```

Add to `pipelineItems` table (after `name`):
```ts
owner: text("owner"),
```

Then push the schema:
```bash
export $(grep -v '^#' .env.local | xargs) && pnpm db:push
```

If `db:push` doesn't exist, use: `npx drizzle-kit push --config=drizzle-runway.config.ts`

**Commit:** `feat: add resources column to weekItems and projects, owner to pipelineItems`

---

## Step 2: Update types

**File:** `src/app/runway/types.ts`

Add `resources?: string` wherever `owner` exists in the relevant types (DayItemEntry, TriageItem, etc.). Don't break existing interfaces — resources is optional.

**Commit:** `chore: add resources to Runway types`

---

## Step 3: Update all 39 week items from triaged CSV

**Important:** Do NOT change any dates. Only update title, owner, resources, and notes.

Write a migration script at `scripts/update-week-items.ts` that updates each week item by matching on the ORIGINAL title (before your changes). The script should:

1. Load env vars: `import 'dotenv/config'` or use the pattern from seed-runway.ts
2. For each item, find by original title, then update title, owner, resources, notes

Here is the complete data. Original title → new values:

```
"CDS Messaging & Pillars R1" → title: "CDS Messaging & Pillars R1 (Gate for all CDS content)", owner: "Kathy", resources: "Kathy, Lane", notes: "Next Step: R1 goes to Daniel Tue 4/7."
"CDS Creative Wrapper R1" → owner: "Kathy", resources: "Roz", notes: "Next Step: Design Creative Wrapper - Due 4/7"
"New Capacity — JJ Revisions" → owner: "Kathy", resources: "Roz", notes: "Next Step: Creative to lay in JJ feedback, 2 slides left"
"Events Page — Kathy starts copy" → title: "Events Page Copy", owner: "Kathy", resources: "Kathy", notes: "Next Step: Write Copy. AIST first week of May most urgent"
"Social: Slack Daniel for 4/7-4/9 approvals" → title: "Social Post Approval", owner: "Kathy", resources: "Ronan", notes: "Next Step: Slack Daniel for 4/7-4/9 approvals"
"Chase Daniel: Rockwell + TI articles" → title: "Rockwell + TI Articles", owner: "Kathy", resources: "Kathy", notes: "Next Step: Follow up with Daniel"
"AARP API meeting" → owner: "Jill", resources: "Josefina", notes: "Next Step: Blocked - On Hold until SOW signed"
"AARP Creative KO" → owner: "Jill", resources: "Lane", notes: "Next Step: Blocked - On Hold until SOW signed"
"TAP Travel Invoice — Allie to send" → title: "TAP Travel Invoice", owner: "Jason", resources: "Allie", notes: "Next Step: Allie to send Travel Actuals to Client"
"CDS Messaging R1 to Daniel" → title: "CDS Messaging", owner: "Kathy", resources: "Kathy", notes: "Next Step: Send R1 to Daniel to review, feedback by 4/11"
"New Capacity — deliver to JJ" → title: "New Capacity Content", owner: "Kathy", resources: "Roz", notes: "Next Step: Deliver to JJ"
"LPPC copy expected (Permitting + FEMA)" → owner: "Ronan", resources: "Lane, Leslie", notes: "Next Step: Design + dev starts after copy arrives"
"TAP Requirements Doc (SRD) to client" → title: "Route TAP Requirements Doc", owner: "Jason", resources: "Tim", notes: "Next Step: Tim merging two versions into final, deliver to Kim"
"Social designs back from Roz" → title: "Route Social designs", owner: "Kathy", resources: "Roz", notes: "Next Step: Show client on Thursday status review"
"New Capacity finalizes → Brand Guide v2 unblocked" → title: "New Capacity", owner: "Kathy", resources: "Lane", notes: "Next Step: Finalize then → Brand Guide v2 unblocked"
"Events Page copy to Leslie" → title: "Copy Updates for Events Page", owner: "Kathy", resources: "Kathy, Leslie", notes: "Next Step: Kathy writing Mon-Wed, handoff to Leslie to lay into Dev"
"Bonterra — Paige presenting designs" → owner: "Jill", resources: "Paige", notes: "Next Step: Impact Report design presentation"
"HDL Site Copy Review" → owner: "Jill", resources: "Chris", notes: "Next Step: HDL to review site copy (Risk: Very behind schedule, blocking delivery)"
"Weekly Status Call" → title: "Raise stale items: Corp Brochure, Life Sci, Templates, Playbook", owner: "Kathy", resources: "Ronan", notes: "Next Step: After status call with client, what is the update on these?"
"Social posts reviewed at status" → owner: "Ronan", resources: "Roz", notes: "Next Step: Awaiting client approval"
"Daniel feedback deadline on CDS Messaging" → owner: "Kathy", resources: "Kathy", notes: "Next Step: Awaiting copy approval (Risk: Daniel may miss Friday — follow up Monday 4/6 if needed)"
"Bonterra approval needed" → owner: "Jill", resources: "Lane", notes: "Next Step: Client feedback on Impact Report designs. Dev window starts after approval."
"LPPC Map R2" → owner: "Ronan", resources: "Roz, Leslie", notes: "Next Step: Implement feedback based on minor R1 feedback"
"CDS Messaging R2 (if feedback received)" → owner: "Kathy", resources: "Kathy", notes: "Next Step: Write Copy (Risk: Waiting on Feedback)"
"HDL Full Site Design — Civ delivers" → owner: "Jill", resources: "Lane", notes: "Next Step: Civilization delivers full site design (Risk: Blocked by copy edits)"
"HDL Photo Shoot Prep" → owner: "Jill", resources: "Unknown", notes: "Next Step: Production book + shot list (Risk: Shoot in May, outside SOW Timeline)"
"Fanuc Award Article enters schedule" → owner: "Kathy", resources: "Lane, Kathy", notes: "Next Step: Write article (Risk: event is 4/28)"
"CDS Social Posts KO" → owner: "Kathy", resources: "Kathy, Lane", notes: "Next Step: Waiting on messaging to be approved."
"Soundly iFrame launch (evening)" → owner: "Jill", resources: "Leslie", notes: "Next Step: Waiting on client for feedback. Goes Live 4/22 (Risk: On UHG timeline)"
"HDL Full Site Design Approval" → owner: "Jill", resources: "Chris, Lane, Leslie", notes: "Next Step: Lock on copy and move to development"
"Bonterra Impact Report — code handoff" → owner: "Jill", resources: "Leslie", notes: "Next Step: Impact Report K/O to Dev (Risk: Hard client deadline. Client was 3 weeks late on content)"
"CDS Landing Page KO" → owner: "Kathy", resources: "Lane", notes: "Next Step: Kick of Landing Page (Risk: If messaging is approved)"
"Disconnect Google Sheet from Dave ManyChat" → owner: "Jason", resources: "Jason", notes: "Next Step: Disconnect Drive integration from Dave's ManyChat"
"Hopdoddy Brand Refresh Website launch" → owner: "Ronan", resources: "Leslie", notes: "Next Step: Launch Hopdoddy Brand Refresh updates (Risk: Hard deadline for National Burger Day)"
"HDL Start Development" → owner: "Jill", resources: "Leslie", notes: "Next Step: Development K/O (Risk: Blocked by design approval)"
"LPPC Map + Website Launch" → owner: "Ronan", resources: "Leslie", notes: "Next Step: Launch LPPC Map + Website"
"AIST tradeshow (Convergix)" → title: "AIST tradeshow", owner: "Kathy", resources: "Leslie", notes: "Next Step: Launch Events page (Risk: must be live by ???)"
"CDS Case Study + Brochure KO" → owner: "Kathy", resources: "Lane", notes: "Next Step: Kickoff Creative (Risk: If messaging approved)"
"Bonterra Impact Report — publish" → title: "Bonterra Impact Report — Go Live", owner: "Jill", resources: "Leslie", notes: "Next Step: Launch Impact Report (Risk: tight given compressed timeline)"
```

Run the script: `export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/update-week-items.ts`

Verify by querying: confirm all 39 items have owner and resources populated, and titles match.

**Commit:** `chore: update week items with owner/resource separation and cleaned titles`

---

## Step 4: Add contractor role category and new team members

**File:** `src/lib/runway/reference/team.ts`

Add `"contractor"` to the `RoleCategory` type union.

Add two new entries to `TEAM_REFERENCES`:
```ts
{
  fullName: "Chris",
  firstName: "Chris",
  nicknames: [],
  slackUserId: "",
  roleCategory: "contractor",
  accountsLed: [],
  title: "Copywriter (HDL)",
},
{
  fullName: "Josefina",
  firstName: "Josefina",
  nicknames: [],
  slackUserId: "",
  roleCategory: "contractor",
  accountsLed: [],
  title: "Contractor (Soundly)",
},
```

**File:** `src/lib/db/runway-schema.ts` — update the roleCategory comment to include `contractor`.

**Commit:** `feat: add contractor role category, add Chris and Josefina to team reference`

---

## Step 5: Update bot tools for owner vs resource filtering

**File:** `src/lib/slack/bot-tools.ts`

Update `get_week_items` tool:
- Add a `resource` parameter (optional string, same pattern as owner)
- Description: "Filter by resource name (person doing the work)"

Update `get_person_workload` tool description to clarify it searches both owner and resource fields.

**File:** `src/lib/runway/operations-reads.ts`

Update `getWeekItemsData`:
- Accept optional `resource` parameter
- If provided, filter items where `matchesSubstring(item.resources, resource)` is true
- Keep existing owner filter working independently

Update `getPersonWorkload`:
- Search both `owner` and `resources` fields for matching week items (union, not intersection)
- Search both `owner` and `resources` fields for matching projects

**File:** `src/lib/runway/bot-context.ts`

Update the query recipes section:
- "what am I working on today" / "what's on my plate today": Call get_week_items with **resource** = the person's name (they want tasks they're doing)
- "what am I responsible for" / "what do I own": Call get_week_items with **owner** = the person's name (they want tasks they're accountable for)
- Keep existing recipes, just clarify the distinction

**Write tests** for the updated operations-reads functions covering:
- Filter by owner only returns items where owner matches
- Filter by resource only returns items where resources field contains the name
- Filter by both owner and resource
- getPersonWorkload finds items where person is owner OR resource

**Commit:** `feat: bot tools support owner vs resource filtering`

---

## Step 6: Update UI cards — resources prominent, owner muted

**File:** `src/app/runway/components/day-item-card.tsx`

Update the card layout hierarchy:
1. Account (small caps, existing)
2. Title
3. Resources (regular weight text, use MetadataLabel with label "Resources")
4. Notes (if any — and if note starts with "Next Step:", render "Next Step:" as a label with the rest as value)
5. Owner (muted/light text, use MetadataLabel with label "Owner", add `text-muted-foreground` or equivalent)

If resources equals owner (single person doing their own work), just show owner — don't duplicate.

Handle "(Risk: ...)" in notes: if the note contains "(Risk:", extract it and render with a warning color (amber/yellow text).

**File:** `src/app/runway/components/account-section.tsx`

In the ProjectCard subcomponent, add resources display. Same hierarchy: resources prominent, owner muted. Show resources if they differ from owner.

**File:** `src/app/runway/components/pipeline-row.tsx`

Add owner display to pipeline rows. Owner should appear as muted metadata, similar to waitingOn and nextSteps. The pipeline already has waitingOn and notes/nextSteps — just add owner in the metadata area.

**File:** `src/app/runway/queries.ts`

Update `getWeekItems` return mapping to include `resources` field from the weekItems table.
Update `getClientsWithProjects` to pass through `resources` from projects.

**File:** `src/app/runway/types.ts`

Ensure `DayItemEntry` and other view types include `resources?: string`.

**Commit:** `feat: UI cards show resources prominently, owner muted`

---

## Step 7: Update seed script

**File:** `scripts/seed-runway.ts`

Update the team members seed data to include:
- All Slack IDs from `src/lib/runway/reference/team.ts` (Kathy: U11NL4SBS, Jason: U1HH41TFX, Jill: U08TZ6ZDEUF, Allison: U06BA311N92, Lane: U03F7MED8F8, Leslie: U01LJGMC1GV, Sami: U0AFM4FG87P, Tim: U016N17D9KR)
- Tim Warren as a team member (title: "Director of AI", roleCategory: "dev")
- Updated titles for all members matching team.ts
- Chris and Josefina as contractors

Update the weekItems seeding to include the `resources` field from `src/app/runway/data.ts`.

Update `src/app/runway/data.ts` to include `resources` in the thisWeek and upcoming data arrays, matching the triaged CSV data.

**Commit:** `chore: sync seed script with Slack IDs, team data, and resources`

---

## Step 8: Run full test suite

```bash
pnpm test:run
```

Fix any failures. All existing tests must pass. New tests from Step 5 must pass.

**Commit (if needed):** `fix: test adjustments for owner/resource separation`

---

## Summary of commits (7-8 atomic commits):

1. `feat: add resources column to weekItems and projects, owner to pipelineItems`
2. `chore: add resources to Runway types`
3. `chore: update week items with owner/resource separation and cleaned titles`
4. `feat: add contractor role category, add Chris and Josefina to team reference`
5. `feat: bot tools support owner vs resource filtering`
6. `feat: UI cards show resources prominently, owner muted`
7. `chore: sync seed script with Slack IDs, team data, and resources`
8. `fix: test adjustments for owner/resource separation` (if needed)

## Important reminders

- Do NOT change any dates on week items
- Do NOT create a new branch — stay on `feature/runway-bot-context`
- Tests are part of each step, not a separate step
- Use `matchesSubstring` for filtering — it already handles comma-separated values via `includes()`
- Run `pnpm test:run` after each step
- Push schema changes to DB before running the update script
- The CSV file is at `docs/tmp/week-items-triage.csv` for reference
