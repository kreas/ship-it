"use server";

import { db } from "../db";
import {
  workspaceChats,
  workspaceChatMessages,
  workspaceChatAttachments,
} from "../db/schema";
import { eq, desc, asc } from "drizzle-orm";
import type {
  WorkspaceChat,
  WorkspaceChatMessage,
  WorkspaceChatAttachment,
} from "../types";

export async function getWorkspaceChats(
  workspaceId: string
): Promise<WorkspaceChat[]> {
  return db
    .select()
    .from(workspaceChats)
    .where(eq(workspaceChats.workspaceId, workspaceId))
    .orderBy(desc(workspaceChats.updatedAt));
}

export async function getWorkspaceChat(
  chatId: string
): Promise<WorkspaceChat | null> {
  const [chat] = await db
    .select()
    .from(workspaceChats)
    .where(eq(workspaceChats.id, chatId))
    .limit(1);

  return chat ?? null;
}

export async function createWorkspaceChat(
  workspaceId: string,
  title?: string
): Promise<WorkspaceChat> {
  const now = new Date();
  const chat: WorkspaceChat = {
    id: crypto.randomUUID(),
    workspaceId,
    title: title ?? "New chat",
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(workspaceChats).values(chat);

  return chat;
}

export async function updateChatTitle(
  chatId: string,
  title: string
): Promise<void> {
  await db
    .update(workspaceChats)
    .set({ title, updatedAt: new Date() })
    .where(eq(workspaceChats.id, chatId));
}

export async function deleteWorkspaceChat(chatId: string): Promise<void> {
  await db.delete(workspaceChats).where(eq(workspaceChats.id, chatId));
}

export async function getChatMessages(
  chatId: string
): Promise<WorkspaceChatMessage[]> {
  return db
    .select()
    .from(workspaceChatMessages)
    .where(eq(workspaceChatMessages.chatId, chatId))
    .orderBy(asc(workspaceChatMessages.createdAt));
}

export async function saveChatMessage(
  chatId: string,
  role: string,
  content: string
): Promise<WorkspaceChatMessage> {
  const message: WorkspaceChatMessage = {
    id: crypto.randomUUID(),
    chatId,
    role,
    content,
    createdAt: new Date(),
  };

  await db.insert(workspaceChatMessages).values(message);

  // Update the chat's updatedAt timestamp
  await db
    .update(workspaceChats)
    .set({ updatedAt: new Date() })
    .where(eq(workspaceChats.id, chatId));

  return message;
}

export async function clearChatMessages(chatId: string): Promise<void> {
  await db
    .delete(workspaceChatMessages)
    .where(eq(workspaceChatMessages.chatId, chatId));
}

// Attachment operations

export async function getChatAttachments(
  chatId: string
): Promise<WorkspaceChatAttachment[]> {
  return db
    .select()
    .from(workspaceChatAttachments)
    .where(eq(workspaceChatAttachments.chatId, chatId))
    .orderBy(asc(workspaceChatAttachments.createdAt));
}

export async function getChatAttachment(
  attachmentId: string
): Promise<WorkspaceChatAttachment | null> {
  const [attachment] = await db
    .select()
    .from(workspaceChatAttachments)
    .where(eq(workspaceChatAttachments.id, attachmentId))
    .limit(1);

  return attachment ?? null;
}

export async function createChatAttachment(
  chatId: string,
  filename: string,
  content: string,
  mimeType: string = "text/markdown"
): Promise<WorkspaceChatAttachment> {
  const attachment: WorkspaceChatAttachment = {
    id: crypto.randomUUID(),
    chatId,
    messageId: null,
    filename,
    content,
    mimeType,
    size: new TextEncoder().encode(content).length,
    createdAt: new Date(),
  };

  await db.insert(workspaceChatAttachments).values(attachment);

  return attachment;
}

export async function deleteChatAttachment(attachmentId: string): Promise<void> {
  await db
    .delete(workspaceChatAttachments)
    .where(eq(workspaceChatAttachments.id, attachmentId));
}

export async function linkAttachmentToMessage(
  attachmentId: string,
  messageId: string
): Promise<void> {
  await db
    .update(workspaceChatAttachments)
    .set({ messageId })
    .where(eq(workspaceChatAttachments.id, attachmentId));
}

export async function getAttachmentsByMessageId(
  messageId: string
): Promise<WorkspaceChatAttachment[]> {
  return db
    .select()
    .from(workspaceChatAttachments)
    .where(eq(workspaceChatAttachments.messageId, messageId))
    .orderBy(asc(workspaceChatAttachments.createdAt));
}

// Get messages with their attachments for a chat
export async function getChatMessagesWithAttachments(
  chatId: string
): Promise<(WorkspaceChatMessage & { attachments: WorkspaceChatAttachment[] })[]> {
  const messages = await getChatMessages(chatId);
  const attachments = await getChatAttachments(chatId);

  // Group attachments by messageId
  const attachmentsByMessage = new Map<string, WorkspaceChatAttachment[]>();
  for (const attachment of attachments) {
    if (attachment.messageId) {
      const existing = attachmentsByMessage.get(attachment.messageId) || [];
      existing.push(attachment);
      attachmentsByMessage.set(attachment.messageId, existing);
    }
  }

  // Merge attachments into messages
  return messages.map((msg) => ({
    ...msg,
    attachments: attachmentsByMessage.get(msg.id) || [],
  }));
}
