"use client";

import { Search, ChevronLeft, ChevronRight, Loader2, BadgeCheck } from "lucide-react";
import { useServerSearch } from "@/lib/hooks";
import { ServerSearchResult } from "./ServerSearchResult";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

export function ServerSearch() {
  const {
    query,
    setQuery,
    verifiedOnly,
    setVerifiedOnly,
    page,
    results,
    isLoading,
    handlePrevPage,
    handleNextPage,
    hasNextPage,
    hasPrevPage,
  } = useServerSearch({ pageSize: PAGE_SIZE });

  const showPagination =
    results && results.pagination.totalPages > 1 && results.servers.length > 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          Discover Integrations
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Search the Smithery registry for MCP servers
        </p>
      </div>

      {/* Search Input and Filter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search MCP servers..."
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          )}
        </div>
        <button
          onClick={() => setVerifiedOnly(!verifiedOnly)}
          className={cn(
            "flex items-center gap-1.5 px-3 h-10 rounded-lg border text-sm transition-colors whitespace-nowrap",
            verifiedOnly
              ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
              : "border-input bg-background text-muted-foreground hover:text-foreground"
          )}
        >
          <BadgeCheck className="w-4 h-4" />
          Verified
        </button>
      </div>

      {/* Results */}
      <div className="rounded-lg border border-border bg-card">
        {!results || results.servers.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "Searching..."
                : query
                  ? "No servers found matching your search."
                  : "Type to search for MCP servers."}
            </p>
          </div>
        ) : (
          <>
            {results.servers.map((server) => (
              <ServerSearchResult key={server.id} server={server} />
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}-
            {Math.min(page * PAGE_SIZE, results.pagination.totalCount)} of{" "}
            {results.pagination.totalCount} results
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={!hasPrevPage}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors",
                !hasPrevPage
                  ? "text-muted-foreground cursor-not-allowed"
                  : "text-foreground hover:bg-muted"
              )}
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </button>
            <button
              onClick={handleNextPage}
              disabled={!hasNextPage}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors",
                !hasNextPage
                  ? "text-muted-foreground cursor-not-allowed"
                  : "text-foreground hover:bg-muted"
              )}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
