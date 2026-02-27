# Project Memory

Shared learnings and context that persist across sessions for all contributors.

## Scripts

- `scripts/worktree <name>` - Create a worktree at `.worktrees/<name>` with branch `feature/<name>`, install deps, run migrations, launch Claude
- `scripts/worktree-clean` - Dry-run check for worktrees with branches merged into main; use `--force` to remove them

## Patterns

<!-- Add project patterns, conventions, and architectural decisions here -->

## Gotchas

- Turbopack requires `.tsx` extension for any file containing JSX — `.ts` files with JSX fail with cryptic "Expected '>', got 'src'" errors
- Stripe SDK v20.x uses `2026-02-25.clover` API version; `current_period_start/end` moved from `Subscription` to `SubscriptionItem` (access via `subscription.items.data[0].current_period_start`); invoice subscription is now `invoice.parent.subscription_details.subscription`
- Stripe client must be lazily initialized (via proxy) to avoid "Neither apiKey nor config.authenticator provided" at Next.js build time when env var is absent

## Decisions

- Stripe subscription plans use Stripe product metadata (`type=ws_subscription`, `plan_tier`, `max_workspaces`, `monthly_tokens`) to keep plan config in one place; code falls back to hardcoded defaults when Stripe is unconfigured
