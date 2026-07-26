# Lemon Squeezy — web (non-Shopify) billing plan

Decision 2026-07-26: Lemon Squeezy over Stripe/Paddle for the web app.
Rationale: merchant-of-record (handles VAT/sales tax globally — important
for an Israel-based founder selling worldwide), hosted checkout overlay,
subscriptions + one-time purchases, simple webhooks.

## Product model (founder-revised 2026-07-26: packs for occasional
## users, subscription for recurring users)

Insight: for most merchants "spin my catalog" is a one-time PROJECT,
not a monthly habit — subscription-only gates out the biggest segment.
Rule that keeps it coherent: pay-as-you-go always costs MORE per spin
than the subscription, so Pro stays the best deal for recurring use.

- Free: 3 lifetime spins (SpinUsage ledger, already enforced).
- **Spin Pack (public, NO subscription needed): 10 spins for $30**
  ($3.00/spin) — the one-time catalog-project offer.
- **Pro Web: $29/mo → 10 spins/month included** ($2.90/spin) — for
  stores that keep adding products.
- **Pro extras (subscriber-only): 5 spins for $12.50** ($2.50/spin) —
  matches the Shopify overage rate; gated in OUR app (checkout link
  only rendered for active subscribers).
- Compliance note: the public pack's per-spin price ($3.00) is HIGHER
  than Shopify's $2.50 overage, so web never undercuts Shopify billing.
- Sub-and-cancel arbitrage ($29 for 10 vs $30 pack) exists and is
  accepted — costs $1, standard SaaS reality.

## LS products to create (revised)

1. "Spinr Pro" — subscription, $29/month.
2. "Spin Pack — 10 spins" — single payment, $30 (public offer).
3. "Pro Extra Spins — 5 spins" — single payment, $12.50, description
   states it requires an active Spinr Pro subscription (app-gated).

## Founder steps (blocking — only you can do these)

1. Create account at lemonsqueezy.com (personal email). Create a store
   ("Spinr").
2. Complete identity/payout onboarding (bank details; they remit as MoR).
3. Create products:
   - "Spinr Pro" — subscription, $29/month.
   - "Spin Pack (5 spins)" — one-time, $12.50.
4. Settings → API: create an API key.
5. Settings → Webhooks: add https://thespinr.com/api/webhooks/lemonsqueezy
   with a signing secret; enable subscription_created, subscription_updated,
   subscription_expired, subscription_cancelled, order_created.
6. Hand the agent: API key, store ID, both variant IDs, webhook secret →
   they go into Vercel env (LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID,
   LEMONSQUEEZY_PRO_VARIANT_ID, LEMONSQUEEZY_PACK_VARIANT_ID,
   LEMONSQUEEZY_WEBHOOK_SECRET).

## Build plan (agent, after the keys arrive)

1. Prisma: add `webPlan` fields on User (or a WebSubscription table):
   lsCustomerId, lsSubscriptionId, status, renewsAt; spin packs land as
   SpinUsage credits.
2. lib/lemonsqueezy.ts: checkout URL builder (prefilled email + userId in
   checkout custom data), webhook signature verify (HMAC-SHA256).
3. /api/webhooks/lemonsqueezy: idempotent handler → update plan state /
   grant pack credits.
4. billing.ts getPlanState: web-pro branch (10/mo included via ledger,
   packs as extra free-kind credits).
5. Studio plan card: upgrade button → LS checkout overlay; manage/cancel
   → LS customer portal link.
6. Test mode end-to-end (LS has test mode), then live.

Estimated: one focused session once step 1-6 founder items are done.
