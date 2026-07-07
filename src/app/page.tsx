import Link from "next/link";
import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { RotatingWord } from "@/components/hero";
import { ArrowRight, Camera, Sparkles, Store, Check, MousePointerClick, TrendingUp, Undo2, MonitorSmartphone } from "lucide-react";

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

export default function WelcomePage() {
  return (
    <AppShell variant="marketing">
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

          <div className="mt-8">
            <Button asChild size="lg" className="min-w-[240px]">
              <Link href="/onboarding">
                Create your first spin
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Demo video — user-provided process reel (photos → Spinr → spin).
              Muted looping autoplay, the Canva/Ramp hero pattern. */}
          <div className="mt-14 w-full max-w-5xl">
            <video
              src="/videos/hero-demo.mp4"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              className="aspect-video w-full rounded-3xl border border-fw-border object-cover shadow-[0_24px_80px_-32px_rgba(16,16,18,0.25)]"
            />
          </div>
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
              <FeatureRow icon={<Sparkles className="h-5 w-5" />} title="AI builds the rotation">
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
            <div className="grid w-full max-w-xs grid-cols-3 gap-3">
              {["Front", "Back", "Left"].map((l) => (
                <div key={l} className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-fw-lighterGray bg-white text-[11px] font-semibold text-fw-lightGray">
                  <Camera className="h-4 w-4" />
                  {l}
                </div>
              ))}
            </div>
          </VisualPanel>
        </section>

        {/* Feature row B — visual left, text right */}
        <section id="why" className="mt-32 grid scroll-mt-24 items-center gap-12 md:grid-cols-2">
          <VisualPanel className="order-last md:order-first">
            <div className="w-full max-w-sm rounded-2xl border border-fw-border bg-white p-5 shadow-sm">
              <div className="flex aspect-video items-center justify-center rounded-xl bg-fw-disabled">
                <MousePointerClick className="h-8 w-8 text-fw-lightGray" />
              </div>
              <div className="mt-4 h-3 w-2/3 rounded-full bg-fw-disabled" />
              <div className="mt-2 h-3 w-1/3 rounded-full bg-fw-disabled" />
              <div className="mt-4 h-9 w-full rounded-pill bg-fw-purple" />
            </div>
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

        {/* Pricing (placeholder until final tiers land) */}
        <section id="pricing" className="mt-32 scroll-mt-24">
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
                <PriceLine>360° spins from your photos</PriceLine>
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
        <section id="faq" className="mx-auto mt-32 max-w-3xl scroll-mt-24">
          <h2 className="text-center font-display text-[32px] font-bold text-fw-text md:text-[40px]">
            Questions, answered
          </h2>
          <div className="mt-10 divide-y divide-fw-border rounded-3xl border border-fw-border bg-white px-6">
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

        {/* Bottom CTA — black block */}
        <section className="my-32 rounded-3xl bg-fw-black p-10 text-center text-white md:p-16">
          <h2 className="font-display text-[32px] font-bold leading-tight md:text-[44px]">
            Turn your product photos<br />into your best sales pitch.
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
