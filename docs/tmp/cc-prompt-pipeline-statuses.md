# CC Prompt: Pipeline Status Overhaul + Bonterra DB Fix

## Context

You are on branch `feature/runway-bot-context`. The pipeline currently has 4 statuses: `sow-sent`, `drafting`, `no-sow`, `verbal`. We're replacing `no-sow` (which implied free work) with a proper SOW lifecycle and adding new statuses.

**Do NOT create a new branch. Stay on `feature/runway-bot-context`.**

---

## The new pipeline status lifecycle

```
scoping → drafting → sow-sent → verbal → signed
                                           ↘
                                        at-risk
```

- **scoping** — figuring out what the work is, pre-SOW. Shouldn't normally appear on the pipeline board — if it does, it was added too early.
- **drafting** — SOW is being written internally (keep existing)
- **sow-sent** — SOW sent to client, waiting on signature (keep existing)
- **verbal** — client agreed verbally, paperwork in motion (keep existing)
- **signed** — SOW signed, work is authorized (NEW)
- **at-risk** — work is happening with no SOW movement, no formal agreement in progress (NEW, replaces `no-sow`)

---

## Step 1: Update pipeline-row.tsx badge styles

**File:** `src/app/runway/components/pipeline-row.tsx`

Replace the `PIPELINE_STATUS` record. Remove `no-sow`. Add `scoping`, `signed`, `at-risk`:

```ts
const PIPELINE_STATUS: Record<string, { label: string; className: string }> = {
  scoping: {
    label: "Scoping",
    className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  },
  drafting: {
    label: "Drafting",
    className: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  },
  "sow-sent": {
    label: "SOW Sent",
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  verbal: {
    label: "Verbal",
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  signed: {
    label: "Signed",
    className: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  },
  "at-risk": {
    label: "At Risk",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};
```

Update `WAITING_STATUSES` to include the right set — `sow-sent` and `verbal` still make sense as "waiting on client" statuses.

**Commit:** `feat: replace no-sow pipeline status with scoping, signed, at-risk`

---

## Step 2: Update schema comment

**File:** `src/lib/db/runway-schema.ts`

Update the comment on the `pipelineItems.status` column from:
```ts
status: text("status"), // sow-sent, drafting, no-sow, verbal
```
to:
```ts
status: text("status"), // scoping, drafting, sow-sent, verbal, signed, at-risk
```

**Same commit as Step 1.**

---

## Step 3: Update types

**File:** `src/app/runway/types.ts`

If there's a PipelineStatus type or any type that references pipeline statuses, update it to include the new values and remove `no-sow`.

**Same commit as Step 1.**

---

## Step 4: Update bot context if pipeline statuses are referenced

**File:** `src/lib/runway/bot-context.ts`

Check if the system prompt mentions pipeline statuses anywhere (e.g., in the glossary or status values section). If so, update to reflect the new lifecycle. The bot should understand:
- "signed" = deal is done
- "at-risk" = work happening without formal agreement
- "scoping" = too early for pipeline, pre-SOW

**Same commit as Step 1 if changes needed.**

---

## Step 5: Update Bonterra pipeline item in DB

Write a small script or add to an existing migration script:

```ts
// Update Bonterra Impact Report SOW from current status to 'signed'
// Match by name: 'Impact Report SOW'
```

Also update the note to: `"SOW signed. Schedule: Copy done, Design done, Dev 4/6-4/22, Handoff 4/28, Publish 5/14."`

Run it: `export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/fix-bonterra-pipeline.ts`

**Commit:** `fix: update Bonterra pipeline to signed status`

---

## Step 6: Update tests

**File:** `src/app/runway/components/status-badge.test.tsx` (or pipeline-row test if it exists)

Update any tests that reference `no-sow` to use `at-risk` instead. Add test cases for `signed`, `scoping`, and `at-risk` badge rendering.

**Commit:** `test: update pipeline status tests for new lifecycle`

---

## Step 7: Update seed script

**File:** `scripts/seed-runway.ts`

If the seed script references `no-sow` anywhere in pipeline data, replace with appropriate status. Also update `src/app/runway/data.ts` if pipeline seed data references old statuses.

**Same commit as Step 6 or separate:** `chore: update seed data with new pipeline statuses`

---

## Summary

- Remove `no-sow` entirely — it never represented a real state
- Add `scoping` (pre-SOW, shouldn't be on board), `signed` (done deal), `at-risk` (danger zone, work without agreement)
- Keep `drafting`, `sow-sent`, `verbal` as-is
- Fix Bonterra to `signed` in live DB
- Update all references: component, schema comment, types, bot context, tests, seed data
