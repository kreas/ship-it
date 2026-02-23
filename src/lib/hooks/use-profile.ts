"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { getUserProfile, updateUserProfile } from "@/lib/actions/users";
import type { UpdateUserProfileInput } from "@/lib/types";

export function useUserProfile() {
  return useQuery({
    queryKey: queryKeys.profile.detail(),
    queryFn: () => getUserProfile(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateUserProfileInput) => updateUserProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
    },
  });
}
