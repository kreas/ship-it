"use client";

import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { searchSmitheryServers } from "@/lib/actions/integrations";

const PAGE_SIZE = 10;
const DEBOUNCE_MS = 300;

interface UseServerSearchOptions {
  pageSize?: number;
  debounceMs?: number;
}

/**
 * Hook for searching Smithery MCP servers with debouncing and pagination.
 * Uses TanStack Query for caching and state management.
 */
export function useServerSearch(options: UseServerSearchOptions = {}) {
  const { pageSize = PAGE_SIZE, debounceMs = DEBOUNCE_MS } = options;

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [verifiedOnlyState, setVerifiedOnlyState] = useState(true);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Wrap setVerifiedOnly to also reset page
  const setVerifiedOnly = useCallback((value: boolean) => {
    setVerifiedOnlyState(value);
    setPage(1);
  }, []);

  // Use TanStack Query for data fetching with caching
  const {
    data: results,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.smithery.servers(debouncedQuery, page, verifiedOnlyState),
    queryFn: () => searchSmitheryServers(debouncedQuery, page, pageSize, verifiedOnlyState),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  const handlePrevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    if (results && page < results.pagination.totalPages) {
      setPage((p) => p + 1);
    }
  }, [results, page]);

  const hasNextPage = results ? page < results.pagination.totalPages : false;
  const hasPrevPage = page > 1;

  return {
    query,
    setQuery,
    verifiedOnly: verifiedOnlyState,
    setVerifiedOnly,
    page,
    setPage,
    results: results ?? null,
    isLoading: isLoading || isFetching,
    handlePrevPage,
    handleNextPage,
    hasNextPage,
    hasPrevPage,
  };
}
