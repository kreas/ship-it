"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getWorkspaceWithIssues } from "@/lib/actions/board";
import type { WorkspaceWithColumnsAndIssues } from "@/lib/types";

export function useBoardQuery(
  workspaceId: string | null,
  initialData?: WorkspaceWithColumnsAndIssues
) {
  return useQuery({
    queryKey: queryKeys.board.detail(workspaceId ?? ""),
    queryFn: () => getWorkspaceWithIssues(workspaceId!),
    enabled: !!workspaceId,
    initialData,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

// Hook for invalidating the board query
export function useInvalidateBoard() {
  const queryClient = useQueryClient();

  return {
    invalidate: (workspaceId: string) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.board.detail(workspaceId),
      }),
    setData: (
      workspaceId: string,
      updater: (
        old: WorkspaceWithColumnsAndIssues | undefined
      ) => WorkspaceWithColumnsAndIssues | undefined
    ) =>
      queryClient.setQueryData<WorkspaceWithColumnsAndIssues>(
        queryKeys.board.detail(workspaceId),
        updater
      ),
  };
}
