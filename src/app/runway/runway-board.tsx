"use client";

import { useState } from "react";
import type { ItemStatus, DayItem, Account, PipelineItem } from "./data";

type View = "triage" | "accounts" | "pipeline";

interface RunwayBoardProps {
  thisWeek: DayItem[];
  upcoming: DayItem[];
  accounts: Account[];
  pipeline: PipelineItem[];
}

const STATUS_STYLES: Record<ItemStatus, { label: string; className: string }> = {
  "in-production": {
    label: "In Production",
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  "awaiting-client": {
    label: "Awaiting Client",
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  "not-started": {
    label: "Not Started",
    className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  },
  blocked: {
    label: "Blocked",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  "on-hold": {
    label: "On Hold",
    className: "bg-zinc-500/20 text-zinc-500 border-zinc-500/30",
  },
  completed: {
    label: "Complete",
    className: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  },
  unsigned: {
    label: "Unsigned",
    className: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  },
};

const TYPE_INDICATORS: Record<string, string> = {
  delivery: "text-emerald-400",
  review: "text-sky-400",
  kickoff: "text-violet-400",
  deadline: "text-amber-400",
  approval: "text-amber-400",
  launch: "text-rose-400",
};

function StatusBadge({ status }: { status: ItemStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${style.className}`}
    >
      {style.label}
    </span>
  );
}

function StaleBadge({ days }: { days: number }) {
  if (days < 7) return null;
  const weeks = Math.floor(days / 7);
  const color =
    days >= 30
      ? "bg-red-500/20 text-red-400 border-red-500/30"
      : "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {weeks}w waiting
    </span>
  );
}

function DayColumn({ day }: { day: DayItem }) {
  const isToday =
    new Date(day.date + "T12:00:00").toDateString() ===
    new Date().toDateString();

  return (
    <div
      className={`rounded-xl border p-4 ${
        isToday
          ? "border-sky-500/40 bg-sky-500/5"
          : "border-border bg-card/50"
      }`}
    >
      <h3
        className={`mb-3 text-lg font-semibold ${
          isToday ? "text-sky-400" : "text-foreground"
        }`}
      >
        {isToday && (
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-sky-400" />
        )}
        {day.label}
      </h3>
      <div className="space-y-2">
        {day.items.map((item, i) => (
          <div
            key={i}
            className="rounded-lg border border-border/50 bg-background/50 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug text-foreground">
                  {item.title}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {item.account}
                  </span>
                  {item.owner && (
                    <>
                      <span className="text-xs text-muted-foreground/50">
                        /
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {item.owner}
                      </span>
                    </>
                  )}
                </div>
                {item.notes && (
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {item.notes}
                  </p>
                )}
              </div>
              <span
                className={`mt-0.5 text-xs font-medium uppercase tracking-wider ${
                  TYPE_INDICATORS[item.type] ?? "text-muted-foreground"
                }`}
              >
                {item.type}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountSection({ account }: { account: Account }) {
  const activeItems = account.items.filter(
    (i) => i.category === "active" || i.category === "awaiting-client"
  );
  const holdItems = account.items.filter((i) => i.category === "on-hold");

  return (
    <div className="rounded-xl border border-border bg-card/30 p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold text-foreground">{account.name}</h3>
          {account.team && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {account.team}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">
            {account.contractValue}
          </p>
          <p className="text-xs text-muted-foreground">
            {account.contractTerm}
          </p>
          {account.contractStatus === "expired" && (
            <span className="mt-1 inline-flex items-center rounded-md border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
              SOW Expired
            </span>
          )}
          {account.contractStatus === "unsigned" && (
            <span className="mt-1 inline-flex items-center rounded-md border border-violet-500/30 bg-violet-500/20 px-2 py-0.5 text-xs font-medium text-violet-400">
              SOW Unsigned
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {activeItems.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-lg border border-border/50 bg-background/50 p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground/50">
                  {item.id}
                </span>
                <StatusBadge status={item.status} />
                {item.staleDays && <StaleBadge days={item.staleDays} />}
              </div>
              <p className="mt-1 text-sm font-medium text-foreground">
                {item.title}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                {item.owner && (
                  <span className="text-xs text-muted-foreground">
                    Owner: {item.owner}
                  </span>
                )}
                {item.waitingOn && (
                  <span className="text-xs text-amber-400/80">
                    Waiting on: {item.waitingOn}
                  </span>
                )}
                {item.target && (
                  <span className="text-xs text-sky-400/80">
                    Target: {item.target}
                  </span>
                )}
              </div>
              {item.notes && (
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {item.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {holdItems.length > 0 && (
        <div className="mt-3 border-t border-border/30 pt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/50">
            On Hold
          </p>
          {holdItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-muted-foreground/60"
            >
              <span className="font-mono">{item.id}</span>
              <span>{item.title}</span>
              {item.notes && <span>— {item.notes}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PipelineRow({ item }: { item: PipelineItem }) {
  const statusLabel: Record<string, string> = {
    "sow-sent": "SOW Sent",
    drafting: "Drafting",
    "no-sow": "No SOW",
    verbal: "Verbal",
  };
  const statusColor: Record<string, string> = {
    "sow-sent":
      "bg-amber-500/20 text-amber-400 border-amber-500/30",
    drafting:
      "bg-violet-500/20 text-violet-400 border-violet-500/30",
    "no-sow": "bg-red-500/20 text-red-400 border-red-500/30",
    verbal:
      "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };

  return (
    <div className="flex items-center gap-4 rounded-lg border border-border/50 bg-background/50 p-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {item.account}
          </span>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-sm text-foreground/80">{item.title}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {item.waitingOn && (
            <span className="text-xs text-muted-foreground">
              Waiting on: {item.waitingOn}
            </span>
          )}
          {item.notes && (
            <span className="text-xs text-muted-foreground/60">
              {item.notes}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
            statusColor[item.status]
          }`}
        >
          {statusLabel[item.status]}
        </span>
        <span className="min-w-[5rem] text-right font-mono text-lg font-bold text-foreground">
          {item.value}
        </span>
      </div>
    </div>
  );
}

function TodaySection({ thisWeek }: { thisWeek: DayItem[] }) {
  const todayStr = new Date().toDateString();
  const todayColumn = thisWeek.find(
    (day) => new Date(day.date + "T12:00:00").toDateString() === todayStr
  );

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <section>
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="font-display text-2xl font-bold text-foreground">
          Today
        </h2>
        <span className="text-base text-muted-foreground">{todayFormatted}</span>
      </div>
      {todayColumn && todayColumn.items.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {todayColumn.items.map((item, i) => (
            <div
              key={i}
              className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium leading-snug text-foreground">
                    {item.title}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {item.account}
                    </span>
                    {item.owner && (
                      <>
                        <span className="text-muted-foreground/40">/</span>
                        <span className="text-sm text-muted-foreground">
                          {item.owner}
                        </span>
                      </>
                    )}
                  </div>
                  {item.notes && (
                    <p className="mt-2 text-sm text-muted-foreground/70">
                      {item.notes}
                    </p>
                  )}
                </div>
                <span
                  className={`mt-0.5 shrink-0 text-xs font-medium uppercase tracking-wider ${
                    TYPE_INDICATORS[item.type] ?? "text-muted-foreground"
                  }`}
                >
                  {item.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function RunwayBoard({
  thisWeek,
  upcoming,
  accounts,
  pipeline,
}: RunwayBoardProps) {
  const [view, setView] = useState<View>("triage");

  const pipelineTotal = pipeline
    .filter((p) => p.value !== "TBD")
    .reduce((sum, p) => {
      const num = parseInt(p.value.replace(/[$,]/g, ""), 10);
      return sum + (isNaN(num) ? 0 : num);
    }, 0);

  // Filter out today from the weekly view since it has its own section
  const todayStr = new Date().toDateString();
  const restOfWeek = thisWeek.filter(
    (day) => new Date(day.date + "T12:00:00").toDateString() !== todayStr
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4 2xl:px-10">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
              Civilization Runway
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Live from database
            </p>
          </div>
          <nav className="flex gap-1 rounded-lg border border-border bg-card/50 p-1">
            {(
              [
                { key: "triage", label: "This Week" },
                { key: "accounts", label: "By Account" },
                { key: "pipeline", label: "Pipeline" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setView(tab.key)}
                className={`rounded-md px-5 py-2.5 text-sm font-medium transition-colors ${
                  view === tab.key
                    ? "bg-foreground/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-[1600px] px-6 py-6 2xl:px-10">
        {view === "triage" && (
          <div className="space-y-10">
            {/* Today - top of the page, always */}
            <TodaySection thisWeek={thisWeek} />

            {/* Rest of This Week */}
            {restOfWeek.length > 0 && (
              <section>
                <h2 className="mb-4 font-display text-2xl font-bold text-foreground">
                  This Week
                </h2>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {restOfWeek.map((day) => (
                    <DayColumn key={day.date} day={day} />
                  ))}
                </div>
              </section>
            )}

            {/* Upcoming */}
            <section>
              <h2 className="mb-4 font-display text-2xl font-bold text-foreground">
                Upcoming
              </h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {upcoming.map((day) => (
                  <DayColumn key={day.date} day={day} />
                ))}
              </div>
            </section>
          </div>
        )}

        {view === "accounts" && (
          <div className="space-y-6">
            {accounts.map((account) => (
              <AccountSection key={account.slug} account={account} />
            ))}
          </div>
        )}

        {view === "pipeline" && (
          <div className="space-y-6">
            <div className="flex items-end justify-between">
              <h2 className="font-display text-2xl font-bold text-foreground">
                Unsigned SOWs &amp; New Business
              </h2>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">
                  Total Pipeline
                </p>
                <p className="font-mono text-3xl font-bold text-foreground">
                  ${pipelineTotal.toLocaleString()}+
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {pipeline.map((item, i) => (
                <PipelineRow key={i} item={item} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
