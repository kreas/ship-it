"use client";

import Image from "next/image";
import { ExternalLink, Plug, BadgeCheck } from "lucide-react";
import type { SmitheryServerResult } from "@/lib/actions/integrations";

interface ServerSearchResultProps {
  server: SmitheryServerResult;
}

function formatUseCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
}

export function ServerSearchResult({ server }: ServerSearchResultProps) {
  return (
    <a
      href={server.homepage}
      target="_blank"
      rel="noopener noreferrer"
      className="block px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
          {server.iconUrl ? (
            <Image
              src={server.iconUrl}
              alt=""
              width={24}
              height={24}
              className="object-contain"
              unoptimized
            />
          ) : (
            <Plug className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {server.displayName}
            </span>
            {server.verified && (
              <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {server.description}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-muted-foreground">
              {formatUseCount(server.useCount)} uses
            </span>
            <span className="text-xs text-muted-foreground">
              {server.qualifiedName}
            </span>
          </div>
        </div>

        {/* External link icon */}
        <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
      </div>
    </a>
  );
}
