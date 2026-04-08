"use client";

import type { RunwayFlag, FlagSeverity } from "@/lib/runway/flags";

const SEVERITY_STYLES: Record<FlagSeverity, { icon: string; border: string; text: string }> = {
  critical: {
    icon: "text-red-400",
    border: "border-red-500/30",
    text: "text-red-300",
  },
  warning: {
    icon: "text-amber-400",
    border: "border-amber-500/30",
    text: "text-amber-300",
  },
  info: {
    icon: "text-sky-400",
    border: "border-sky-500/30",
    text: "text-sky-300",
  },
};

const SEVERITY_LABELS: Record<FlagSeverity, string> = {
  critical: "Critical",
  warning: "Warning",
  info: "Info",
};

function FlagCard({ flag }: { flag: RunwayFlag }) {
  const style = SEVERITY_STYLES[flag.severity];
  return (
    <div className={`rounded-lg border ${style.border} bg-background/50 p-3`}>
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 text-sm ${style.icon}`} aria-hidden>
          {flag.severity === "critical" ? "\u26A0" : flag.severity === "warning" ? "\u25B2" : "\u25CF"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{flag.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{flag.detail}</p>
        </div>
      </div>
    </div>
  );
}

interface FlagsPanelProps {
  flags: RunwayFlag[];
}

export function FlagsPanel({ flags }: FlagsPanelProps) {
  if (flags.length === 0) return null;

  // Group by severity
  const grouped = new Map<FlagSeverity, RunwayFlag[]>();
  for (const flag of flags) {
    const list = grouped.get(flag.severity) ?? [];
    list.push(flag);
    grouped.set(flag.severity, list);
  }

  const severityOrder: FlagSeverity[] = ["critical", "warning", "info"];

  return (
    <aside className="hidden w-80 shrink-0 xl:block">
      <div className="sticky top-[73px] max-h-[calc(100vh-73px)] overflow-y-auto rounded-xl border border-border bg-card/50 p-4">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-display text-lg font-bold text-foreground">
            Flags
          </h2>
          <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium text-foreground">
            {flags.length}
          </span>
        </div>
        <div className="space-y-4">
          {severityOrder.map((severity) => {
            const group = grouped.get(severity);
            if (!group?.length) return null;
            const style = SEVERITY_STYLES[severity];
            return (
              <div key={severity}>
                <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${style.text}`}>
                  {SEVERITY_LABELS[severity]} ({group.length})
                </p>
                <div className="space-y-2">
                  {group.map((flag) => (
                    <FlagCard key={flag.id} flag={flag} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
