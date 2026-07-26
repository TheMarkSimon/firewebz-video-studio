# Lemon Squeezy — web (non-Shopify) billing plan

Decision 2026-07-26: Lemon Squeezy over Stripe/Paddle for the web app.
Rationale: merchant-of-record (handles VAT/sales tax globally — important
for an Israel-based founder selling worldwide), hosted checkout overlay,
subscriptions + one-time purchases, simple webhooks.

## Product model (mirrors Shopify pricing, adapted)

- Free: 3 lifetime spins (already enforced by SpinUsage ledger).
- Pro Web: $29/mo subscription → 10 spins/month included.
- Extra spins: sold as ONE-TIME "spin pack" purchases (e.g. 5 spins for
  $12.50) instead of metered overage — Lemon Squeezy has no per-unit
  usage billing like Shopify's; packs are simpler and honest.

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
