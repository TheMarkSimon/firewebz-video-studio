import Link from "next/link";
import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { HeroSpin, RotatingWord } from "@/components/hero";
import { ArrowRight, Camera, Sparkles, Store, Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Spinr — Turn one product photo into a 360° spin for Shopify",
  description:
    "Upload a single product photo. Get an interactive 360° spin your shoppers can drag on any Shopify product page. Setup in under 3 minutes. No 3D scanner, no photo studio, no code.",
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
    title: "Spinr — 360° product spins from one photo",
    description:
      "One photo in, an interactive 360° spin out. Drop it into any Shopify product page and watch conversion climb.",
    type: "website",
    siteName: "Spinr",
  },
  twitter: {
    card: "summary_large_image",
    title: "Spinr — 360° product spins from one photo",
    description:
      "One photo in, an interactive 360° spin out. Drop it into any Shopify product page.",
  },
  alternates: { canonical: "/" },
};

export default function WelcomePage() {
  return (
    <AppShell variant="marketing">
      <div className="mx-auto max-w-6xl">
        {/* Hero */}
        <section className="flex flex-col items-center pt-16 text-center lg:pt-24">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-fw-border bg-white px-4 py-1.5 text-[12px] font-semibold text-fw-text">
            <span className="inline-block h-2 w-2 rounded-full bg-fw-purple" />
            One photo. A 360° spin. Live in three minutes.
          </div>

          <h1 className="max-w-4xl font-display text-[44px] font-bold leading-[1.04] text-fw-text md:text-[68px]">
            The shortest path from a product photo to <RotatingWord />
          </h1>

          <p className="mt-6 max-w-2xl text-[18px] leading-[28px] text-fw-darkGray md:text-[19px]">
            Upload one clean product photo. Spinr turns it into an interactive 360° spin your
            shoppers can drag on any Shopify product page — no 3D scanner, no photo studio,
            no code. Just a link you paste in.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="min-w-[220px]">
              <Link href="/onboarding">
                Create your first spin
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <p className="mt-6 text-[13px] text-fw-lightGray">
            Free while in beta · No account needed · Works with every Shopify theme
          </p>

          {/* The product IS the demo: a live draggable spin, front and center. */}
          <HeroSpin />
        </section>

        {/* How it works */}
        <section id="how" className="mt-28 scroll-mt-24">
          <h2 className="text-center font-display text-[32px] font-bold text-fw-text md:text-[40px]">
            How it works
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <HowStep
              number={1}
              icon={<Camera className="h-5 w-5" />}
              title="Upload one photo"
              body="A single front-facing photo of your product. Any smartphone shot works — we clean the background automatically."
            />
            <HowStep
              number={2}
              icon={<Sparkles className="h-5 w-5" />}
              title="We build the spin"
              body="Our AI generates a full 360° rotation from your photo. Studio-quality lighting, pure white background, ready in 2–3 minutes."
            />
            <HowStep
              number={3}
              icon={<Store className="h-5 w-5" />}
              title="Paste it on Shopify"
              body="Copy one line of HTML into any product page. Shoppers drag left/right to spin — works on desktop, tablet, and mobile."
            />
          </div>
        </section>

        {/* Why it matters */}
        <section id="why" className="mt-28 scroll-mt-24 rounded-3xl border border-fw-border bg-white p-8 md:p-12">
          <h2 className="font-display text-[28px] font-bold text-fw-text md:text-[36px]">
            Why 360° spins beat static photos.
          </h2>
          <p className="mt-3 max-w-3xl text-[16px] leading-[26px] text-fw-darkGray">
            Every second a shopper spends inspecting your product, they're deciding to buy.
            A spin lets them <em>touch</em> — turn it, look closer, see the details a flat photo hides.
            That's why Amazon, Nike, and every serious e-commerce brand ships 360° views on their
            hero SKUs. Spinr makes that same interaction possible for every product in your store.
          </p>
          <ul className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Bullet>Shoppers explore instead of bouncing — average session time goes up.</Bullet>
            <Bullet>Returns drop because customers see the product before they buy it.</Bullet>
            <Bullet>Works on every device — desktop mouse, mobile finger, tablet stylus.</Bullet>
            <Bullet>No new photography, no 3D scans, no theme edits.</Bullet>
          </ul>
        </section>

        {/* Pricing (placeholder until final tiers land) */}
        <section id="pricing" className="mt-28 scroll-mt-24">
          <h2 className="text-center font-display text-[32px] font-bold text-fw-text md:text-[40px]">
            Simple pricing
          </h2>
          <p className="mt-3 text-center text-[15px] text-fw-darkGray">
            Free while we're in beta. Paid plans arrive with the full launch.
          </p>
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-3xl border-2 border-fw-purple bg-white p-8">
              <p className="text-[13px] font-bold uppercase tracking-wider text-fw-text">Beta</p>
              <p className="mt-3 font-display text-[40px] font-bold text-fw-text">Free</p>
              <p className="mt-1 text-[13px] text-fw-darkGray">while in beta</p>
              <ul className="mt-6 space-y-3">
                <PriceLine>360° spins from one photo</PriceLine>
                <PriceLine>Automatic background removal</PriceLine>
                <PriceLine>Embed on any Shopify page</PriceLine>
                <PriceLine>MP4 download included</PriceLine>
              </ul>
              <Button asChild className="mt-8 w-full">
                <Link href="/onboarding">Start free</Link>
              </Button>
            </div>
            <div className="rounded-3xl border border-fw-border bg-fw-disabled/40 p-8">
              <p className="text-[13px] font-bold uppercase tracking-wider text-fw-darkGray">Pro</p>
              <p className="mt-3 font-display text-[40px] font-bold text-fw-lightGray">Coming soon</p>
              <p className="mt-1 text-[13px] text-fw-darkGray">for growing stores</p>
              <ul className="mt-6 space-y-3 opacity-60">
                <PriceLine>Bulk catalog conversion</PriceLine>
                <PriceLine>Shopify account integration</PriceLine>
                <PriceLine>Team workspace & spin library</PriceLine>
                <PriceLine>Priority rendering</PriceLine>
              </ul>
              <Button disabled variant="outline" className="mt-8 w-full">
                Join the waitlist
              </Button>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto mt-28 max-w-3xl scroll-mt-24">
          <h2 className="text-center font-display text-[32px] font-bold text-fw-text md:text-[40px]">
            Questions, answered
          </h2>
          <div className="mt-10 divide-y divide-fw-border rounded-3xl border border-fw-border bg-white px-6">
            <Faq q="Do I need special photos or equipment?">
              No. One clear smartphone photo works. For the most accurate spin, shoot at a slight
              3/4 angle with even lighting — and you can add back/side photos so the spin uses
              your real angles instead of guessing.
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

        {/* Bottom CTA — black block, Ramp/Notion style */}
        <section className="my-28 rounded-3xl bg-fw-black p-10 text-center text-white md:p-16">
          <h2 className="font-display text-[32px] font-bold leading-tight md:text-[44px]">
            Turn your best product photo<br />into your best sales pitch.
          </h2>
          <p className="mt-4 text-[16px] text-white/70">
            Free while in beta. See your first spin in under three minutes.
          </p>
          <div className="mt-8">
            <Button asChild size="lg" className="min-w-[240px]">
              <Link href="/onboarding">
                Create your first spin
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function HowStep({ number, icon, title, body }: { number: number; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-fw-border bg-white p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fw-purpleSoft text-fw-black">
          {icon}
        </div>
        <span className="text-[13px] font-semibold uppercase tracking-wider text-fw-lightGray">
          Step {number}
        </span>
      </div>
      <h3 className="mt-4 text-[18px] font-bold text-fw-text">{title}</h3>
      <p className="mt-2 text-[14px] leading-[22px] text-fw-darkGray">{body}</p>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-[15px] text-fw-text">
      <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-fw-purple" />
      <span>{children}</span>
    </li>
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
