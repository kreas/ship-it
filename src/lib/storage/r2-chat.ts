/**
 * R2 Chat Storage Module
 *
 * Stores chat conversations in Cloudflare R2 instead of SQLite.
 * Each user has their own private conversation per entity.
 *
 * Key structure: chats/{workspaceId}/{chatType}/{userId}/{entityId}/conversation.json
 */

import { getContent, uploadContent, deleteObject } from "./r2-client";
import type { R2ChatConversation, R2ChatType, R2ChatMessage } from "../types";

/**
 * Generate the R2 storage key for a chat conversation
 */
export function getChatStorageKey(
  workspaceId: string,
  chatType: R2ChatType,
  userId: string,
  entityId: string
): string {
  return `chats/${workspaceId}/${chatType}/${userId}/${entityId}/conversation.json`;
}

/**
 * Check if R2 is configured (for graceful dev mode fallback)
 */
function isR2Configured(): boolean {
  return !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

/**
 * Get a conversation from R2
 * Returns null if the conversation doesn't exist
 */
export async function getConversation(
  workspaceId: string,
  chatType: R2ChatType,
  userId: string,
  entityId: string
): Promise<R2ChatConversation | null> {
  if (!isR2Configured()) {
    console.warn("R2 not configured, returning empty conversation");
    return null;
  }

  const key = getChatStorageKey(workspaceId, chatType, userId, entityId);

  try {
    const content = await getContent(key);
    if (!content) {
      return null;
    }
    return JSON.parse(content) as R2ChatConversation;
  } catch (error) {
    console.error("Failed to get conversation from R2:", error);
    return null;
  }
}

/**
 * Create a new empty conversation
 */
function createEmptyConversation(
  workspaceId: string,
  chatType: R2ChatType,
  userId: string,
  entityId: string
): R2ChatConversation {
  const now = new Date().toISOString();
  return {
    version: 1,
    metadata: {
      workspaceId,
      chatType,
      userId,
      entityId,
      createdAt: now,
      updatedAt: now,
      messageCount: 0,
    },
    messages: [],
  };
}

/**
 * Append a message to a conversation
 * Creates the conversation if it doesn't exist
 * Idempotent: duplicate message IDs are ignored
 */
export async function appendMessage(
  workspaceId: string,
  chatType: R2ChatType,
  userId: string,
  entityId: string,
  message: { id: string; role: "user" | "assistant"; content: string }
): Promise<R2ChatConversation> {
  if (!isR2Configured()) {
    console.warn("R2 not configured, message not saved");
    const conv = createEmptyConversation(workspaceId, chatType, userId, entityId);
    conv.messages.push({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: new Date().toISOString(),
    });
    conv.metadata.messageCount = 1;
    return conv;
  }

  const key = getChatStorageKey(workspaceId, chatType, userId, entityId);

  // Get existing conversation or create new one
  let conversation = await getConversation(workspaceId, chatType, userId, entityId);
  if (!conversation) {
    conversation = createEmptyConversation(workspaceId, chatType, userId, entityId);
  }

  // Check for duplicate message ID (idempotent)
  const existingMessage = conversation.messages.find((m) => m.id === message.id);
  if (existingMessage) {
    return conversation;
  }

  // Append the new message
  const newMessage: R2ChatMessage = {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: new Date().toISOString(),
  };

  conversation.messages.push(newMessage);
  conversation.metadata.updatedAt = new Date().toISOString();
  conversation.metadata.messageCount = conversation.messages.length;

  // Save to R2
  try {
    await uploadContent(key, JSON.stringify(conversation), "application/json");
  } catch (error) {
    console.error("Failed to save conversation to R2:", error);
    throw error;
  }

  return conversation;
}

/**
 * Delete a conversation from R2
 */
export async function deleteConversation(
  workspaceId: string,
  chatType: R2ChatType,
  userId: string,
  entityId: string
): Promise<void> {
  if (!isR2Configured()) {
    console.warn("R2 not configured, nothing to delete");
    return;
  }

  const key = getChatStorageKey(workspaceId, chatType, userId, entityId);

  try {
    await deleteObject(key);
  } catch (error) {
    console.error("Failed to delete conversation from R2:", error);
    throw error;
  }
}

/**
 * Get all messages from a conversation
 * Returns empty array if conversation doesn't exist
 */
export async function getMessages(
  workspaceId: string,
  chatType: R2ChatType,
  userId: string,
  entityId: string
): Promise<R2ChatMessage[]> {
  const conversation = await getConversation(workspaceId, chatType, userId, entityId);
  return conversation?.messages ?? [];
}
