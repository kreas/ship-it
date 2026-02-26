import { inngest } from "../client";
import { db } from "../../db";
import { subscriptions, subscriptionEvents } from "../../db/schema";
import { eq } from "drizzle-orm";
import { stripe, centsFromTokens } from "../../stripe";

export const autoReloadTokens = inngest.createFunction(
  { id: "auto-reload-tokens", name: "Auto-Reload Tokens" },
  { event: "stripe/auto-reload-tokens" },
  async ({ event, step }) => {
    const { userId } = event.data;

    const sub = await step.run("get-subscription", async () => {
      return db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .get();
    });

    if (
      !sub ||
      !sub.stripeCustomerId ||
      !sub.autoReloadEnabled ||
      !sub.autoReloadAmount
    ) {
      return { skipped: true, reason: "Auto-reload not configured" };
    }

    // Check monthly cap
    const cap = sub.maxMonthlyAutoReload ?? Infinity;
    const alreadyReloaded = sub.monthlyAutoReloadedSoFar ?? 0;
    if (alreadyReloaded + sub.autoReloadAmount > cap) {
      return { skipped: true, reason: "Monthly auto-reload cap reached" };
    }

    // Get default payment method from customer
    const customer = await step.run("get-customer", async () => {
      return stripe.customers.retrieve(sub.stripeCustomerId!) as Promise<import("stripe").Stripe.Customer>;
    });

    const paymentMethodId =
      "invoice_settings" in customer
        ? (customer.invoice_settings?.default_payment_method as string | null)
        : null;

    if (!paymentMethodId) {
      return { skipped: true, reason: "No default payment method on file" };
    }

    const amountCents = centsFromTokens(sub.autoReloadAmount);

    const paymentIntent = await step.run("charge-card", async () => {
      return stripe.paymentIntents.create({
        amount: amountCents,
        currency: "usd",
        customer: sub.stripeCustomerId!,
        payment_method: paymentMethodId,
        confirm: true,
        off_session: true,
        metadata: {
          userId,
          tokens: sub.autoReloadAmount!.toString(),
          type: "auto_reload",
        },
      });
    });

    if (paymentIntent.status === "succeeded") {
      await step.run("update-balance", async () => {
        const current = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, userId))
          .get();

        if (!current) return;

        const newBalance = current.tokensRemaining + sub.autoReloadAmount!;

        await db
          .update(subscriptions)
          .set({
            tokensRemaining: newBalance,
            monthlyAutoReloadedSoFar:
              current.monthlyAutoReloadedSoFar + sub.autoReloadAmount!,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.userId, userId));

        await db.insert(subscriptionEvents).values({
          userId,
          type: "tokens_auto_reloaded",
          tokensAdded: sub.autoReloadAmount!,
          tokensBalance: newBalance,
          stripeEventId: paymentIntent.id,
        });
      });

      return {
        success: true,
        tokensAdded: sub.autoReloadAmount,
        amountCents,
      };
    }

    return { skipped: true, reason: `Payment status: ${paymentIntent.status}` };
  }
);
