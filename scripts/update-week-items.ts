/**
 * Update week items with owner/resource separation from triaged CSV.
 *
 * Usage: export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/update-week-items.ts
 */

import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { loadEnvLocal } from "./lib/load-env";

loadEnvLocal();

import { weekItems } from "../src/lib/db/runway-schema";

const url = process.env.RUNWAY_DATABASE_URL ?? "file:runway-local.db";
const client = createClient({ url, authToken: process.env.RUNWAY_AUTH_TOKEN });
const db = drizzle(client);

interface UpdateSpec {
  originalTitle: string;
  newTitle?: string;
  owner: string;
  resources: string;
  notes: string;
}

const UPDATES: UpdateSpec[] = [
  { originalTitle: "CDS Messaging & Pillars R1", newTitle: "CDS Messaging & Pillars R1 (Gate for all CDS content)", owner: "Kathy", resources: "Kathy, Lane", notes: "Next Step: R1 goes to Daniel Tue 4/7." },
  { originalTitle: "CDS Creative Wrapper R1", owner: "Kathy", resources: "Roz", notes: "Next Step: Design Creative Wrapper - Due 4/7" },
  { originalTitle: "New Capacity — JJ Revisions", owner: "Kathy", resources: "Roz", notes: "Next Step: Creative to lay in JJ feedback, 2 slides left" },
  { originalTitle: "Events Page — Kathy starts copy", newTitle: "Events Page Copy", owner: "Kathy", resources: "Kathy", notes: "Next Step: Write Copy. AIST first week of May most urgent" },
  { originalTitle: "Social: Slack Daniel for 4/7-4/9 approvals", newTitle: "Social Post Approval", owner: "Kathy", resources: "Ronan", notes: "Next Step: Slack Daniel for 4/7-4/9 approvals" },
  { originalTitle: "Chase Daniel: Rockwell + TI articles", newTitle: "Rockwell + TI Articles", owner: "Kathy", resources: "Kathy", notes: "Next Step: Follow up with Daniel" },
  { originalTitle: "AARP API meeting", owner: "Jill", resources: "Josefina", notes: "Next Step: Blocked - On Hold until SOW signed" },
  { originalTitle: "AARP Creative KO", owner: "Jill", resources: "Lane", notes: "Next Step: Blocked - On Hold until SOW signed" },
  { originalTitle: "TAP Travel Invoice — Allie to send", newTitle: "TAP Travel Invoice", owner: "Jason", resources: "Allie", notes: "Next Step: Allie to send Travel Actuals to Client" },
  { originalTitle: "CDS Messaging R1 to Daniel", newTitle: "CDS Messaging", owner: "Kathy", resources: "Kathy", notes: "Next Step: Send R1 to Daniel to review, feedback by 4/11" },
  { originalTitle: "New Capacity — deliver to JJ", newTitle: "New Capacity Content", owner: "Kathy", resources: "Roz", notes: "Next Step: Deliver to JJ" },
  { originalTitle: "LPPC copy expected (Permitting + FEMA)", owner: "Ronan", resources: "Lane, Leslie", notes: "Next Step: Design + dev starts after copy arrives" },
  { originalTitle: "TAP Requirements Doc (SRD) to client", newTitle: "Route TAP Requirements Doc", owner: "Jason", resources: "Tim", notes: "Next Step: Tim merging two versions into final, deliver to Kim" },
  { originalTitle: "Social designs back from Roz", newTitle: "Route Social designs", owner: "Kathy", resources: "Roz", notes: "Next Step: Show client on Thursday status review" },
  { originalTitle: "New Capacity finalizes → Brand Guide v2 unblocked", newTitle: "New Capacity", owner: "Kathy", resources: "Lane", notes: "Next Step: Finalize then → Brand Guide v2 unblocked" },
  { originalTitle: "Events Page copy to Leslie", newTitle: "Copy Updates for Events Page", owner: "Kathy", resources: "Kathy, Leslie", notes: "Next Step: Kathy writing Mon-Wed, handoff to Leslie to lay into Dev" },
  { originalTitle: "Bonterra — Paige presenting designs", owner: "Jill", resources: "Paige", notes: "Next Step: Impact Report design presentation" },
  { originalTitle: "HDL Site Copy Review", owner: "Jill", resources: "Chris", notes: "Next Step: HDL to review site copy (Risk: Very behind schedule, blocking delivery)" },
  { originalTitle: "Weekly Status Call", newTitle: "Raise stale items: Corp Brochure, Life Sci, Templates, Playbook", owner: "Kathy", resources: "Ronan", notes: "Next Step: After status call with client, what is the update on these?" },
  { originalTitle: "Social posts reviewed at status", owner: "Ronan", resources: "Roz", notes: "Next Step: Awaiting client approval" },
  { originalTitle: "Daniel feedback deadline on CDS Messaging", owner: "Kathy", resources: "Kathy", notes: "Next Step: Awaiting copy approval (Risk: Daniel may miss Friday — follow up Monday 4/6 if needed)" },
  { originalTitle: "Bonterra approval needed", owner: "Jill", resources: "Lane", notes: "Next Step: Client feedback on Impact Report designs. Dev window starts after approval." },
  { originalTitle: "LPPC Map R2", owner: "Ronan", resources: "Roz, Leslie", notes: "Next Step: Implement feedback based on minor R1 feedback" },
  { originalTitle: "CDS Messaging R2 (if feedback received)", owner: "Kathy", resources: "Kathy", notes: "Next Step: Write Copy (Risk: Waiting on Feedback)" },
  { originalTitle: "HDL Full Site Design — Civ delivers", owner: "Jill", resources: "Lane", notes: "Next Step: Civilization delivers full site design (Risk: Blocked by copy edits)" },
  { originalTitle: "HDL Photo Shoot Prep", owner: "Jill", resources: "Unknown", notes: "Next Step: Production book + shot list (Risk: Shoot in May, outside SOW Timeline)" },
  { originalTitle: "Fanuc Award Article enters schedule", owner: "Kathy", resources: "Lane, Kathy", notes: "Next Step: Write article (Risk: event is 4/28)" },
  { originalTitle: "CDS Social Posts KO", owner: "Kathy", resources: "Kathy, Lane", notes: "Next Step: Waiting on messaging to be approved." },
  { originalTitle: "Soundly iFrame launch (evening)", owner: "Jill", resources: "Leslie", notes: "Next Step: Waiting on client for feedback. Goes Live 4/22 (Risk: On UHG timeline)" },
  { originalTitle: "HDL Full Site Design Approval", owner: "Jill", resources: "Chris, Lane, Leslie", notes: "Next Step: Lock on copy and move to development" },
  { originalTitle: "Bonterra Impact Report — code handoff", owner: "Jill", resources: "Leslie", notes: "Next Step: Impact Report K/O to Dev (Risk: Hard client deadline. Client was 3 weeks late on content)" },
  { originalTitle: "CDS Landing Page KO", owner: "Kathy", resources: "Lane", notes: "Next Step: Kick of Landing Page (Risk: If messaging is approved)" },
  { originalTitle: "Disconnect Google Sheet from Dave ManyChat", owner: "Jason", resources: "Jason", notes: "Next Step: Disconnect Drive integration from Dave's ManyChat" },
  { originalTitle: "Hopdoddy Brand Refresh Website launch", owner: "Ronan", resources: "Leslie", notes: "Next Step: Launch Hopdoddy Brand Refresh updates (Risk: Hard deadline for National Burger Day)" },
  { originalTitle: "HDL Start Development", owner: "Jill", resources: "Leslie", notes: "Next Step: Development K/O (Risk: Blocked by design approval)" },
  { originalTitle: "LPPC Map + Website Launch", owner: "Ronan", resources: "Leslie", notes: "Next Step: Launch LPPC Map + Website" },
  { originalTitle: "AIST tradeshow (Convergix)", newTitle: "AIST tradeshow", owner: "Kathy", resources: "Leslie", notes: "Next Step: Launch Events page (Risk: must be live by ???)" },
  { originalTitle: "CDS Case Study + Brochure KO", owner: "Kathy", resources: "Lane", notes: "Next Step: Kickoff Creative (Risk: If messaging approved)" },
  { originalTitle: "Bonterra Impact Report — publish", newTitle: "Bonterra Impact Report — Go Live", owner: "Jill", resources: "Leslie", notes: "Next Step: Launch Impact Report (Risk: tight given compressed timeline)" },
];

async function run() {
  console.log(`Updating ${UPDATES.length} week items...`);
  console.log(`Database: ${url}`);

  let updated = 0;
  let notFound = 0;

  for (const spec of UPDATES) {
    // Find the item by original title
    const allItems = await db
      .select()
      .from(weekItems)
      .where(eq(weekItems.title, spec.originalTitle));

    if (allItems.length === 0) {
      console.warn(`  NOT FOUND: "${spec.originalTitle}"`);
      notFound++;
      continue;
    }

    for (const item of allItems) {
      await db
        .update(weekItems)
        .set({
          ...(spec.newTitle ? { title: spec.newTitle } : {}),
          owner: spec.owner,
          resources: spec.resources,
          notes: spec.notes,
        })
        .where(eq(weekItems.id, item.id));
      updated++;
    }

    console.log(`  Updated: "${spec.originalTitle}"${spec.newTitle ? ` → "${spec.newTitle}"` : ""}`);
  }

  console.log(`\nDone. Updated: ${updated}, Not found: ${notFound}`);

  // Verify
  const all = await db.select().from(weekItems);
  const withResources = all.filter((i) => i.resources);
  const withOwner = all.filter((i) => i.owner);
  console.log(`\nVerification: ${all.length} total items, ${withOwner.length} with owner, ${withResources.length} with resources`);
}

run().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
