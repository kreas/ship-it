"use client";

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  getWorkspaceChats,
  getWorkspaceChat,
  createWorkspaceChat,
  updateChatTitle,
  deleteWorkspaceChat,
  getChatMessagesWithAttachments,
  saveChatMessage,
  clearChatMessages,
  getChatAttachments,
  linkAttachmentToMessage,
} from "@/lib/actions/workspace-chat";
import type { WorkspaceChat, WorkspaceChatMessage } from "@/lib/types";

export function useWorkspaceChats(workspaceId: string | null) {
  return useQuery({
    queryKey: queryKeys.workspaceChat.all(workspaceId ?? ""),
    queryFn: () => getWorkspaceChats(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useWorkspaceChat(chatId: string | null) {
  return useQuery({
    queryKey: queryKeys.workspaceChat.detail(chatId ?? ""),
    queryFn: () => getWorkspaceChat(chatId!),
    enabled: !!chatId,
    staleTime: 30 * 1000,
  });
}

export function useChatMessages(chatId: string | null) {
  return useQuery({
    queryKey: queryKeys.workspaceChat.messages(chatId ?? ""),
    queryFn: () => getChatMessagesWithAttachments(chatId!),
    enabled: !!chatId,
    staleTime: Infinity, // Chat doesn't go stale - manual invalidation only
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useCreateChat(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title?: string) => createWorkspaceChat(workspaceId, title),
    onSuccess: (newChat) => {
      queryClient.setQueryData<WorkspaceChat[]>(
        queryKeys.workspaceChat.all(workspaceId),
        (old) => (old ? [newChat, ...old] : [newChat])
      );
    },
  });
}

export function useUpdateChatTitle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chatId, title }: { chatId: string; title: string }) =>
      updateChatTitle(chatId, title),
    onSuccess: (_, { chatId, title }) => {
      queryClient.setQueryData<WorkspaceChat | null>(
        queryKeys.workspaceChat.detail(chatId),
        (old) => (old ? { ...old, title, updatedAt: new Date() } : null)
      );
      // Invalidate the list to reorder by updatedAt
      queryClient.invalidateQueries({
        queryKey: ["workspaceChats"],
        exact: false,
      });
    },
  });
}

export function useDeleteChat(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chatId: string) => deleteWorkspaceChat(chatId),
    onSuccess: (_, chatId) => {
      queryClient.setQueryData<WorkspaceChat[]>(
        queryKeys.workspaceChat.all(workspaceId),
        (old) => (old ? old.filter((chat) => chat.id !== chatId) : [])
      );
      queryClient.removeQueries({
        queryKey: queryKeys.workspaceChat.detail(chatId),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.workspaceChat.messages(chatId),
      });
    },
  });
}

export function useSaveWorkspaceChatMessage(chatId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      role,
      content,
      attachmentIds,
    }: {
      role: string;
      content: string;
      attachmentIds?: string[];
    }) => {
      const message = await saveChatMessage(chatId, role, content);
      // Link any attachments to this message
      if (attachmentIds && attachmentIds.length > 0) {
        await Promise.all(
          attachmentIds.map((id) => linkAttachmentToMessage(id, message.id))
        );
      }
      return message;
    },
    onSuccess: () => {
      // Invalidate to refetch messages with attachments
      queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceChat.messages(chatId),
      });
    },
  });
}

export function useClearWorkspaceChatMessages(chatId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => clearChatMessages(chatId),
    onSuccess: () => {
      queryClient.setQueryData<WorkspaceChatMessage[]>(
        queryKeys.workspaceChat.messages(chatId),
        []
      );
    },
  });
}

export function useChatAttachments(chatId: string | null) {
  return useQuery({
    queryKey: queryKeys.workspaceChat.attachments(chatId ?? ""),
    queryFn: () => getChatAttachments(chatId!),
    enabled: !!chatId,
    staleTime: 30 * 1000,
  });
}

export function useInvalidateChatAttachments(chatId: string) {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.workspaceChat.attachments(chatId),
    });
  }, [queryClient, chatId]);
}
