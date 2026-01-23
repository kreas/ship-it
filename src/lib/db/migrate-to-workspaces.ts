/**
 * Migration script to convert boards to workspaces.
 *
 * This script:
 * 1. Creates a system user for existing data
 * 2. Converts boards to workspaces
 * 3. Creates workspace membership for system user
 *
 * Run with: npx tsx src/lib/db/migrate-to-workspaces.ts
 */

import { db } from "./index";
import {
  users,
  workspaces,
  workspaceMembers,
  boards,
  columns,
  labels,
  cycles,
} from "./schema";
import { eq, sql } from "drizzle-orm";

const SYSTEM_USER_ID = "system-user";
const SYSTEM_USER_EMAIL = "system@auto-kanban.local";

async function migrate() {
  console.log("Starting migration to workspaces...\n");

  // Step 1: Create system user for existing data
  console.log("Step 1: Creating system user...");
  const existingSystemUser = await db
    .select()
    .from(users)
    .where(eq(users.id, SYSTEM_USER_ID))
    .get();

  if (!existingSystemUser) {
    const now = new Date();
    await db.insert(users).values({
      id: SYSTEM_USER_ID,
      email: SYSTEM_USER_EMAIL,
      firstName: "System",
      lastName: "User",
      avatarUrl: null,
      createdAt: now,
      updatedAt: now,
    });
    console.log("  Created system user");
  } else {
    console.log("  System user already exists");
  }

  // Step 2: Get all existing boards
  console.log("\nStep 2: Fetching existing boards...");
  const existingBoards = await db.select().from(boards);
  console.log(`  Found ${existingBoards.length} board(s)`);

  if (existingBoards.length === 0) {
    console.log("\nNo boards to migrate. Done!");
    return;
  }

  // Step 3: Migrate each board to a workspace
  console.log("\nStep 3: Migrating boards to workspaces...");

  for (const board of existingBoards) {
    console.log(`\n  Processing board: ${board.name} (${board.id})`);

    // Check if workspace already exists with this ID
    const existingWorkspace = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, board.id))
      .get();

    if (existingWorkspace) {
      console.log(`    Workspace already exists, skipping`);
      continue;
    }

    // Generate slug from name
    let slug = board.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);

    // Ensure unique slug
    let slugSuffix = 0;
    let existingSlug = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.slug, slug))
      .get();

    while (existingSlug) {
      slugSuffix++;
      slug = `${board.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 45)}-${slugSuffix}`;
      existingSlug = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.slug, slug))
        .get();
    }

    const now = new Date();

    // Create workspace
    await db.insert(workspaces).values({
      id: board.id, // Keep same ID for easy reference
      name: board.name,
      slug,
      identifier: board.identifier,
      issueCounter: board.issueCounter,
      ownerId: SYSTEM_USER_ID,
      createdAt: board.createdAt,
      updatedAt: now,
    });
    console.log(`    Created workspace with slug: ${slug}`);

    // Create workspace membership
    await db.insert(workspaceMembers).values({
      workspaceId: board.id,
      userId: SYSTEM_USER_ID,
      role: "admin",
      createdAt: now,
    });
    console.log(`    Created admin membership for system user`);

    // Note: columns, labels, and cycles need their boardId updated to workspaceId
    // Since we're keeping the same ID and the schema already changed the column names,
    // we need to copy the data if we were doing a real migration with separate tables.
    // In this case, since the schema has changed, the old data would need manual migration.
  }

  console.log("\n\nMigration complete!");
  console.log("\nNext steps:");
  console.log("1. Update any existing columns to reference workspaces.id instead of boards.id");
  console.log("2. Update any existing labels to reference workspaces.id instead of boards.id");
  console.log("3. Update any existing cycles to reference workspaces.id instead of boards.id");
  console.log("4. After verification, you can drop the boards table");
  console.log("\nTo transfer ownership, use the member management page in the app.");
}

// Run migration
migrate()
  .then(() => {
    console.log("\nMigration script finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nMigration failed:", error);
    process.exit(1);
  });
