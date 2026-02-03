/**
 * Migration Script: Drop Legacy Chat Tables
 *
 * The chat messages have been migrated to R2 storage.
 * This script drops the legacy SQLite tables.
 *
 * Usage:
 *   pnpm tsx scripts/migrate-chats-to-r2.ts
 */

// Load environment variables from .env.local (Next.js style)
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("🗑️  Dropping legacy chat message tables...\n");

  const tables = [
    "chat_messages",
    "workspace_chat_messages",
    "soul_chat_messages",
  ];

  for (const table of tables) {
    try {
      await db.run(sql.raw(`DROP TABLE IF EXISTS ${table}`));
      console.log(`  ✅ Dropped ${table}`);
    } catch (error) {
      console.error(`  ❌ Failed to drop ${table}:`, error);
    }
  }

  console.log("\n✅ Legacy tables dropped. Chat messages are now stored in R2.");
}

main().catch(console.error);
