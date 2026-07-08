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

**Unit economics (current).** COGS ≈ $0.50/spin (Seedance) + pennies for bg
removal; generated once, cached forever (embeds are free to serve). Free
during beta; a Pro tier (bulk catalog conversion, Shopify integration, team
workspace, priority rendering) is the planned monetization — pricing TBD by
the founder. Payments will be Stripe (decided).

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
| Generated media | fal.media CDN URLs stored on Spin rows | ⚠️ move to owned storage before launch |
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
- `components/spin-scrubber.tsx` — canvas flipbook (preferred) + `<video>`
  fallback. Horizontal drag only; auto-rotates idle; drag direction follows
  the finger.
- `lib/providers/spinvideo/` — provider interface. `seedance.ts` (DEFAULT),
  `kling.ts` (opt-in fallback via SPIN_PROVIDER=kling, single-image, ~$3),
  `extract-frames.ts` (bundled ffmpeg → 60 JPEGs → fal storage).
- `lib/actions/` — `spins.ts` (CRUD, auth-gated), `spinvideo.ts` (generate,
  auth-gated, cache-first), `remove-bg.ts` (birefnet/v2; anonymous by design).
- `lib/auth.ts` — NextAuth v4, Google-only, JWT sessions, User upsert on
  sign-in. `lib/db.ts` — Prisma singleton.
- `api/proxy` — allowlisted streaming proxy (fal.media etc.) because the
  founder's corporate network (Zscaler) blocks external CDNs. All remote
  media in the UI goes through it.

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

## Current state & roadmap

Done: marketing site (Spinr brand, lime, hero demo video), value-first
onboarding, Google auth, Neon Postgres, My Studio, permanent DB-backed
embeds, Seedance default provider, domain + prod env vars set.

- Phase 3 (next): async generation via fal webhooks + email notify (Resend)
  — removes the keep-tab-open limit, enables bulk.
- Phase 4: Shopify integration (OAuth connection, import product catalog,
  push embeds back). Connection, NOT a login method.
- Phase 5: Stripe billing (chosen over PayPal deliberately).
- Phase 6: admin dashboard (users/revenue/fal spend), FAQ/support chat.

Pre-launch checklist: regenerate hero video (current one has hallucinated
third-party logos + a Nike shoe), Google Workspace for contact@thespinr.com
(then swap OAuth support email + verify consent screen), move demo frames +
generated media off fal.media to owned storage, rate-limit anonymous bg
removal, publish OAuth app out of Testing mode, weekly Neon pg_dump backup.

## Voice & design rules

Monochrome + ONE brand color (lime #D7FC47) as fills only. Near-black text
(#101012) on white. References the founder likes: Ramp, Notion, Canva,
Lemonade. Copy leads with "the photos you already have" (merchants have
catalog images; don't assign homework). Marketing tone: outcome-first,
no jargon. The founder gives feedback in screenshots — act on it precisely,
push back with reasoning when a request hurts UX (e.g. 4× logo), and always
give exact terminal commands when the founder needs to run something.
