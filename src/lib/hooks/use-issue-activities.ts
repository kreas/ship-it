"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getIssueActivities } from "@/lib/actions/issues";

export function useIssueActivities(issueId: string | null) {
  return useQuery({
    queryKey: queryKeys.issue.activities(issueId ?? ""),
    queryFn: () => getIssueActivities(issueId!),
    enabled: !!issueId,
    staleTime: 60 * 1000, // 60 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
