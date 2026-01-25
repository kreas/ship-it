"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  getIssueChatMessages,
  saveChatMessage,
  clearIssueChatMessages,
} from "@/lib/actions/chat";
import type { ChatMessage } from "@/lib/types";

export function useIssueChatMessages(issueId: string | null) {
  return useQuery({
    queryKey: queryKeys.issue.chat(issueId ?? ""),
    queryFn: () => getIssueChatMessages(issueId!),
    enabled: !!issueId,
    staleTime: Infinity, // Chat doesn't go stale - manual invalidation only
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useSaveChatMessage(issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ role, content }: { role: string; content: string }) =>
      saveChatMessage(issueId, role, content),
    onSuccess: (newMessage) => {
      queryClient.setQueryData<ChatMessage[]>(
        queryKeys.issue.chat(issueId),
        (old) => (old ? [...old, newMessage] : [newMessage])
      );
    },
  });
}

export function useClearChatMessages(issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => clearIssueChatMessages(issueId),
    onSuccess: () => {
      queryClient.setQueryData<ChatMessage[]>(
        queryKeys.issue.chat(issueId),
        []
      );
    },
  });
}
