"use server";

import { db } from "../db";
import { issues, columns } from "../db/schema";
import { eq } from "drizzle-orm";
import type { R2ChatMessage } from "../types";
import { requireWorkspaceAccess } from "./workspace";
import { getMessages, appendMessage, deleteConversation } from "../storage/r2-chat";

interface IssueAccessResult {
  workspaceId: string;
  userId: string;
}

/**
 * Get workspace ID from an issue and verify access
 * Returns the workspaceId and userId for R2 storage
 */
async function requireIssueAccess(issueId: string): Promise<IssueAccessResult> {
  const issue = await db
    .select({ columnId: issues.columnId })
    .from(issues)
    .where(eq(issues.id, issueId))
    .get();

  if (!issue) {
    throw new Error("Issue not found");
  }

  const column = await db
    .select({ workspaceId: columns.workspaceId })
    .from(columns)
    .where(eq(columns.id, issue.columnId))
    .get();

  if (!column) {
    throw new Error("Column not found");
  }

  const { user } = await requireWorkspaceAccess(column.workspaceId, "member");

  return {
    workspaceId: column.workspaceId,
    userId: user.id,
  };
}

// Return type that matches what consumers expect
export interface ChatMessage {
  id: string;
  issueId: string;
  role: string;
  content: string;
  createdAt: Date;
}

export async function getIssueChatMessages(
  issueId: string
): Promise<ChatMessage[]> {
  const { workspaceId, userId } = await requireIssueAccess(issueId);

  const messages = await getMessages(workspaceId, "issue", userId, issueId);

  // Transform R2ChatMessage to ChatMessage format for compatibility
  return messages.map((m: R2ChatMessage) => ({
    id: m.id,
    issueId,
    role: m.role,
    content: m.content,
    createdAt: new Date(m.createdAt),
  }));
}

export async function saveChatMessage(
  issueId: string,
  role: string,
  content: string
): Promise<ChatMessage> {
  const { workspaceId, userId } = await requireIssueAccess(issueId);

  const messageId = crypto.randomUUID();

  await appendMessage(workspaceId, "issue", userId, issueId, {
    id: messageId,
    role: role as "user" | "assistant",
    content,
  });

  return {
    id: messageId,
    issueId,
    role,
    content,
    createdAt: new Date(),
  };
}

export async function clearIssueChatMessages(issueId: string): Promise<void> {
  const { workspaceId, userId } = await requireIssueAccess(issueId);

  await deleteConversation(workspaceId, "issue", userId, issueId);
}
