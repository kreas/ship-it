"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatTokens } from "@/lib/token-usage-formatters";
import {
  createCheckoutSession,
  createPortalSession,
  manualReloadTokens,
  updateAutoReloadSettings,
} from "@/lib/actions/subscription";
import type { Subscription, SubscriptionPlan, Invoice } from "@/lib/actions/subscription";

const TOKEN_CENTS_PER_1000 = parseInt(process.env.NEXT_PUBLIC_TOKEN_CENTS_PER_1000 ?? "1");

interface BillingSectionProps {
  subscription: Subscription;
  plans: SubscriptionPlan[];
  invoices: Invoice[];
}

export function BillingSection({ subscription, plans, invoices }: BillingSectionProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      <CurrentPlanCard subscription={subscription} />
      <PlansGrid subscription={subscription} plans={plans} isPending={isPending} startTransition={startTransition} />
      {invoices.length > 0 && <InvoiceHistory invoices={invoices} />}
      {subscription.plan !== "free" && (
        <TokenManagement subscription={subscription} isPending={isPending} startTransition={startTransition} />
      )}
    </div>
  );
}

function CurrentPlanCard({ subscription }: { subscription: Subscription }) {
  const [isPending, startTransition] = useTransition();

  const planColors: Record<string, string> = {
    free: "bg-muted text-muted-foreground",
    basic: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    pro: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  };

  const quota = subscription.monthlyTokenQuota ?? 0;
  const topUp = subscription.manualTopUpTokensAdded ?? 0;
  const remaining = subscription.tokensRemaining;
  const total = quota + topUp;
  const used = Math.max(0, total - remaining);
  const usedPct = total > 0 ? (used / total) * 100 : 0;
  const quotaPct = total > 0 ? (quota / total) * 100 : 100;
  const hasTopUp = topUp > 0;

  const ownedCount = 0; // This would need to be passed in for accuracy

  return (
    <div className="rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Current Plan
        </h3>
        {subscription.stripeCustomerId && (
          <form action={createPortalSession}>
            <Button variant="ghost" size="sm" type="submit">
              Manage Billing →
            </Button>
          </form>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold capitalize",
            planColors[subscription.plan] ?? planColors.free
          )}
        >
          {subscription.plan}
        </span>
        {subscription.status === "past_due" && (
          <Badge variant="destructive">Past Due</Badge>
        )}
        {subscription.cancelAtPeriodEnd && (
          <Badge variant="outline" className="text-muted-foreground">
            Cancels {subscription.currentPeriodEnd
              ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
              : "end of period"}
          </Badge>
        )}
      </div>

      {quota > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{formatTokens(used)} used</span>
            <span>
              {formatTokens(remaining)} remaining
              {subscription.tokensResetAt && (
                <span className="ml-1">
                  · resets {new Date(subscription.tokensResetAt).toLocaleDateString()}
                </span>
              )}
            </span>
          </div>
          <div className="relative h-2 rounded-full bg-muted overflow-hidden">
            {hasTopUp && (
              <div
                className="absolute right-0 h-full rounded-r-full bg-amber-200 dark:bg-amber-900"
                style={{ width: `${100 - quotaPct}%` }}
              />
            )}
            <div
              className="absolute left-0 h-full rounded-full bg-primary transition-all"
              style={{ width: `${usedPct}%` }}
            />
            {hasTopUp && (
              <div
                className="absolute top-0 h-full w-px bg-border/60"
                style={{ left: `${quotaPct}%` }}
              />
            )}
          </div>
          {hasTopUp && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              +{formatTokens(topUp)} from manual top-up
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PlansGrid({
  subscription,
  plans,
  isPending,
  startTransition,
}: {
  subscription: Subscription;
  plans: SubscriptionPlan[];
  isPending: boolean;
  startTransition: React.TransitionStartFunction;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
        Plans
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = subscription.plan === plan.planTier;
          const priceDisplay = plan.price?.unit_amount
            ? `$${(plan.price.unit_amount / 100).toFixed(2)}/mo`
            : plan.planTier === "free"
            ? "Free"
            : "Contact us";

          const workspaceDisplay =
            plan.maxWorkspaces === null
              ? "Unlimited workspaces"
              : `${plan.maxWorkspaces} workspace${plan.maxWorkspaces !== 1 ? "s" : ""}`;

          return (
            <div
              key={plan.planTier}
              className={cn(
                "rounded-lg border p-6 flex flex-col",
                isCurrent
                  ? "ring-2 ring-primary border-primary"
                  : "border-border"
              )}
            >
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-foreground capitalize">
                  {plan.product.name}
                </h4>
                <div className="mt-1 text-2xl font-bold text-foreground">
                  {priceDisplay}
                </div>
              </div>

              <ul className="space-y-2 mb-6 flex-1 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  {workspaceDisplay}
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  {formatTokens(plan.monthlyTokens)} tokens/month
                </li>
              </ul>

              {isCurrent ? (
                <Button variant="outline" disabled className="w-full">
                  Current plan
                </Button>
              ) : plan.price ? (
                <form
                  action={async () => {
                    startTransition(async () => {
                      await createCheckoutSession(plan.price!.id);
                    });
                  }}
                >
                  <Button
                    variant="default"
                    className="w-full"
                    disabled={isPending}
                    type="submit"
                  >
                    Upgrade →
                  </Button>
                </form>
              ) : (
                <Button variant="outline" disabled className="w-full">
                  Coming soon
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InvoiceHistory({ invoices }: { invoices: Invoice[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
        Invoice History
      </h3>
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 text-muted-foreground font-medium">Date</th>
              <th className="text-left px-4 py-2 text-muted-foreground font-medium">Description</th>
              <th className="text-right px-4 py-2 text-muted-foreground font-medium">Amount</th>
              <th className="text-right px-4 py-2 text-muted-foreground font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-muted-foreground">
                  {inv.date.toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {inv.hostedInvoiceUrl ? (
                    <a
                      href={inv.hostedInvoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline text-foreground"
                    >
                      {inv.description}
                    </a>
                  ) : (
                    inv.description
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  ${(inv.amountPaid / 100).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Badge
                    variant={inv.status === "paid" ? "outline" : "destructive"}
                    className="capitalize"
                  >
                    {inv.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TokenManagement({
  subscription,
  isPending,
  startTransition,
}: {
  subscription: Subscription;
  isPending: boolean;
  startTransition: React.TransitionStartFunction;
}) {
  const [topUpDollars, setTopUpDollars] = useState("");
  const [autoEnabled, setAutoEnabled] = useState(subscription.autoReloadEnabled);
  const [autoAmount, setAutoAmount] = useState(
    subscription.autoReloadAmount?.toString() ?? ""
  );
  const [autoThreshold, setAutoThreshold] = useState(
    subscription.autoReloadThreshold?.toString() ?? ""
  );
  const [monthlyCap, setMonthlyCap] = useState(
    subscription.maxMonthlyAutoReload?.toString() ?? ""
  );
  const [saveMsg, setSaveMsg] = useState("");

  const topUpCents = Math.round(parseFloat(topUpDollars || "0") * 100);
  const topUpTokens = topUpCents > 0 ? Math.floor((topUpCents / TOKEN_CENTS_PER_1000) * 1000) : 0;

  return (
    <div className="rounded-lg border border-border p-6 space-y-6">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
        Token Management
      </h3>

      {/* Manual Top-Up */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Manual Top-Up</h4>
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-1">
            <Label htmlFor="topup-amount">Amount (USD)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="topup-amount"
                type="number"
                min="1"
                step="1"
                className="pl-7"
                placeholder="10"
                value={topUpDollars}
                onChange={(e) => setTopUpDollars(e.target.value)}
              />
            </div>
            {topUpTokens > 0 && (
              <p className="text-xs text-muted-foreground">
                ≈ {formatTokens(topUpTokens)} tokens
              </p>
            )}
          </div>
          <form
            action={async () => {
              if (topUpCents < 100) return;
              startTransition(async () => {
                await manualReloadTokens(topUpCents);
              });
            }}
          >
            <Button type="submit" disabled={isPending || topUpCents < 100}>
              Add Tokens →
            </Button>
          </form>
        </div>
        {topUpCents > 0 && topUpCents < 100 && (
          <p className="text-xs text-destructive">Minimum top-up is $1.00</p>
        )}
      </div>

      {/* Auto-Reload */}
      <div className="space-y-3 border-t border-border pt-5">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Auto-Reload</h4>
          <button
            type="button"
            onClick={() => setAutoEnabled(!autoEnabled)}
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
              autoEnabled ? "bg-primary" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                autoEnabled ? "translate-x-4" : "translate-x-1"
              )}
            />
          </button>
        </div>

        {autoEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="auto-amount">Reload amount (tokens)</Label>
              <Input
                id="auto-amount"
                type="number"
                min="1000"
                step="1000"
                placeholder="100000"
                value={autoAmount}
                onChange={(e) => setAutoAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="auto-threshold">Trigger when below</Label>
              <Input
                id="auto-threshold"
                type="number"
                min="0"
                step="1000"
                placeholder="10000"
                value={autoThreshold}
                onChange={(e) => setAutoThreshold(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="auto-cap">Monthly cap (tokens)</Label>
              <Input
                id="auto-cap"
                type="number"
                min="0"
                step="1000"
                placeholder="500000"
                value={monthlyCap}
                onChange={(e) => setMonthlyCap(e.target.value)}
              />
            </div>
          </div>
        )}

        {subscription.autoReloadEnabled && subscription.maxMonthlyAutoReload && (
          <p className="text-xs text-muted-foreground">
            Monthly auto-reloaded:{" "}
            {formatTokens(subscription.monthlyAutoReloadedSoFar)} /{" "}
            {formatTokens(subscription.maxMonthlyAutoReload)} tokens
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await updateAutoReloadSettings({
                  autoReloadEnabled: autoEnabled,
                  autoReloadAmount: autoAmount ? parseInt(autoAmount) : undefined,
                  autoReloadThreshold: autoThreshold
                    ? parseInt(autoThreshold)
                    : undefined,
                  maxMonthlyAutoReload: monthlyCap ? parseInt(monthlyCap) : undefined,
                });
                setSaveMsg("Settings saved.");
                setTimeout(() => setSaveMsg(""), 3000);
              });
            }}
          >
            Save Settings
          </Button>
          {saveMsg && <span className="text-sm text-muted-foreground">{saveMsg}</span>}
        </div>
      </div>
    </div>
  );
}
