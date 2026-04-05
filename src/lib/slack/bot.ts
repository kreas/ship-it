/**
 * Runway Slack Bot — AI orchestration layer
 *
 * Receives DM messages, uses Haiku to understand intent,
 * calls Runway MCP tools to read/write data, and posts
 * formatted updates to the updates channel.
 *
 * Flow:
 * 1. Team member DMs the bot: "Convergix CDS went to Daniel today"
 * 2. AI (Haiku) interprets, calls MCP tools to find project + update status
 * 3. Bot responds with confirmation
 * 4. Update posted to updates channel in agreed format
 */

import { anthropic } from "@ai-sdk/anthropic";
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { getRunwayDb } from "@/lib/db/runway";
import {
  clients,
  projects,
  updates,
  teamMembers,
  pipelineItems,
  weekItems,
} from "@/lib/db/runway-schema";
import { eq, desc, asc } from "drizzle-orm";
import { createHash } from "crypto";
import { getSlackClient } from "./client";
import { postUpdate } from "./updates-channel";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_STEPS = 5;

function idempotencyKey(...parts: string[]): string {
  return createHash("sha256")
    .update(parts.join("|"))
    .digest("hex")
    .slice(0, 40);
}

function newId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 25);
}

/**
 * Look up team member name from Slack user ID.
 * Returns the name if found, null otherwise.
 */
async function getTeamMemberName(slackUserId: string): Promise<string | null> {
  const db = getRunwayDb();
  const member = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.slackUserId, slackUserId))
    .get();
  return member?.name ?? null;
}

/**
 * Build the system prompt for the Runway bot.
 * Clean, factual, no AI voice.
 */
function buildBotSystemPrompt(userName: string): string {
  return `You are the Civilization Runway bot. You help team members update project statuses and log information about client work.

## Your role
- Understand what the person is telling you about a project or client
- Use the tools to look up the right project and make updates
- Confirm changes clearly and factually
- After confirming an update, you can offer: "I've got a couple things that could use your input. Want me to run through them?"

## Rules
- Be concise. No filler, no fluff.
- Never use em dashes.
- Never say "I've updated" or "I've processed" or anything AI-sounding.
- Speak plainly like a teammate, not an assistant.
- If you're not sure which project they mean, ask. Don't guess.
- If the update doesn't match any known client or project, say so and list what's available.

## Context
- The person messaging you is: ${userName}
- They are a Civilization team member updating project status via DM.
- You have tools to look up clients, projects, and make updates.
- Every status change gets logged and posted to the updates channel automatically.

## Status values
Projects use these statuses: in-production, awaiting-client, not-started, blocked, on-hold, completed, sent-to-client

## When making updates
1. First use get_clients and/or get_projects to find the right project
2. Call update_project_status or add_update to make the change
3. Confirm what you did in plain language
4. The updates channel post happens automatically`;
}

/**
 * Create the tool set for the Runway bot.
 * These are thin wrappers around Runway DB operations.
 */
function createBotTools() {
  return {
    get_clients: tool({
      description: "List all clients with project counts",
      inputSchema: z.object({}),
      execute: async () => {
        const db = getRunwayDb();
        const allClients = await db.select().from(clients).orderBy(asc(clients.name));
        const allProjects = await db.select().from(projects);

        const countByClient = new Map<string, number>();
        for (const p of allProjects) {
          countByClient.set(p.clientId, (countByClient.get(p.clientId) ?? 0) + 1);
        }

        return allClients.map((c) => ({
          name: c.name,
          slug: c.slug,
          projectCount: countByClient.get(c.id) ?? 0,
        }));
      },
    }),

    get_projects: tool({
      description: "List projects for a client",
      inputSchema: z.object({
        clientSlug: z.string().describe("Client slug (e.g. 'convergix')"),
      }),
      execute: async ({ clientSlug }) => {
        const db = getRunwayDb();
        const client = (await db.select().from(clients)).find(
          (c) => c.slug === clientSlug
        );
        if (!client) return { error: `Client '${clientSlug}' not found` };

        const projectList = await db
          .select()
          .from(projects)
          .where(eq(projects.clientId, client.id))
          .orderBy(asc(projects.sortOrder));

        return projectList.map((p) => ({
          name: p.name,
          status: p.status,
          owner: p.owner,
          waitingOn: p.waitingOn,
          notes: p.notes,
        }));
      },
    }),

    get_pipeline: tool({
      description: "List all pipeline/unsigned SOWs",
      inputSchema: z.object({}),
      execute: async () => {
        const db = getRunwayDb();
        const allClients = await db.select().from(clients);
        const clientNameById = new Map(allClients.map((c) => [c.id, c.name]));

        const items = await db
          .select()
          .from(pipelineItems)
          .orderBy(asc(pipelineItems.sortOrder));

        return items.map((item) => ({
          account: item.clientId ? clientNameById.get(item.clientId) : null,
          name: item.name,
          status: item.status,
          estimatedValue: item.estimatedValue,
        }));
      },
    }),

    get_week_items: tool({
      description: "Get this week's calendar items",
      inputSchema: z.object({
        weekOf: z
          .string()
          .optional()
          .describe("ISO date of the Monday (e.g. '2026-04-06')"),
      }),
      execute: async ({ weekOf }) => {
        const db = getRunwayDb();
        const allClients = await db.select().from(clients);
        const clientNameById = new Map(allClients.map((c) => [c.id, c.name]));

        let items;
        if (weekOf) {
          items = await db
            .select()
            .from(weekItems)
            .where(eq(weekItems.weekOf, weekOf))
            .orderBy(asc(weekItems.date), asc(weekItems.sortOrder));
        } else {
          items = await db
            .select()
            .from(weekItems)
            .orderBy(asc(weekItems.date), asc(weekItems.sortOrder));
        }

        return items.map((item) => ({
          date: item.date,
          title: item.title,
          account: item.clientId ? clientNameById.get(item.clientId) : null,
          category: item.category,
          owner: item.owner,
        }));
      },
    }),

    update_project_status: tool({
      description: "Change a project's status",
      inputSchema: z.object({
        clientSlug: z.string().describe("Client slug"),
        projectName: z.string().describe("Project name (fuzzy match)"),
        newStatus: z.string().describe("New status value"),
        updatedBy: z.string().describe("Person making the update"),
        notes: z.string().optional().describe("Additional context"),
      }),
      execute: async ({ clientSlug, projectName, newStatus, updatedBy, notes }) => {
        const db = getRunwayDb();
        const client = (await db.select().from(clients)).find(
          (c) => c.slug === clientSlug
        );
        if (!client) return { error: `Client '${clientSlug}' not found` };

        const clientProjects = await db
          .select()
          .from(projects)
          .where(eq(projects.clientId, client.id));

        const searchTerm = projectName.toLowerCase();
        const project = clientProjects.find((p) =>
          p.name.toLowerCase().includes(searchTerm)
        );

        if (!project) {
          return {
            error: `Project '${projectName}' not found for ${client.name}`,
            available: clientProjects.map((p) => p.name),
          };
        }

        const previousStatus = project.status;
        const idemKey = idempotencyKey(
          "status-change",
          project.id,
          newStatus,
          updatedBy
        );

        // Check idempotency
        const existing = await db
          .select()
          .from(updates)
          .where(eq(updates.idempotencyKey, idemKey));

        if (existing.length > 0) {
          return { result: "Already applied (duplicate)." };
        }

        // Update project
        await db
          .update(projects)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(projects.id, project.id));

        // Log update
        const updateSummary = `${previousStatus} -> ${newStatus}${notes ? ` (${notes})` : ""}`;
        await db.insert(updates).values({
          id: newId(),
          idempotencyKey: idemKey,
          projectId: project.id,
          clientId: client.id,
          updatedBy,
          updateType: "status-change",
          previousValue: previousStatus,
          newValue: newStatus,
          summary: `${client.name} / ${project.name}: ${updateSummary}`,
        });

        // Post to updates channel
        try {
          await postUpdate({
            clientName: client.name,
            projectName: project.name,
            updateText: updateSummary,
            updatedBy,
          });
        } catch (err) {
          console.error("[Runway Bot] Failed to post to updates channel:", err);
        }

        return {
          result: `${client.name} / ${project.name}: ${previousStatus} -> ${newStatus}`,
        };
      },
    }),

    add_update: tool({
      description: "Log a free-form update for a client or project",
      inputSchema: z.object({
        clientSlug: z.string().describe("Client slug"),
        projectName: z
          .string()
          .optional()
          .describe("Project name (fuzzy match)"),
        summary: z.string().describe("The update text"),
        updatedBy: z.string().describe("Person making the update"),
      }),
      execute: async ({ clientSlug, projectName, summary, updatedBy }) => {
        const db = getRunwayDb();
        const client = (await db.select().from(clients)).find(
          (c) => c.slug === clientSlug
        );
        if (!client) return { error: `Client '${clientSlug}' not found` };

        let projectId: string | null = null;
        let projectMatch: string | undefined;
        if (projectName) {
          const clientProjects = await db
            .select()
            .from(projects)
            .where(eq(projects.clientId, client.id));
          const match = clientProjects.find((p) =>
            p.name.toLowerCase().includes(projectName.toLowerCase())
          );
          projectId = match?.id ?? null;
          projectMatch = match?.name;
        }

        const idemKey = idempotencyKey(
          "note",
          client.id,
          summary,
          updatedBy,
          new Date().toISOString().slice(0, 16)
        );

        const existing = await db
          .select()
          .from(updates)
          .where(eq(updates.idempotencyKey, idemKey));

        if (existing.length > 0) {
          return { result: "Already logged (duplicate)." };
        }

        await db.insert(updates).values({
          id: newId(),
          idempotencyKey: idemKey,
          projectId,
          clientId: client.id,
          updatedBy,
          updateType: "note",
          summary: `${client.name}: ${summary}`,
        });

        // Post to updates channel
        try {
          await postUpdate({
            clientName: client.name,
            projectName: projectMatch,
            updateText: summary,
            updatedBy,
          });
        } catch (err) {
          console.error("[Runway Bot] Failed to post to updates channel:", err);
        }

        return { result: `Update logged for ${client.name}.` };
      },
    }),
  };
}

/**
 * Handle a DM message from a team member.
 * Returns the bot's response text.
 */
export async function handleDirectMessage(
  slackUserId: string,
  channelId: string,
  messageText: string,
  messageTs: string
): Promise<void> {
  const slack = getSlackClient();

  // Look up team member
  const userName = (await getTeamMemberName(slackUserId)) ?? "Unknown team member";

  const tools = createBotTools();

  const result = await generateText({
    model: anthropic(MODEL),
    system: buildBotSystemPrompt(userName),
    messages: [{ role: "user", content: messageText }],
    tools,
    stopWhen: stepCountIs(MAX_STEPS),
    maxRetries: 1,
  });

  // Post the response back to the DM
  await slack.chat.postMessage({
    channel: channelId,
    text: result.text,
    thread_ts: messageTs,
  });
}
