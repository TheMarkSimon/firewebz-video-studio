# Spinr — project context for AI agents

Read this before touching anything. It is the single source of project truth
for any agent or developer continuing the work on any machine.

## What Spinr is

Spinr (thespinr.com) turns a merchant's existing product photos (1–4 angles)
into an **interactive 360° spin** that shoppers drag with mouse/finger on any
Shopify product page. Founder: Mark Simon (marksimanduyev@gmail.com — personal;
work email must never be entangled with this project). Business stage:
pre-revenue validation beta.

Pipeline: photos → background removal (fal.ai birefnet/v2) → image-to-video
turntable (ByteDance **Seedance v1 lite reference-to-video** on fal.ai,
multi-image, `camera_fixed`, ~$0.5/run) → ffmpeg slices the MP4 into 60 JPEG
frames → canvas "flipbook" scrubber renders the drag interaction (video
scrubbing was too laggy; frames are instant on every device).

## Business context (read before making product decisions)

**Problem.** Interactive 360° product views measurably lift e-commerce
conversion and cut returns (shoppers who "handle" a product buy it and keep
it), but they've required a 360° photography rig or 3D artists — out of reach
for SMB merchants. Spinr's bet: AI video generation collapses that cost to
~$0.50 and three minutes, using photos merchants already have.

**Customer.** Shopify SMB merchants (initial wedge: apparel/footwear, but the
product is deliberately category-agnostic). They are non-technical; they
admire minimal, modern, trustworthy design (Ramp/Notion/Lemonade). They
already have catalog photos — copy and UX must never assign them photography
homework.

**Value proposition.** "The shortest path from a product photo to more
sales." One-line embed, no app install, no theme edits, no 3D anything.

**Unit economics (current).** COGS ≈ $0.71 per generation run (founder-
verified on the fal dashboard, 2026-07: Seedance dominates; bg removal is
pennies). Generated once, cached forever; embeds serve DIRECTLY from CDN
(never via /api/proxy) so views cost ~$0 — the pricing promise is
"unlimited views, we charge for creation." Pricing model (implemented,
env-tunable, enforcement behind SPINR_QUOTA_ENFORCE=1): Free = 3 lifetime
spins; Pro = $29/mo with 10 spins/mo included, then $2.50/spin overage.
A "spin" = one generation run: failures refund, regenerations count.
Merchant payments go through the Shopify Billing API (subscription +
usage charges on the merchant's Shopify invoice) — mandatory for App
Store distribution anyway. A processor for non-Shopify customers (Stripe
vs. Paddle vs. Lemon Squeezy) is deliberately undecided.

**Stage & strategy.** Pre-revenue validation. The operating philosophy is
test-before-invest: prove value with a handful of real merchants before
building more surface area. The founder is a fraud-prevention PM by day and
applies PM discipline — expect him to ask "what does this teach us / does a
merchant care?" before approving scope. Current validation priorities:
(1) generate spins across ~5 product categories to find where quality holds,
(2) get the widget onto a real Shopify dev store, (3) 3–5 merchant
conversations with the live demo. Model-swapping and infra work are explicitly
NOT priorities until real merchant feedback demands them.

**History (why the product looks like this).** v1 was AI social-media videos
(Runway) — output quality killed it. v2 pivoted to 3D mesh generation
(Hunyuan/Rodin .glb + model-viewer) — the "video game look" killed it. v3 is
the current image-to-video spin approach, which won because video models are
photoreal where 3D reconstruction is not. Multi-image (Seedance) beat
single-image (Kling) because real back/side photos beat hallucinated ones.

## Where everything lives (cloud sources of truth)

| Thing | Where | Notes |
|---|---|---|
| Code | github.com/TheMarkSimon/firewebz-video-studio | repo name is legacy; product is Spinr |
| Hosting | Vercel project `firewebz-video-studio` (team mark-simon-projects) | auto-deploys `main` |
| Domain | thespinr.com (GoDaddy, 3yr) → Vercel | canonical = apex, www redirects |
| Secrets | **Vercel env vars** (prod) — recreate locally via `vercel env pull` | never committed |
| Database | Neon Postgres (`spinr` project) via Prisma | `User` + `Spin` tables |
| Generated media | Cloudflare R2 bucket `spinr-media` (pub-…r2.dev URLs on Spin rows; mirrored at completion, lib/storage.ts) | fal.media = compute scratch only |
| Brand assets | `public/brand/` (used) + `assets/brand-source/*.zip` (originals) | brand color #D7FC47 |
| Email | contact@thespinr.com (forwarding only for now) | Workspace before public launch |

## Bootstrap on a new machine

```bash
git clone https://github.com/TheMarkSimon/firewebz-video-studio.git spinr && cd spinr
npm install
npx vercel link          # team: mark-simon-projects, project: firewebz-video-studio
npx vercel env pull .env.local --environment=production
# Prisma CLI reads .env (not .env.local):
grep '^DATABASE_URL=' .env.local > .env
# For local auth, override in .env.local: NEXTAUTH_URL=http://localhost:3000
npx prisma generate
npm run dev
```

Tests: `npm test` (vitest unit tests — Shopify OAuth/HMAC, plan config,
origins). `npm run smoke` runs 12 endpoint checks against a running
instance (default http://localhost:3100 — `npx next start -p 3100` after a
build; set SMOKE_BASE_URL=https://thespinr.com for a post-deploy check).

## Architecture (src/)

- `app/page.tsx` — one-page marketing site (Canva-style: hero + demo video +
  alternating feature rows + pricing + FAQ + black CTA). `hero.tsx` has the
  rotating-word chip and an unused-but-kept HeroSpin (draggable demo).
- `app/onboarding` + `components/onboarding-wizard.tsx` — **anonymous** upload
  playground (value-first, no auth wall). Sign-in gate = modal on "Generate";
  draft (title + fal URLs) survives the OAuth redirect via sessionStorage and
  auto-continues on return.
- `app/generate` — preview → progress bar (client-simulated, asymptotic,
  never stalls) → result with SpinScrubber + embed-snippet card. DB-backed;
  results cached on the Spin row (`force` to regenerate).
- `app/studio` — user's spins grid, create/delete. Gated.
- `app/embed/[spinId]` — public, serves ONLY ready spins from DB, can never
  trigger a paid generation. `app/embed/spin.js` — script merchants paste
  (`<div data-spinr="ID">` → iframe). iframe headers in next.config.mjs.
- `components/spin-scrubber.tsx` — HYBRID playback: raw MP4 loops while
  idle (native smoothness), swaps to the canvas flipbook at the matching
  angle on grab (instant scrubbing), video resumes from that angle on
  release. NEXT_PUBLIC_DISABLE_HYBRID=1 reverts to frames-only without a
  code change. Degrades: video fails → flipbook; no frames → `<video>`
  scrubbing. Horizontal drag only; drag direction follows the finger.
- `lib/providers/spinvideo/` — provider interface (queue-only: submit +
  fetchQueueResult). `seedance.ts` is THE provider; the Kling fallback and
  the sync generate() path were REMOVED 2026-07 (dead code — resurrect from
  git history only if a provider comparison is ever needed).
  `extract-frames.ts` (bundled ffmpeg → 60 JPEGs → fal storage),
  `flatten.ts` (reference images composited onto white — lesson 11).
- `lib/actions/` — `spins.ts` (CRUD, auth-gated), `spinvideo.ts` (generate,
  auth-gated, cache-first), `remove-bg.ts` (birefnet/v2; anonymous by design).
- `lib/auth.ts` — NextAuth v4, Google-only, JWT sessions, User upsert on
  sign-in. `lib/db.ts` — Prisma singleton.
- `api/proxy` — allowlisted streaming proxy (fal.media etc.) because the
  founder's corporate network (Zscaler) blocks external CDNs. All remote
  media in the UI goes through it.
- `app/shopify/app` — EMBEDDED admin app (App Store requirement): App
  Bridge session tokens (lib/embedded-auth.ts verifies the JWT, token
  exchange mints Admin tokens), Polaris UI, per-shop CSP frame-ancestors
  via src/middleware.ts. First embedded open auto-provisions a SHADOW user
  (email "shopify:<shop>") that merges into a Google account if the same
  shop is later connected on the web (oauth callback). Core logic shared
  with web via lib/generation.ts + lib/shopify-ops.ts (server actions are
  thin wrappers).

## Hard-won lessons (do not relearn these)

1. **Video models are ruthlessly literal about staging words.** "turntable" →
   renders a pedestal; "suspended" → renders a hanging wire. The prompts in
   the providers ban stands/stages/strings/wires explicitly. Never reintroduce
   staging language.
2. Catalog photos often show a **pair** of shoes → prompt demands exactly one
   item. Prompt-level nudge, not guaranteed.
3. **Kling Elements / "Seedance 2.0" / Kling O3 do not exist on fal** —
   fabrications from another agent. Verify endpoints live before believing
   any model claims (fal queue returns 200 for ANY path; check the model page
   or run a real generation).
4. **Vercel env UI silently saves empty strings** (fields show blank on edit).
   Add sensitive vars via CLI. `vercel env pull` shows sensitive values as ""
   — that's redaction, not emptiness.
5. `@ffmpeg-installer` binary: no WebP encoder (use JPEG), no ffprobe
   (Kling/Seedance clips are 10s — hardcoded). Must stay in
   `serverComponentsExternalPackages` + `outputFileTracingIncludes`.
6. Session-based storage caused "Session not found" hell (payload > Upstash
   limits when photos were data URLs). Everything is URLs + Postgres now.
   Never put image data in session/DB payloads — store fal URLs.
7. Only ONE `npm run dev` at a time — stacked dev servers serve 404 assets
   ("messy" unstyled pages).
8. Prisma CLI reads `.env`, Next reads `.env.local` — DATABASE_URL lives in both.
9. Brand lime **#D7FC47 fails contrast as text on white** — fills only
   (buttons get black text, Ramp-yellow style). Tokens still named
   `fw-purple` (legacy name, holds the lime).
10. The founder's Intuit-managed terminal **blocks git push/commit hooks to
    non-Intuit hosts** — the founder pushes from their personal terminal.
    Agents: commit locally, then ask the founder to run
    `git push && git push --tags`.
11. **Transparent reference PNGs make Seedance hallucinate backdrops
    mid-spin** (sunglasses run rendered a gray hex-camo pattern late in the
    rotation — transparent pixels are "unspecified", not "white"). Fix:
    every reference image is flattened onto opaque white before upload
    (providers/spinvideo/flatten.ts, ffmpeg drawbox+overlay). Never feed
    the video model alpha transparency.

## Current state & roadmap

Done: marketing site (Spinr brand, lime, hero demo video), value-first
onboarding, Google auth, Neon Postgres, My Studio, permanent DB-backed
embeds, Seedance default provider, domain + prod env vars set. Phase 3
async generation is LIVE and verified in prod (fal queue submit → webhook
`/api/webhooks/fal` + client status polling, both converging on one
idempotent completion helper in lib/spin-completion.ts; FAL_WEBHOOK_SECRET
set in prod). Resend email notify is code-complete but DORMANT by founder
decision — it activates the moment RESEND_API_KEY is set (lib/email.ts
no-ops without it; EMAIL_FROM needs Resend domain verification first).
Post-auth action continuity: onboarding resume auto-starts the generation
(/generate?autostart=1), branded LoadingTransition overlay covers the
hand-off, and the static homepage hydrates the session client-side (never
call getSessionUser in app/page.tsx — it kills static rendering).

- Phase 4: Shopify integration (OAuth connection, import product catalog,
  push embeds back). Connection, NOT a login method. Validated on a real
  Shopify dev store (2026-07, founder has a Shopify Partner account +
  Dawn dev store): the embed snippet SURVIVES the product-description HTML
  editor and renders on the storefront. Learnings that shape the build:
  (a) Shopify's media gallery only accepts native media (images/video/
  YouTube/GLB) — no widget can be a gallery tile; the placement answer is
  a block below the buy box. (b) The scalable manual pattern (and Phase
  4's push mechanism) is a product metafield `custom.spinr_id` + one
  Custom Liquid / app block reading it — per-product spins, one block for
  the whole catalog. (c) Uploading the spin MP4 as native gallery video
  (autoplay, not draggable) + widget below is the strongest demo combo.
  Remaining validation before building: category quality sweep, 3–5
  merchant conversations.
- Phase 5: Stripe billing (chosen over PayPal deliberately).
- Phase 6: admin dashboard (users/revenue/fal spend), FAQ/support chat.

Deferred/scale work lives in **SCALING.md** (living checklist — the
founder triggers it by saying real customers arrived; prune done items,
add new deferred items there instead of building early). Highlights:
media off fal.media to owned storage, rate-limit anonymous bg removal,
uninstall/subscription webhooks, error alerting, App Store submission
items (GDPR webhooks, listing, payout setup W-8BEN, go-live env switches),
OAuth out of Testing mode + Workspace for contact@thespinr.com.

## Voice & design rules

Monochrome + ONE brand color (lime #D7FC47) as fills only. Near-black text
(#101012) on white. References the founder likes: Ramp, Notion, Canva,
Lemonade. Copy leads with "the photos you already have" (merchants have
catalog images; don't assign homework). Marketing tone: outcome-first,
no jargon. The founder gives feedback in screenshots — act on it precisely,
push back with reasoning when a request hurts UX (e.g. 4× logo), and always
give exact terminal commands when the founder needs to run something.
