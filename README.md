# Firewebz Video Studio — Local MVP

Your AI video marketing assistant for turning product images into ready-to-post Reels and TikToks.

This is a **validation MVP** — a local-first single-user app designed to demo the Firewebz Video Studio experience to your partner and 3–5 friendly SMBs. It is not production-grade. No auth, no payments, no publishing.

---

## What this MVP does

- Onboard a small business in a 6-step wizard.
- Upload product images for one product at a time.
- Generate multiple short-form **video concepts** (hook + storyboard + caption + hashtags + CTA + performance hypothesis).
- Generate an actual **AI video MP4** through Gemini/Veo (when a key is configured) or a local fallback.
- Review the video package, download MP4, give structured feedback.
- Schedule generated concepts in a **monthly content calendar**.
- See a **validation dashboard** with quality and would-post metrics.
- Switch between sample businesses (UrbanStep Shoes, Sweet Corner Bakery, GlowNest Beauty).

## What this MVP does *not* do

- No auth, multi-user, payments, or pricing flow.
- No publishing to Instagram / TikTok / Facebook / YouTube.
- No deep website scraping or Shopify/WooCommerce integration.
- No production deployment yet (local-only).

---

## Prerequisites (macOS)

1. **Node.js 20+** — verify with `node --version`. Install via [nvm](https://github.com/nvm-sh/nvm) or [Homebrew](https://brew.sh): `brew install node`.
2. **npm 10+** — comes with Node.
3. **(Optional) FFmpeg** — only needed if you want the local template-MP4 fallback. Install with `brew install ffmpeg`. Without it, the app falls back to a mock card.
4. **(Optional) Gemini API key** — for real concept text and Veo video generation. See setup steps below.

---

## Install & run

```bash
# from /Users/msimon6/Claude/Projects/Fire
npm install
cp .env.example .env.local
DATABASE_URL="file:./dev.db" npx prisma db push
DATABASE_URL="file:./dev.db" npx tsx prisma/seed.ts
npm run dev
```

Then open <http://localhost:3000>.

> The `DATABASE_URL` env-var is exported only for the Prisma CLI commands. The Next.js runtime reads it from `.env.local` automatically.

---

## Configure providers

Open `.env.local` and edit:

```env
# Concept text (concepts, captions, hashtags)
LLM_PROVIDER=mock          # or: gemini
GEMINI_API_KEY=            # required for LLM_PROVIDER=gemini

# Video generation
VIDEO_PROVIDER=mock        # or: gemini_veo | ffmpeg_template | runway
RUNWAY_API_KEY=            # only if you implement and use Runway
```

### Action required from you — Gemini text (concepts)

1. Go to <https://aistudio.google.com/> and sign in.
2. Create an API key.
3. Add it to `.env.local`: `GEMINI_API_KEY=YOUR_KEY_HERE`
4. Set `LLM_PROVIDER=gemini`.
5. Restart `npm run dev`.
6. Open `/settings` and click **Test LLM provider** — you should see a generated concept.

### Action required from you — Gemini/Veo video

1. Confirm your Google AI Studio account has **Veo access** (region + allowlist may apply).
2. Reuse the same `GEMINI_API_KEY`.
3. Set `VIDEO_PROVIDER=gemini_veo`.
4. Optionally override the model: `GEMINI_VEO_MODEL=veo-3.0-generate-001`.
5. Restart `npm run dev`.
6. Open `/settings` and click **Test video provider**.
7. If you see access/quota errors, fall back to `VIDEO_PROVIDER=ffmpeg_template` (requires FFmpeg) or `VIDEO_PROVIDER=mock`.

### Action required from you — Runway fallback (optional)

1. Create a Runway account and API key.
2. Add `RUNWAY_API_KEY=...` to `.env.local`.
3. Set `VIDEO_PROVIDER=runway`.
4. Open `src/lib/providers/video/runway.ts` — it's currently a stub. Implement the API call there.

---

## The flow

1. **Welcome** (`/`) — try the sample business or start onboarding.
2. **Onboarding** (`/onboarding`) — 6 steps: business basics, goal, platforms, product (with image upload), video preferences, review.
3. **Concepts** (`/concepts`) — concepts auto-generate after onboarding. Review, edit fields, approve/reject, generate the MP4, give feedback, add to calendar.
4. **Calendar** (`/calendar`) — month grid + upcoming list with status management.
5. **Dashboard** (`/dashboard`) — validation metrics (counts, ratings, would-post %, rejection reasons).
6. **Settings** (`/settings`) — diagnose provider config and run sample calls.

---

## Where files live

- **SQLite database:** `./dev.db` (gitignored)
- **Uploaded product images:** `./storage/uploads/`
- **Generated videos:** `./storage/generated-videos/`
- **Served via API:** `/api/files/<relative-path>` (read-only, restricted to those two roots)

---

## Troubleshooting

**Prisma says `DATABASE_URL not found`**
Prisma CLI doesn't read `.env.local`. Export it inline: `DATABASE_URL="file:./dev.db" npx prisma db push`.

**Concept generation hangs or errors with `GEMINI_API_KEY is not set`**
Either set the key (and `LLM_PROVIDER=gemini`) or set `LLM_PROVIDER=mock` and restart.

**Video says "Mock generation complete" with no MP4**
You're on the mock provider. Switch `VIDEO_PROVIDER` to `ffmpeg_template` (install FFmpeg first) or `gemini_veo`.

**Veo returns access errors**
Veo is gated by Google AI Studio account / region. Fall back to `ffmpeg_template` while you wait for access.

**Image upload silently does nothing**
Check `./storage/uploads/` is writable and that you selected files in the file input. Multiple files are supported.

**Dev server port collision**
`npm run dev -- -p 3001`.

---

## Sample data

The seed script creates three demo businesses with three products each:

- **UrbanStep Shoes** — Urban Walk Sneaker, Classic White Runner, Weekend Leather Loafer.
- **Sweet Corner Bakery** — Chocolate Croissant Box, Birthday Cupcake Set, Friday Challah Special.
- **GlowNest Beauty** — Daily Glow Serum, Hydration Face Cream, Overnight Repair Mask.

Re-seed at any time:

```bash
DATABASE_URL="file:./dev.db" npx prisma db push --force-reset
DATABASE_URL="file:./dev.db" npx tsx prisma/seed.ts
```

---

## Known limitations

- Single user, no auth — for local demo only.
- One product per upload in onboarding (you can add more later by going to `/concepts` for a business and choosing different products).
- Video generation is synchronous on the server thread (Veo polling may take minutes).
- Runway is a stub.
- Calendar doesn't publish — it's a planning surface.
- Brand visuals are a clean placeholder. Reskin with Figma assets when available.

---

## Roadmap (post-MVP, not built yet)

- Multi-product batches and bulk concept generation.
- Real-time Veo job polling with a queue (BullMQ / Inngest).
- Pricing/willingness-to-pay survey.
- Shopify / Instagram publishing.
- Multi-user accounts and agency dashboard.
- Production deployment (Vercel + hosted Postgres + S3).
