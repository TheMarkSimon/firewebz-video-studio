# Lemon Squeezy — web (non-Shopify) billing plan

Decision 2026-07-26: Lemon Squeezy over Stripe/Paddle for the web app.
Rationale: merchant-of-record (handles VAT/sales tax globally — important
for an Israel-based founder selling worldwide), hosted checkout overlay,
subscriptions + one-time purchases, simple webhooks.

## Product model (mirrors Shopify pricing EXACTLY)

- Free: 3 lifetime spins (already enforced by SpinUsage ledger).
- Pro Web: $29/mo subscription → 10 spins/month included.
- Extra spins: ONE-TIME "spin pack" purchases (5 spins for $12.50 =
  $2.50/spin) — LS has no per-unit usage billing like Shopify's, so
  packs replace metered overage.
- **Packs are Pro-subscriber-only** (founder-caught pricing bug
  2026-07-26: standalone packs at $2.50/spin would undercut the $29
  subscription — 10 pack spins = $25 < $29 — so nobody would ever
  subscribe). Same rule as Shopify, where overage only exists on an
  active Pro subscription. LS can't gate this itself; OUR app enforces
  it: the pack checkout only renders for users with an active web Pro
  subscription, and the webhook rejects pack orders from
  non-subscribers (auto-refund via LS API + support email).
- Net effect: pricing is identical on both rails (Free 3 → Pro $29/10 →
  $2.50/extra), which also avoids Shopify's rule against offering the
  same service cheaper off-platform.

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
