"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Layers } from "lucide-react";

interface WorkspacesSectionProps {
  workspaces: Array<{
    id: string;
    name: string;
    slug: string;
    purpose: string;
    role: string;
  }>;
}

export function WorkspacesSection({ workspaces }: WorkspacesSectionProps) {
  return (
    <div className="border-b border-border">
      <div className="px-6 pt-6 pb-2">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Workspaces</h3>
      </div>
      {workspaces.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-6 h-6 text-muted-foreground" />}
          title="No workspaces"
          description="You're not a member of any workspaces yet"
        />
      ) : (
        <div>
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              className="flex items-center justify-between gap-4 px-6 py-3 border-b border-border last:border-b-0"
            >
              <Link
                href={`/w/${ws.slug}`}
                className="flex items-center gap-3 min-w-0 hover:underline"
              >
                <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                  <Layers className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground truncate">
                  {ws.name}
                </span>
              </Link>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="secondary" className="capitalize">
                  {ws.role}
                </Badge>
                <span className="text-xs text-muted-foreground capitalize">
                  {ws.purpose}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
