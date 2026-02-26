import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
    });
  }
  return _stripe;
}

// Convenience export for files that import `stripe` directly
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Cents per 1000 tokens (e.g., 1 = $0.01 per 1000 tokens = $10/million tokens)
export const TOKEN_CENTS_PER_1000 = parseInt(
  process.env.TOKEN_CENTS_PER_1000 ?? "1"
);

export function tokensFromCents(cents: number): number {
  return Math.floor((cents / TOKEN_CENTS_PER_1000) * 1000);
}

export function centsFromTokens(tokens: number): number {
  return Math.ceil((tokens / 1000) * TOKEN_CENTS_PER_1000);
}
