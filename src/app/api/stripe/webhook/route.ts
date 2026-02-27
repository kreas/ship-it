import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { subscriptions, subscriptionEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { Stripe } from "stripe";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

/** Only process subscriptions for products with metadata.type === "ws_subscription". */
async function isWsSubscription(subscription: Stripe.Subscription): Promise<boolean> {
  const productId = subscription.items?.data?.[0]?.price?.product;
  if (!productId) return false;
  const id = typeof productId === "string" ? productId : productId.id;
  try {
    const product = await stripe.products.retrieve(id);
    return product.metadata?.type === "ws_subscription";
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, event.id);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpserted(event.data.object as Stripe.Subscription, event.id);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, event.id);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, event.id);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }
  } catch (err) {
    console.error(`Error handling webhook ${event.type}:`, err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, eventId: string) {
  // Token top-up via one-time payment
  if (session.mode === "payment" && session.payment_intent) {
    const paymentIntent = await stripe.paymentIntents.retrieve(
      session.payment_intent as string
    );
    const meta = paymentIntent.metadata;

    if (meta?.type === "token_reload" && meta?.userId && meta?.tokens) {
      const tokens = parseInt(meta.tokens);
      const sub = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, meta.userId))
        .get();

      if (sub) {
        const newBalance = sub.tokensRemaining + tokens;
        await db
          .update(subscriptions)
          .set({
            tokensRemaining: newBalance,
            manualTopUpTokensAdded: (sub.manualTopUpTokensAdded ?? 0) + tokens,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.userId, meta.userId));

        await db.insert(subscriptionEvents).values({
          userId: meta.userId,
          type: "tokens_topped_up",
          tokensAdded: tokens,
          tokensBalance: newBalance,
          stripeEventId: eventId,
        });
      }
    }
  }
}

async function handleSubscriptionUpserted(subscription: Stripe.Subscription, eventId: string) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;
  if (!(await isWsSubscription(subscription))) return;

  const item = subscription.items.data[0];
  const priceId = item?.price?.id;
  const productId = item?.price?.product as string | undefined;

  // In Stripe API 2026-02-25.clover, period is on the subscription item
  const periodStart = item?.current_period_start;
  const periodEnd = item?.current_period_end;

  let planTier: "free" | "basic" | "pro" = "free";
  let workspaceLimit: number | null = 1;
  let monthlyTokenQuota = 0;

  if (productId) {
    try {
      const product = await stripe.products.retrieve(productId);
      planTier = (product.metadata?.plan_tier ?? "free") as "free" | "basic" | "pro";
      workspaceLimit =
        product.metadata?.max_workspaces === "unlimited"
          ? null
          : parseInt(product.metadata?.max_workspaces ?? "1");
      monthlyTokenQuota = parseInt(product.metadata?.monthly_tokens ?? "0");
    } catch {
      // use defaults
    }
  }

  const existing = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .get();

  const now = new Date();

  if (existing) {
    await db
      .update(subscriptions)
      .set({
        stripeSubscriptionId: subscription.id,
        stripePriceId: priceId ?? null,
        plan: planTier,
        status: subscription.status,
        workspaceLimit,
        monthlyTokenQuota,
        currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        updatedAt: now,
      })
      .where(eq(subscriptions.userId, userId));

    // Log appropriate ledger event
    if (existing.plan !== planTier) {
      await db.insert(subscriptionEvents).values({
        userId,
        type: "plan_changed",
        fromPlan: existing.plan,
        toPlan: planTier,
        stripeEventId: eventId,
      });
    } else if (!existing.cancelAtPeriodEnd && subscription.cancel_at_period_end) {
      await db.insert(subscriptionEvents).values({
        userId,
        type: "cancellation_scheduled",
        fromPlan: existing.plan,
        toPlan: existing.plan,
        stripeEventId: eventId,
      });
    } else if (existing.cancelAtPeriodEnd && !subscription.cancel_at_period_end) {
      await db.insert(subscriptionEvents).values({
        userId,
        type: "cancellation_reversed",
        fromPlan: existing.plan,
        toPlan: existing.plan,
        stripeEventId: eventId,
      });
    }
  } else {
    await db.insert(subscriptions).values({
      userId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId ?? null,
      plan: planTier,
      status: subscription.status,
      workspaceLimit,
      monthlyTokenQuota,
      tokensRemaining: monthlyTokenQuota,
      currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(subscriptionEvents).values({
      userId,
      type: "plan_created",
      fromPlan: null,
      toPlan: planTier,
      stripeEventId: eventId,
    });
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, eventId: string) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;
  if (!(await isWsSubscription(subscription))) return;

  const existing = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .get();

  const FREE_QUOTA = 50_000;
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  await db
    .update(subscriptions)
    .set({
      plan: "free",
      status: "active",
      stripeSubscriptionId: null,
      stripePriceId: null,
      workspaceLimit: 1,
      monthlyTokenQuota: FREE_QUOTA,
      cancelAtPeriodEnd: false,
      tokensRemaining: FREE_QUOTA,
      tokensResetAt: nextMonth,
      autoReloadEnabled: false,
      autoReloadAmount: null,
      autoReloadThreshold: null,
      maxMonthlyAutoReload: null,
      monthlyAutoReloadedSoFar: 0,
      monthlyAutoReloadResetAt: now,
      manualTopUpTokensAdded: 0,
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      updatedAt: now,
    })
    .where(eq(subscriptions.userId, userId));

  await db.insert(subscriptionEvents).values({
    userId,
    type: "plan_deleted",
    fromPlan: existing?.plan ?? null,
    toPlan: "free",
    stripeEventId: eventId,
  });
}

function getSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  // In newer Stripe API, subscription is nested under parent.subscription_details
  const parent = invoice.parent;
  if (parent?.type === "subscription_details" && parent.subscription_details?.subscription) {
    const sub = parent.subscription_details.subscription;
    return typeof sub === "string" ? sub : sub.id;
  }
  return null;
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, eventId: string) {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;

  const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = stripeSub.metadata?.userId;
  if (!userId) return;
  if (!(await isWsSubscription(stripeSub))) return;

  const existing = await db
  .select()
  .from(subscriptions)
  .where(eq(subscriptions.userId, userId))
  .get();

  if (!existing) return;

  const item = stripeSub.items.data[0];
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000)
    : null;

  const newQuota = existing.monthlyTokenQuota ?? 0;

  await db
    .update(subscriptions)
    .set({
      tokensRemaining: newQuota,
      tokensResetAt: periodEnd,
      monthlyAutoReloadedSoFar: 0,
      monthlyAutoReloadResetAt: new Date(),
      manualTopUpTokensAdded: 0,
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));

  await db.insert(subscriptionEvents).values({
    userId,
    type: "tokens_reset",
    tokensAdded: newQuota,
    tokensBalance: newQuota,
    stripeEventId: eventId,
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = getSubscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;

  const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = stripeSub.metadata?.userId;
  if (!userId) return;
  if (!(await isWsSubscription(stripeSub))) return;

  await db
  .update(subscriptions)
  .set({ status: "past_due", updatedAt: new Date() })
  .where(eq(subscriptions.userId, userId));
}
