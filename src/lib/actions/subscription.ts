"use server";

import { redirect } from "next/navigation";
import { db } from "../db";
import { subscriptions, workspaces } from "../db/schema";
import { eq, count } from "drizzle-orm";
import { stripe, tokensFromCents } from "../stripe";
import { requireActiveUser } from "./workspace";
import type { Stripe } from "stripe";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

// Free plan defaults
const FREE_PLAN_QUOTA = 50_000;
const FREE_WORKSPACE_LIMIT = 1;

export type Subscription = typeof subscriptions.$inferSelect;

export type SubscriptionPlan = {
  product: Stripe.Product;
  price: Stripe.Price | null;
  planTier: "free" | "basic" | "pro";
  maxWorkspaces: number | null;
  monthlyTokens: number;
};

export type Invoice = {
  id: string;
  date: Date;
  description: string;
  amountPaid: number; // cents
  status: string;
  hostedInvoiceUrl: string | null;
};

/**
 * Get or create a subscriptions row for a user (initializes to free plan).
 */
export async function ensureSubscription(userId: string): Promise<Subscription> {
  const existing = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .get();

  if (existing) return existing;

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await db.insert(subscriptions).values({
    userId,
    plan: "free",
    status: "active",
    workspaceLimit: FREE_WORKSPACE_LIMIT,
    monthlyTokenQuota: FREE_PLAN_QUOTA,
    tokensRemaining: FREE_PLAN_QUOTA,
    tokensResetAt: periodEnd,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
  });

  return (await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .get())!;
}

/**
 * Get the current user's subscription row (creates free plan if missing).
 */
export async function getUserSubscription(): Promise<Subscription> {
  const user = await requireActiveUser();
  return ensureSubscription(user.id);
}

/**
 * Fetch subscription plans live from Stripe on every request.
 * Plans must have metadata: type=ws_subscription, plan_tier, max_workspaces, monthly_tokens
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  if (!process.env.STRIPE_SECRET_KEY) {
    return getDefaultPlans();
  }

  try {
    const products = await stripe.products.list({ active: true, limit: 100 });
    const wsProducts = products.data.filter(
      (p) => p.metadata?.type === "ws_subscription"
    );

    const plans: SubscriptionPlan[] = await Promise.all(
      wsProducts.map(async (product) => {
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
          limit: 1,
        });
        const price = prices.data[0] ?? null;
        const planTier = (product.metadata?.plan_tier ?? "free") as "free" | "basic" | "pro";
        const maxWorkspaces =
          product.metadata?.max_workspaces === "unlimited"
            ? null
            : parseInt(product.metadata?.max_workspaces ?? "1");
        const monthlyTokens = parseInt(product.metadata?.monthly_tokens ?? "0");

        return { product, price, planTier, maxWorkspaces, monthlyTokens };
      })
    );

    const tierOrder = { free: 0, basic: 1, pro: 2 };
    return plans.sort((a, b) => tierOrder[a.planTier] - tierOrder[b.planTier]);
  } catch {
    return getDefaultPlans();
  }
}

function makeProduct(id: string, name: string, planTier: string): Stripe.Product {
  return { id, name, metadata: { type: "ws_subscription", plan_tier: planTier } } as unknown as Stripe.Product;
}

function getDefaultPlans(): SubscriptionPlan[] {
  return [
    {
      product: makeProduct("free", "Free", "free"),
      price: null,
      planTier: "free",
      maxWorkspaces: 1,
      monthlyTokens: FREE_PLAN_QUOTA,
    },
    {
      product: makeProduct("basic", "Basic", "basic"),
      price: null,
      planTier: "basic",
      maxWorkspaces: 2,
      monthlyTokens: 200_000,
    },
    {
      product: makeProduct("pro", "Pro", "pro"),
      price: null,
      planTier: "pro",
      maxWorkspaces: null,
      monthlyTokens: 1_000_000,
    },
  ];
}

/**
 * Create a Stripe Checkout session for a subscription plan.
 */
export async function createCheckoutSession(priceId: string): Promise<void> {
  const user = await requireActiveUser();
  const subscription = await ensureSubscription(user.id);

  let stripeCustomerId = subscription.stripeCustomerId;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    stripeCustomerId = customer.id;
    await db
      .update(subscriptions)
      .set({ stripeCustomerId, updatedAt: new Date() })
      .where(eq(subscriptions.userId, user.id));
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/profile?tab=billing&success=1`,
    cancel_url: `${APP_URL}/profile?tab=billing`,
    subscription_data: { metadata: { userId: user.id } },
    payment_method_collection: "always",
  });

  redirect(session.url!);
}

/**
 * Create a Stripe Customer Portal session.
 */
export async function createPortalSession(): Promise<void> {
  const user = await requireActiveUser();
  const subscription = await ensureSubscription(user.id);

  if (!subscription.stripeCustomerId) {
    throw new Error("No billing account found. Please subscribe to a plan first.");
  }

  const portalConfigId = process.env.STRIPE_PORTAL_CONFIGURATION_ID;

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${APP_URL}/profile?tab=billing`,
    ...(portalConfigId ? { configuration: portalConfigId } : {}),
  });

  redirect(session.url);
}

/**
 * Create a Stripe Checkout session for a manual token top-up.
 */
export async function manualReloadTokens(amountCents: number): Promise<void> {
  const user = await requireActiveUser();
  const subscription = await ensureSubscription(user.id);

  if (!subscription.stripeCustomerId) {
    throw new Error("Please subscribe to a plan before adding tokens.");
  }

  const tokens = tokensFromCents(amountCents);
  const { formatTokens } = await import("../token-usage-formatters");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: subscription.stripeCustomerId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: `${formatTokens(tokens)} AI tokens`,
            metadata: { type: "token_reload" },
          },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      metadata: {
        userId: user.id,
        tokens: tokens.toString(),
        type: "token_reload",
      },
    },
    success_url: `${APP_URL}/profile?tab=billing&reload=success`,
    cancel_url: `${APP_URL}/profile?tab=billing`,
  });

  redirect(session.url!);
}

/**
 * Update auto-reload settings for the current user's subscription.
 */
export async function updateAutoReloadSettings(settings: {
  autoReloadEnabled: boolean;
  autoReloadAmount?: number;
  autoReloadThreshold?: number;
  maxMonthlyAutoReload?: number;
}): Promise<{ success: boolean; message: string }> {
  const user = await requireActiveUser();

  await db
    .update(subscriptions)
    .set({
      autoReloadEnabled: settings.autoReloadEnabled,
      autoReloadAmount: settings.autoReloadAmount ?? null,
      autoReloadThreshold: settings.autoReloadThreshold ?? null,
      maxMonthlyAutoReload: settings.maxMonthlyAutoReload ?? null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, user.id));

  return { success: true, message: "Auto-reload settings saved." };
}

/**
 * Deduct tokens from the workspace owner's subscription balance.
 * Triggers auto-reload via Inngest if threshold is met.
 */
export async function deductTokens(
  ownerId: string,
  tokens: number
): Promise<void> {
  const sub = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, ownerId))
    .get();

  if (!sub) return;

  const newBalance = Math.max(0, sub.tokensRemaining - tokens);

  await db
    .update(subscriptions)
    .set({ tokensRemaining: newBalance, updatedAt: new Date() })
    .where(eq(subscriptions.userId, ownerId));

  // Check auto-reload conditions
  if (
    sub.autoReloadEnabled &&
    sub.autoReloadThreshold !== null &&
    sub.autoReloadAmount !== null &&
    newBalance < sub.autoReloadThreshold &&
    sub.stripeCustomerId
  ) {
    const cap = sub.maxMonthlyAutoReload ?? Infinity;
    const alreadyReloaded = sub.monthlyAutoReloadedSoFar ?? 0;

    if (alreadyReloaded + sub.autoReloadAmount <= cap) {
      const { inngest } = await import("../inngest/client");
      await inngest.send({
        name: "stripe/auto-reload-tokens",
        data: { userId: ownerId },
      });
    }
  }
}

/**
 * Get recent invoices for the current user from Stripe.
 */
export async function getUserInvoices(): Promise<Invoice[]> {
  const user = await requireActiveUser();
  const subscription = await ensureSubscription(user.id);

  if (!subscription.stripeCustomerId || !process.env.STRIPE_SECRET_KEY) {
    return [];
  }

  try {
    const invoices = await stripe.invoices.list({
      customer: subscription.stripeCustomerId,
      limit: 10,
    });

    return invoices.data.map((inv) => ({
      id: inv.id,
      date: new Date((inv.created ?? 0) * 1000),
      description: inv.lines?.data?.[0]?.description ?? "Invoice",
      amountPaid: inv.amount_paid,
      status: inv.status ?? "unknown",
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
    }));
  } catch {
    return [];
  }
}

/**
 * Get owned workspace count for a user.
 */
export async function getOwnedWorkspaceCount(userId: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(workspaces)
    .where(eq(workspaces.ownerId, userId))
    .get();

  return result?.count ?? 0;
}
