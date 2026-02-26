# Stripe Local Development Setup

A self-contained guide for getting Stripe running locally.

---

## 1. Prerequisites

Install the Stripe CLI (required for webhook forwarding):

```bash
brew install stripe/stripe-cli/stripe
stripe login
```

`stripe login` opens a browser to authenticate your account. You only need to do this once.

---

## 2. Environment Variables

Copy `.env.example` to `.env` and fill in the Stripe values:

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Backend API key — Stripe Dashboard → Developers → API keys (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Signing secret printed by `stripe listen` on first run (`whsec_...`) — see [step 3](#3-getting-the-webhook-secret-local) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | Client-side key (`pk_test_...`). Only needed if adding Stripe Elements to the frontend |
| `TOKEN_CENTS_PER_1000` | No | Price per 1,000 tokens in cents. Default `1` = $0.01/1k tokens = $10/million |
| `NEXT_PUBLIC_TOKEN_CENTS_PER_1000` | No | Same value, exposed to the client for pricing calculations |
| `STRIPE_PORTAL_CONFIGURATION_ID` | No | Stripe Billing Portal Configuration ID (`bpc_...`). Without it, the portal opens with default settings |
| `APP_URL` | Yes | Must be `http://localhost:3000` locally — used as the redirect URL for checkout and portal sessions |

---

## 3. Getting the Webhook Secret (local)

The `STRIPE_WEBHOOK_SECRET` for local dev is **not** the one from the Stripe Dashboard. It's printed by the CLI when you start the listener:

```bash
pnpm dev:stripe
# Output: Ready! Your webhook signing secret is whsec_abc123...
```

Copy that `whsec_...` value into `.env` as `STRIPE_WEBHOOK_SECRET`.

> **Note:** The Dashboard webhook secret (for production) is a different value. Don't mix them up.

---

## 4. Running Locally

To start everything at once:

```bash
pnpm dev:all
# Starts: Next.js (port 3000) + Inngest dev server + Stripe webhook listener
```

Or run the Stripe listener on its own:

```bash
pnpm dev:stripe
# Forwards Stripe events → localhost:3000/api/stripe/webhook
```

---

## 5. Stripe Product Setup

Plans are fetched live from Stripe at runtime. Each product needs the following metadata set in the Stripe Dashboard:

| Metadata Key | Required | Example Values |
|---|---|---|
| `type` | Yes | Must be `ws_subscription` |
| `plan_tier` | Yes | `free`, `basic`, or `pro` |
| `max_workspaces` | Yes | `1`, `2`, `unlimited` |
| `monthly_tokens` | Yes | `50000`, `200000`, `1000000` |

**To set this up:**
1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/test/products) (test mode)
2. Create a product, add a recurring price
3. Under the product's **Metadata** section, add the four keys above

If `STRIPE_SECRET_KEY` is not set, or no products with `type=ws_subscription` exist, the app falls back to hardcoded Free / Basic / Pro defaults.

---

## 6. Triggering Test Webhook Events

With the listener running (`pnpm dev:stripe`), you can trigger test events:

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_succeeded
stripe trigger invoice.payment_failed
```

---

## 7. Portal Configuration (optional)

To use a custom Stripe Billing Portal layout instead of the defaults:

1. Go to Stripe Dashboard → Billing → Customer portal → Create configuration
2. Copy the Configuration ID (`bpc_...`)
3. Add to `.env`: `STRIPE_PORTAL_CONFIGURATION_ID=bpc_...`

---

## 8. Webhook Events Handled

| Event | What it does |
|---|---|
| `checkout.session.completed` | Credits tokens for one-time top-up payments (mode `payment`, metadata `type=token_reload`) |
| `customer.subscription.created` | Initializes subscription row in DB with plan tier, workspace limit, and token quota from product metadata |
| `customer.subscription.updated` | Syncs plan tier, workspace limit, and token quota from product metadata |
| `customer.subscription.deleted` | Downgrades to free plan (50k tokens, 1 workspace) |
| `invoice.payment_succeeded` | Resets monthly token balance to quota, clears auto-reload counter |
| `invoice.payment_failed` | Sets subscription status to `past_due` |

---

## Key Files

- `src/lib/stripe.ts` — Stripe client (lazily initialized via proxy to avoid build-time errors)
- `src/lib/actions/subscription.ts` — all Stripe server actions (checkout, portal, top-up)
- `src/app/api/stripe/webhook/route.ts` — webhook handler with the full event switch
- `.env.example` — source of truth for env var names
- `package.json` — `dev:stripe` and `dev:all` scripts
