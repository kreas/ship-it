"use client";

import { useState } from "react";
import { Search, Link as LinkIcon } from "lucide-react";

interface BrandSearchFormProps {
  onSearch: (query: string, type: "name" | "url") => void;
  isLoading: boolean;
}

export function BrandSearchForm({ onSearch, isLoading }: BrandSearchFormProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Detect if input is a URL
    const isUrl = query.startsWith("http://") || query.startsWith("https://") || query.includes(".");
    const type = isUrl ? "url" : "name";

    // For URLs that don't have protocol, add https://
    let searchQuery = query.trim();
    if (type === "url" && !searchQuery.startsWith("http")) {
      searchQuery = `https://${searchQuery}`;
    }

    onSearch(searchQuery, type);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          {query.includes(".") ? (
            <LinkIcon className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Search className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter brand name or website URL..."
          className="w-full pl-10 pr-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent text-foreground placeholder:text-muted-foreground"
          disabled={isLoading}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground text-center">
        Enter a brand name to search, or paste a website URL for direct lookup
      </p>
      <div className="mt-4 flex justify-center">
        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? "Searching..." : "Search"}
        </button>
      </div>
    </form>
  );
}
