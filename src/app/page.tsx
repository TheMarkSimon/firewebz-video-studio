import Link from "next/link";
import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { RotatingWord } from "@/components/hero";
import { ArrowRight, Camera, Store, Check, TrendingUp, Undo2, MonitorSmartphone } from "lucide-react";
import { SpinrIcon } from "@/components/spinr-icon";
import { SequenceVideo } from "@/components/sequence-video";
import { SpotlightShowcase } from "@/components/spotlight-showcase";
import { overagePriceUsd, proIncludedSpins, proPriceUsd } from "@/lib/shopify";

export const metadata: Metadata = {
  title: "Spinr — Turn your product photos into a 360° spin for Shopify",
  description:
    "Turn the product photos you already have into an interactive 360° spin your shoppers can drag on any Shopify product page. Setup in under 3 minutes. No 3D scanner, no photo studio, no code.",
  keywords: [
    "shopify 360 product view",
    "360 spin product photography",
    "interactive product image shopify",
    "ai product spin",
    "shopify 3d product viewer",
    "spin viewer for ecommerce",
    "360 product photo alternative",
  ],
  openGraph: {
    title: "Spinr — 360° product spins from your photos",
    description:
      "The photos you already have in, an interactive 360° spin out. Drop it into any Shopify product page and watch conversion climb.",
    type: "website",
    siteName: "Spinr",
  },
  twitter: {
    card: "summary_large_image",
    title: "Spinr — 360° product spins from your photos",
    description:
      "The photos you already have in, an interactive 360° spin out. Drop it into any Shopify product page.",
  },
  alternates: { canonical: "/" },
};

// Structured data for search engines and AI answer engines. The FAQ
// entries MIRROR the visible FAQ section below — keep them in sync
// (invisible-only Q&As are a schema-spam signal).
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Spinr",
      url: "https://thespinr.com",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Turn the product photos you already have into an interactive 360° spin shoppers can drag on any Shopify product page. AI-generated in minutes — no rig, no 3D modeling, no code.",
      offers: [
        { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD", description: "3 free spins, no card required" },
        { "@type": "Offer", name: "Pro", price: "29", priceCurrency: "USD", description: "10 spins per month, then $2.50 per extra spin" },
      ],
      publisher: { "@type": "Organization", name: "Spinr", url: "https://thespinr.com", email: "contact@thespinr.com" },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Do 360° product views actually increase sales?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Industry research says yes: Shopify's own data shows products with interactive 3D content convert up to 94% better than flat photos, returns drop by as much as 40%, and 63% of shoppers say they want a 360° view before buying. When ASOS added 360° views, published results showed conversion nearly doubling (1.33% to 2.48%).",
          },
        },
        {
          "@type": "Question",
          name: "Do I need special photos or equipment to create a 360° product spin?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. The photos already in your catalog usually work as-is — or take a few phone shots: front, back, and sides. Any background is fine; Spinr removes it automatically.",
          },
        },
        {
          "@type": "Question",
          name: "How long does it take to generate a 360° spin?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A few minutes from upload to a finished, embeddable interactive spin.",
          },
        },
        {
          "@type": "Question",
          name: "Does Spinr work with my Shopify theme?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. The spin is a single line of HTML pasted into any product page, or one click through the Spinr Shopify app — no theme edits required.",
          },
        },
        {
          "@type": "Question",
          name: "What product categories does Spinr support?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Spinr is product-agnostic: footwear, bags, furniture, eyewear, cosmetics, toys — anything you can photograph.",
          },
        },
        {
          "@type": "Question",
          name: "Do shoppers need to install anything to use the spin?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Nothing. The spin runs on plain web technology — shoppers drag with their mouse or finger on any device.",
          },
        },
      ],
    },
  ],
};

export default function WelcomePage() {
  return (
    <AppShell variant="marketing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <div className="mx-auto max-w-7xl">
        {/* Hero — Canva pattern: title, one line, one CTA, demo video under it. */}
        <section className="flex flex-col items-center pt-14 text-center lg:pt-20">
          <h1 className="max-w-5xl font-display text-[44px] font-bold leading-[1.18] text-fw-text md:text-[64px]">
            The shortest path from product photos to <RotatingWord />
          </h1>

          <p className="mt-6 max-w-2xl text-[17px] leading-[27px] text-fw-darkGray md:text-[18px]">
            Turn the product photos you already have into an interactive 360° spin your
            shoppers can drag. Any Shopify page, three minutes, no code.
          </p>

          <div className="mt-8 flex w-full justify-center px-4">
            <Button asChild size="lg" className="h-auto min-w-0 max-w-full whitespace-normal py-3.5 sm:min-w-[240px]">
              <Link href="/onboarding">
                Create your first spin — free
                <ArrowRight className="ml-1.5 h-4 w-4 shrink-0" />
              </Link>
            </Button>
          </div>

          {/* Demo reel — founder-provided clips playing back-to-back in a
              loop (main → handbag → furniture). Muted autoplay, the
              Canva/Ramp hero pattern. */}
          <div className="mt-14 w-full max-w-5xl">
            <SequenceVideo
              sources={["/videos/main.mp4", "/videos/handbag.mp4", "/videos/furniture.mp4"]}
              className="aspect-video w-full rounded-3xl border border-fw-border object-cover shadow-[0_24px_80px_-32px_rgba(16,16,18,0.25)]"
            />
          </div>

        </section>

        {/* Category spotlight — live interactive spins with their real
            source photos, right under the hero (replaced the storefront
            mockup section 2026-07: the two said the same thing, and the
            spotlight says it interactively). No invented merchants/metrics
            (honesty rule). */}
        <SpotlightShowcase />

        {/* The business case — REAL industry numbers, attributed. These are
            third-party research findings presented as such, never Spinr
            results (we have none yet) and NEVER copied into the Shopify
            listing (req 4.3.3 bans stats there). */}
        <section className="mt-24 rounded-3xl bg-fw-black p-10 text-white md:p-14">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-fw-purple">
            Why stores are switching
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl text-center font-display text-[28px] font-bold leading-tight md:text-[36px]">
            Flat photos leave money on the table.<br className="hidden md:block" /> The
            research is loud about it.
          </h2>
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-8 text-center md:grid-cols-3">
            <div>
              <p className="font-display text-[52px] font-bold leading-none text-fw-purple">+94%</p>
              <p className="mx-auto mt-3 max-w-[240px] text-[14px] leading-[22px] text-white/75">
                higher conversion for products with interactive 3D content vs. flat photos —
                Shopify&apos;s own platform research
              </p>
            </div>
            <div>
              <p className="font-display text-[52px] font-bold leading-none text-fw-purple">−40%</p>
              <p className="mx-auto mt-3 max-w-[240px] text-[14px] leading-[22px] text-white/75">
                fewer returns when shoppers can inspect every angle before buying — what
                arrives matches what they expected
              </p>
            </div>
            <div>
              <p className="font-display text-[52px] font-bold leading-none text-fw-purple">63%</p>
              <p className="mx-auto mt-3 max-w-[240px] text-[14px] leading-[22px] text-white/75">
                of shoppers say they want a 360° view before they purchase — most product
                pages still don&apos;t offer one
              </p>
            </div>
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-[13px] leading-[21px] text-white/60">
            When ASOS added 360° views, published results showed conversion nearly doubling
            — from 1.33% to 2.48%. Your products already have the photos it takes.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg" className="h-auto py-3.5">
              <Link href="/onboarding">
                Put a spin on your page — free
                <ArrowRight className="ml-1.5 h-4 w-4 shrink-0" />
              </Link>
            </Button>
          </div>
          <p className="mt-6 text-center text-[10px] text-white/40">
            Sources: Shopify research on 3D/interactive product content · Adobe Analytics ·
            published retailer results (ASOS). Industry benchmarks, not guarantees.
          </p>
        </section>

        {/* Social proof — the HONEST version. No unlicensed brand logos, no
            invented stats (we're pre-revenue; fabricated trust signals are
            a legal and credibility trap). Real merchant logos slot in here
            WITH PERMISSION as design partners sign. */}
        <section className="mt-24 text-center">
          <p className="mx-auto max-w-2xl text-[16px] leading-[26px] text-fw-darkGray">
            Join the first wave of merchants turning flat product pages into products
            shoppers can <span className="font-semibold text-fw-text">pick up and turn over</span> —
            on any Shopify theme, from the photos you already have.
          </p>
          {/* Design-partner logos land here (permission-based), e.g.:
              <div className="mt-8 flex items-center justify-center gap-10 opacity-70">
                <img src="/partners/store1.png" ... />
              </div> */}
        </section>

        {/* Feature row A — text left, visual right (Canva pattern) */}
        <section id="how" className="mt-32 grid scroll-mt-24 items-center gap-12 md:grid-cols-2">
          <div>
            <h2 className="font-display text-[30px] font-bold leading-tight text-fw-text md:text-[38px]">
              From a few photos to a live spin in three minutes.
            </h2>
            <div className="mt-8 space-y-7">
              <FeatureRow icon={<Camera className="h-5 w-5" />} title="Use the photos you already have">
                Your existing catalog shots work, or a few quick phone photos — front, back, and sides. We remove the backgrounds automatically; no studio, no white sweep, no retouching.
              </FeatureRow>
              <FeatureRow icon={<SpinrIcon className="h-5 w-5" />} title="AI builds the rotation">
                A full 360° turntable spin with studio lighting, built from your real angles
                in two to three minutes.
              </FeatureRow>
              <FeatureRow icon={<Store className="h-5 w-5" />} title="Paste it on Shopify">
                One line of HTML in any product page. Works with every theme — nothing to
                install, nothing to configure.
              </FeatureRow>
            </div>
          </div>
          <VisualPanel>
            <SequenceVideo
              sources={["/videos/photographer.mp4"]}
              className="w-full rounded-2xl object-cover"
            />
          </VisualPanel>
        </section>

        {/* Feature row B — visual left, text right */}
        <section id="why" className="mt-32 grid scroll-mt-24 items-center gap-12 md:grid-cols-2">
          <VisualPanel className="order-last md:order-first">
            <SequenceVideo
              sources={["/videos/main2.mp4"]}
              className="w-full rounded-2xl object-cover"
            />
          </VisualPanel>
          <div>
            <h2 className="font-display text-[30px] font-bold leading-tight text-fw-text md:text-[38px]">
              Shoppers who touch the product buy the product.
            </h2>
            <div className="mt-8 space-y-7">
              <FeatureRow icon={<TrendingUp className="h-5 w-5" />} title="Longer sessions, more carts">
                A spin invites shoppers to explore instead of bounce. Interaction is the
                strongest pre-purchase signal there is.
              </FeatureRow>
              <FeatureRow icon={<Undo2 className="h-5 w-5" />} title="Fewer returns">
                Customers see every side before they buy — what arrives matches what they
                expected.
              </FeatureRow>
              <FeatureRow icon={<MonitorSmartphone className="h-5 w-5" />} title="Every device, zero installs">
                Mouse on desktop, finger on mobile. Plain web technology — nothing for your
                shoppers to download.
              </FeatureRow>
            </div>
          </div>
        </section>

        {/* Pricing — Free (3 spins) / Pro ($29, 10/mo, $2.50 extra). Values
            read from env at BUILD time (static page); a price change needs a
            redeploy to show here. The anchor is photography, not software. */}
        <section id="pricing" className="mt-32 scroll-mt-24">
          <h2 className="text-center font-display text-[32px] font-bold text-fw-text md:text-[40px]">
            Simple pricing. Views are always free.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-[15px] text-fw-darkGray">
            We charge for creating spins — never for your store&apos;s traffic. Every plan
            includes unlimited 360° views, no bandwidth caps.
          </p>
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
            <div className="flex flex-col rounded-3xl border border-fw-border bg-white p-8">
              <p className="text-[13px] font-bold uppercase tracking-wider text-fw-darkGray">Free</p>
              <p className="mt-3 font-display text-[40px] font-bold text-fw-text">$0</p>
              <p className="mt-1 text-[13px] text-fw-darkGray">3 spins to see it on your own store</p>
              <ul className="mt-6 flex-1 space-y-3">
                <PriceLine>3 free 360° spins — no card required</PriceLine>
                <PriceLine>Automatic background removal</PriceLine>
                <PriceLine>Unlimited views on your storefront</PriceLine>
                <PriceLine>One-line embed, MP4 included</PriceLine>
              </ul>
              <Button asChild variant="outline" className="mt-8 w-full">
                <Link href="/onboarding">Start free</Link>
              </Button>
            </div>
            <div className="flex flex-col rounded-3xl border border-fw-border bg-white p-8">
              <p className="text-[13px] font-bold uppercase tracking-wider text-fw-darkGray">
                Spin Pack
              </p>
              <p className="mt-3 font-display text-[40px] font-bold text-fw-text">
                $39
                <span className="text-[16px] font-semibold text-fw-darkGray"> one-time</span>
              </p>
              <p className="mt-1 text-[13px] text-fw-darkGray">
                10 spins, no subscription — digitize your catalog in one go
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                <PriceLine>10 spin credits that never expire</PriceLine>
                <PriceLine>No subscription, no commitment</PriceLine>
                <PriceLine>Works on any website — Shopify or not</PriceLine>
                <PriceLine>Unlimited views, MP4 downloads included</PriceLine>
              </ul>
              <Button asChild variant="outline" className="mt-8 w-full">
                <Link href="/studio">Buy in Studio</Link>
              </Button>
            </div>
            <div className="flex flex-col rounded-3xl border-2 border-fw-purple bg-white p-8">
              <p className="text-[13px] font-bold uppercase tracking-wider text-fw-text">Pro</p>
              <p className="mt-3 font-display text-[40px] font-bold text-fw-text">
                ${proPriceUsd()}
                <span className="text-[16px] font-semibold text-fw-darkGray">/month</span>
              </p>
              <p className="mt-1 text-[13px] text-fw-darkGray">
                {proIncludedSpins()} spins every month, then ${overagePriceUsd()} per extra spin
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                <PriceLine>{proIncludedSpins()} spins/month — best rate per spin</PriceLine>
                <PriceLine>Discounted extra spins (${overagePriceUsd()} each)</PriceLine>
                <PriceLine>Import & one-click push for Shopify stores</PriceLine>
                <PriceLine>Priority rendering</PriceLine>
              </ul>
              <Button asChild className="mt-8 w-full">
                <Link href="/onboarding">Start free, upgrade in Studio</Link>
              </Button>
              <p className="mt-3 text-center text-[11px] text-fw-lightGray">
                Billed through Shopify or card — cancel anytime.
              </p>
            </div>
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-center text-[13px] text-fw-darkGray">
            For scale: traditional 360° product photography means a motorized rig, a specialist
            photographer, and reshoots — $75–$200+ per product before you&apos;ve spun a single
            item. A Spinr spin starts at ${overagePriceUsd()}, from the photos you already have.
          </p>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto mt-32 max-w-3xl scroll-mt-24">
          <h2 className="text-center font-display text-[32px] font-bold text-fw-text md:text-[40px]">
            Questions, answered
          </h2>
          <div className="mt-10 divide-y divide-fw-border rounded-3xl border border-fw-border bg-white px-6">
            <Faq q="Do 360° views actually increase sales?">
              Industry research says yes, loudly: Shopify&apos;s own data shows products with
              interactive 3D content convert up to 94% better than flat photos, returns drop
              by as much as 40%, and 63% of shoppers say they want a 360° view before buying.
              When ASOS added 360° views, published results showed conversion nearly doubling.
            </Faq>
            <Faq q="Do I need special photos or equipment?">
              No. The photos already in your catalog usually work as-is — or take a few phone shots: front, back, and sides.
              Shoot with even lighting and keep the same distance for every angle; any
              background is fine, we remove it automatically.
            </Faq>
            <Faq q="How long does it take?">
              Two to three minutes from upload to a finished, embeddable spin.
            </Faq>
            <Faq q="Does it work with my Shopify theme?">
              Yes. The spin is a single line of HTML you paste into any product description or
              section — no theme edits, no app-store install, works with every theme.
            </Faq>
            <Faq q="What about products other than shoes or apparel?">
              Spinr is product-agnostic: cosmetics, bottles, bags, furniture, toys — anything you
              can photograph. Simple, well-lit products produce the cleanest spins.
            </Faq>
            <Faq q="Do shoppers need to install anything?">
              Nothing. The spin runs on plain web technology — shoppers just drag with their
              mouse or finger, on any device.
            </Faq>
          </div>
        </section>

        {/* Bottom CTA — black block, green mark accent (lime on dark) */}
        <section className="my-32 rounded-3xl bg-fw-black p-10 text-center text-white md:p-16">
          <SpinrIcon variant="green" className="mx-auto h-12 w-12" />
          <h2 className="mt-6 font-display text-[32px] font-bold leading-tight md:text-[44px]">
            Turn your product photos<br />into your best sales pitch.
          </h2>
          <p className="mt-4 text-[16px] text-white/70">
            Start free — no credit card. See your first spin in under three minutes.
          </p>
          <div className="mt-8 flex w-full justify-center px-4">
            <Button asChild size="lg" className="h-auto min-w-0 max-w-full whitespace-normal py-3.5 sm:min-w-[240px]">
              <Link href="/onboarding">
                Create your first spin — free
                <ArrowRight className="ml-1.5 h-4 w-4 shrink-0" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function FeatureRow({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-fw-disabled text-fw-black">
        {icon}
      </div>
      <div>
        <h3 className="text-[17px] font-bold text-fw-text">{title}</h3>
        <p className="mt-1 text-[14px] leading-[22px] text-fw-darkGray">{children}</p>
      </div>
    </div>
  );
}

function VisualPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex min-h-[340px] items-center justify-center rounded-3xl bg-gradient-to-br from-fw-purpleSoft/80 via-white to-fw-disabled p-8 ${className}`}>
      {children}
    </div>
  );
}

function PriceLine({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[14px] text-fw-text">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-fw-black" />
      <span>{children}</span>
    </li>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between text-[16px] font-bold text-fw-text">
        {q}
        <span className="ml-4 text-fw-lightGray transition-transform group-open:rotate-45">+</span>
      </summary>
      <p className="mt-3 text-[14px] leading-[22px] text-fw-darkGray">{children}</p>
    </details>
  );
}
