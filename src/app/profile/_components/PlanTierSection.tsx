"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    current: true,
    features: ["1 workspace", "1,000 AI tokens/day", "Community support"],
  },
  {
    name: "Pro",
    price: "$49.99",
    period: "/mo",
    current: false,
    features: ["10 workspaces", "50,000 AI tokens/day", "Priority support"],
  },
  {
    name: "Enterprise",
    price: "$249.99",
    period: "/mo",
    current: false,
    features: [
      "Unlimited workspaces",
      "Unlimited AI tokens",
      "Dedicated support",
    ],
  },
] as const;

export function PlanTierSection() {
  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground mb-3">Plan</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              "rounded-lg border bg-card p-6 flex flex-col",
              plan.current
                ? "ring-2 ring-primary border-primary"
                : "border-border"
            )}
          >
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-foreground">
                {plan.name}
              </h4>
              <div className="mt-1">
                <span className="text-2xl font-bold text-foreground">
                  {plan.price}
                </span>
                <span className="text-sm text-muted-foreground">
                  {plan.period}
                </span>
              </div>
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="text-sm text-muted-foreground flex items-start gap-2"
                >
                  <span className="text-primary mt-0.5">&#10003;</span>
                  {feature}
                </li>
              ))}
            </ul>
            {plan.current ? (
              <Button variant="outline" disabled className="w-full">
                Current plan
              </Button>
            ) : (
              <Button variant="outline" disabled className="w-full">
                Coming soon
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
