/**
 * Fix Bonterra pipeline item: update status to 'signed' and refresh notes.
 *
 * Usage: export $(grep -v '^#' .env.local | xargs) && npx tsx scripts/fix-bonterra-pipeline.ts
 */

import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { loadEnvLocal } from "./lib/load-env";

loadEnvLocal();

import { pipelineItems } from "../src/lib/db/runway-schema";

const url = process.env.RUNWAY_DATABASE_URL ?? "file:runway-local.db";
const client = createClient({ url, authToken: process.env.RUNWAY_AUTH_TOKEN });
const db = drizzle(client);

async function run() {
  console.log("Fixing Bonterra pipeline item...");
  console.log(`Database: ${url}`);

  const all = await db.select().from(pipelineItems).where(eq(pipelineItems.name, "Impact Report SOW"));

  if (all.length === 0) {
    console.warn("NOT FOUND: 'Impact Report SOW'");
    process.exit(1);
  }

  for (const item of all) {
    await db
      .update(pipelineItems)
      .set({
        status: "signed",
        notes: "SOW signed. Schedule: Copy done, Design done, Dev 4/6-4/22, Handoff 4/28, Publish 5/14.",
      })
      .where(eq(pipelineItems.id, item.id));
    console.log(`  Updated: "${item.name}" (${item.status} → signed)`);
  }

  console.log("Done.");
}

run().catch((err) => {
  console.error("Fix failed:", err);
  process.exit(1);
});
