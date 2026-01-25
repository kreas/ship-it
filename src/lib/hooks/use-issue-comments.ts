"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  getIssueComments,
  addComment,
  updateComment,
  deleteComment,
} from "@/lib/actions/issues";
import type { Comment } from "@/lib/types";

export function useIssueComments(issueId: string | null) {
  return useQuery({
    queryKey: queryKeys.issue.comments(issueId ?? ""),
    queryFn: () => getIssueComments(issueId!),
    enabled: !!issueId,
    staleTime: 60 * 1000, // 60 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useAddComment(issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: string) => addComment(issueId, body),
    onSuccess: (newComment) => {
      // Update comments cache
      queryClient.setQueryData<Comment[]>(
        queryKeys.issue.comments(issueId),
        (old) => (old ? [...old, newComment] : [newComment])
      );
      // Invalidate activities since adding a comment creates an activity
      queryClient.invalidateQueries({
        queryKey: queryKeys.issue.activities(issueId),
      });
    },
  });
}

export function useUpdateComment(issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; body: string }) =>
      updateComment(commentId, body),
    onSuccess: (_, { commentId, body }) => {
      queryClient.setQueryData<Comment[]>(
        queryKeys.issue.comments(issueId),
        (old) =>
          old?.map((c) =>
            c.id === commentId ? { ...c, body, updatedAt: new Date() } : c
          )
      );
    },
  });
}

export function useDeleteComment(issueId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: (_, commentId) => {
      queryClient.setQueryData<Comment[]>(
        queryKeys.issue.comments(issueId),
        (old) => old?.filter((c) => c.id !== commentId)
      );
    },
  });
}
