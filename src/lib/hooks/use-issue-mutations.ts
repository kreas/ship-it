"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  createIssue,
  updateIssue,
  deleteIssue,
  moveIssue,
  addLabel,
  removeLabel,
} from "@/lib/actions/issues";
import { createLabel } from "@/lib/actions/board";
import type { CreateIssueInput, UpdateIssueInput } from "@/lib/types";

export function useCreateIssue(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      columnId,
      input,
    }: {
      columnId: string;
      input: CreateIssueInput;
    }) => createIssue(columnId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.board.detail(workspaceId),
      });
    },
  });
}

export function useUpdateIssue(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      issueId,
      data,
    }: {
      issueId: string;
      data: UpdateIssueInput;
    }) => updateIssue(issueId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.board.detail(workspaceId),
      });
    },
  });
}

export function useDeleteIssue(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (issueId: string) => deleteIssue(issueId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.board.detail(workspaceId),
      });
    },
  });
}

export function useMoveIssue(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      issueId,
      targetColumnId,
      targetPosition,
    }: {
      issueId: string;
      targetColumnId: string;
      targetPosition: number;
    }) => moveIssue(issueId, targetColumnId, targetPosition),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.board.detail(workspaceId),
      });
    },
  });
}

export function useAddLabelToIssue(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ issueId, labelId }: { issueId: string; labelId: string }) =>
      addLabel(issueId, labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.board.detail(workspaceId),
      });
    },
  });
}

export function useRemoveLabelFromIssue(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ issueId, labelId }: { issueId: string; labelId: string }) =>
      removeLabel(issueId, labelId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.board.detail(workspaceId),
      });
    },
  });
}

export function useCreateLabel(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      createLabel(workspaceId, name, color),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.board.detail(workspaceId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.settings.labels(workspaceId),
      });
    },
  });
}
