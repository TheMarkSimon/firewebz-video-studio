# Scaling checklist — open this when real customers arrive

Living document. The founder will say something like "I have customers in
the webapp" — that's the trigger to walk this list together, pick what's
due, and PRUNE items that are done or obsolete. Keep it honest: every item
states its trigger and why it matters, so nothing gets built before its
moment (test-before-invest applies here too).

Maintained by the AI agent on founder request (2026-07-11). Remove items
when finished; add items as they're discovered; date additions.

## Do at "first real customers" (the trigger for this file)

- [ ] **Move media off fal.media to owned storage (Cloudflare R2).**
  Every embed frame, MP4, and admin video link points at fal's CDN, which
  makes no permanence promise. One expired asset = a merchant's product
  page breaks silently. R2: ~$0.015/GB-mo, $0 egress (keeps the
  "unlimited free views" promise true). Migration: copy on generation
  completion + backfill script for existing spins. *The single most
  important item here.*
- [ ] **Rate-limit anonymous background removal.** The onboarding
  playground calls a paid API (pennies/image) with no auth and no cap —
  fine at zero traffic, a cost leak under real traffic or bots. Simple
  IP-based limiter; @upstash/redis was removed from deps, so either
  re-add for a durable limiter or use Vercel's WAF rules.
- [ ] **Error alerting.** Today failures are visible only if the founder
  opens /admin or Vercel logs. Add Sentry (or at minimum Vercel log
  alerts) so a broken generation pipeline announces itself.
- [ ] **Weekly Neon backups** (pg_dump cron or Neon PITR tier). The DB is
  the business: users, spins, connections, usage ledger.
- [ ] **Website analytics** (Plausible — one script, privacy-friendly, no
  cookie banner). Funnel visibility: visits → onboarding → generate →
  connect. No admin table answers this.
- [ ] **Encrypt Shopify access tokens at rest** (currently plaintext
  column; flagged in schema comment).

## Do at App Store submission (launch chapter)

- [x] **Theme app extension** — BUILT 2026-07-13 (extensions/spinr-spin:
  "Spinr 360° spin" app block, height/width settings, reads
  custom.spinr_id). Ships with the next `shopify app deploy`; founder
  verification in the theme editor pending.
- [ ] **App Store listing** (copy, screenshots, demo video) + review.
- [x] **Embedded admin app** — BUILT 2026-07-13 (/shopify/app: App Bridge +
  session-token auth + token exchange + Polaris UI + per-shop CSP;
  shadow-user provisioning with web-account merge). Founder verification
  inside a real admin still pending.
- [ ] **Register for the 0% revenue-share plan** in the Partner dashboard
  (before the first real dollar, not after).
- [ ] **Payout setup**: bank details + W-8BEN (founder is an Israeli tax
  resident — not W-9) in Partner dashboard.
- [ ] Go-live switches, in order: distribution approved →
  `SHOPIFY_BILLING_LIVE=1` → `SPINR_QUOTA_ENFORCE=1`.
- [ ] **Google OAuth out of Testing mode** + Workspace for
  contact@thespinr.com, swap the consent-screen support email.
- [ ] **Resend domain verification** + set RESEND_API_KEY (email notify is
  code-complete and dormant).
- [ ] **Israeli side of revenue**: osek patur/murshe registration —
  consult an accountant when real charges are on the horizon.

## Do at scale signals (defer until the signal fires)

- [ ] *Signal: >50 users or first complaint that needs digging* — admin
  upgrades: search/filter, per-user drill-down (spins + quota ledger +
  pushes), churn list, signups/spins-per-day chart.
- [ ] *Signal: support emails arrive* — FAQ page + support flow (the
  Phase 6 idea).
- [ ] *Signal: a merchant with 2+ stores* — multi-store support (schema
  allows it; UI/actions assume one connection via findFirst).
- [ ] *Signal: Vercel/Neon free-tier limits approached* — Vercel Pro
  (~$20/mo) and Neon paid (~$19/mo); already in the cost model.
- [ ] *Signal: catalog-burst merchants (>50 SKUs)* — bulk import UI
  ("select all → convert catalog"); the async pipeline already supports
  it, this is UI + queue pacing.
- [ ] *Signal: drag-smoothness complaints post-hybrid* — bump frame
  extraction 60 → 90/120 (costs ~50-100% more per-view bandwidth; only
  with evidence).
- [ ] *Signal: quality complaints in a specific category* — revisit
  1080p generation (≈2× COGS — reprice first) or provider re-comparison
  (resurrect Kling comparison from git history).
- [ ] *Signal: real non-Shopify customer demand* — payment processor
  comparison (Stripe vs Paddle vs Lemon Squeezy; the latter two are
  merchant-of-record and handle global sales tax for a solo founder).

## Done (kept for the record)

- [x] GDPR compliance webhooks + app/uninstalled + APP_SUBSCRIPTIONS_UPDATE
  (one HMAC-verified endpoint, /api/webhooks/shopify; lifecycle topics
  auto-registered at OAuth callback) (2026-07-12).
- [x] Privacy policy (/privacy) + Terms (/terms), linked in footer —
  founder review pending (2026-07-12).
- [x] App Store install entry (/api/shopify/install: HMAC-checked, straight
  to OAuth; signed-out installs resume after Google sign-in) (2026-07-12).

- [x] Embeds serve directly from CDN, never via /api/proxy (2026-07-10) —
  per-view cost ≈ $0.
- [x] Session cookie valid across apex+www; guaranteed sign-out
  (2026-07-10).
- [x] Expiring Shopify tokens with auto-refresh (2026-07-10).
- [x] Unit tests + smoke suite; security headers; dead deps pruned
  (2026-07-10).
