"use server";

import { db } from "../db";
import { chatMessages } from "../db/schema";
import { eq, asc } from "drizzle-orm";
import type { ChatMessage } from "../types";

export async function getIssueChatMessages(
  issueId: string
): Promise<ChatMessage[]> {
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.issueId, issueId))
    .orderBy(asc(chatMessages.createdAt));
}

export async function saveChatMessage(
  issueId: string,
  role: string,
  content: string
): Promise<ChatMessage> {
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    issueId,
    role,
    content,
    createdAt: new Date(),
  };

  await db.insert(chatMessages).values(message);

  return message;
}

export async function clearIssueChatMessages(issueId: string): Promise<void> {
  await db.delete(chatMessages).where(eq(chatMessages.issueId, issueId));
}
