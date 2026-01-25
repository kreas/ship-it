"use client";

import { cn } from "@/lib/utils";
import { CheckSquare } from "lucide-react";
import type { SubtaskCount } from "@/lib/types";

interface SubtaskProgressProps {
  count: SubtaskCount;
  size?: "sm" | "md";
  showBar?: boolean;
  className?: string;
}

export function SubtaskProgress({
  count,
  size = "sm",
  showBar = false,
  className,
}: SubtaskProgressProps) {
  if (count.total === 0) return null;

  const percentage = Math.round((count.completed / count.total) * 100);
  const isComplete = count.completed === count.total;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <CheckSquare
        className={cn(
          size === "sm" ? "w-3 h-3" : "w-4 h-4",
          isComplete ? "text-status-done" : "text-muted-foreground"
        )}
      />

      {showBar ? (
        <div className="flex items-center gap-2 flex-1">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isComplete ? "bg-status-done" : "bg-primary"
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span
            className={cn(
              "text-xs tabular-nums",
              isComplete ? "text-status-done" : "text-muted-foreground"
            )}
          >
            {count.completed}/{count.total}
          </span>
        </div>
      ) : (
        <span
          className={cn(
            size === "sm" ? "text-[10px]" : "text-xs",
            "tabular-nums",
            isComplete ? "text-status-done" : "text-muted-foreground"
          )}
        >
          {count.completed}/{count.total}
        </span>
      )}
    </div>
  );
}
