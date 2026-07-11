import Link from "next/link";
import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { RotatingWord } from "@/components/hero";
import { ArrowRight, Camera, Store, Check, TrendingUp, Undo2, MonitorSmartphone } from "lucide-react";
import { SpinrIcon } from "@/components/spinr-icon";
import { SequenceVideo } from "@/components/sequence-video";
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
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-fw-border bg-white p-8">
              <p className="text-[13px] font-bold uppercase tracking-wider text-fw-darkGray">Free</p>
              <p className="mt-3 font-display text-[40px] font-bold text-fw-text">$0</p>
              <p className="mt-1 text-[13px] text-fw-darkGray">3 spins to see it on your own store</p>
              <ul className="mt-6 space-y-3">
                <PriceLine>3 free 360° spins — no card required</PriceLine>
                <PriceLine>Automatic background removal</PriceLine>
                <PriceLine>Unlimited views on your storefront</PriceLine>
                <PriceLine>One-line embed, MP4 included</PriceLine>
              </ul>
              <Button asChild variant="outline" className="mt-8 w-full">
                <Link href="/onboarding">Start free</Link>
              </Button>
            </div>
            <div className="rounded-3xl border-2 border-fw-purple bg-white p-8">
              <p className="text-[13px] font-bold uppercase tracking-wider text-fw-text">Pro</p>
              <p className="mt-3 font-display text-[40px] font-bold text-fw-text">
                ${proPriceUsd()}
                <span className="text-[16px] font-semibold text-fw-darkGray">/month</span>
              </p>
              <p className="mt-1 text-[13px] text-fw-darkGray">
                {proIncludedSpins()} spins every month, then ${overagePriceUsd()} per extra spin
              </p>
              <ul className="mt-6 space-y-3">
                <PriceLine>{proIncludedSpins()} spins/month + pay-as-you-go extras</PriceLine>
                <PriceLine>Import products straight from Shopify</PriceLine>
                <PriceLine>Push spins to product pages in one click</PriceLine>
                <PriceLine>Priority rendering</PriceLine>
              </ul>
              <Button asChild className="mt-8 w-full">
                <Link href="/onboarding">Start free, upgrade in Studio</Link>
              </Button>
              <p className="mt-3 text-center text-[11px] text-fw-lightGray">
                Billed through Shopify — no card entry, cancel anytime.
              </p>
            </div>
          </div>
          <p className="mt-8 text-center text-[13px] text-fw-darkGray">
            For scale: a 360° photography rig runs $75+ per product. A Spinr spin is ${overagePriceUsd()},
            from the photos you already have.
          </p>
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

        {/* Bottom CTA — black block, green mark accent (lime on dark) */}
        <section className="my-32 rounded-3xl bg-fw-black p-10 text-center text-white md:p-16">
          <SpinrIcon variant="green" className="mx-auto h-12 w-12" />
          <h2 className="mt-6 font-display text-[32px] font-bold leading-tight md:text-[44px]">
            Turn your product photos<br />into your best sales pitch.
          </h2>
          <p className="mt-4 text-[16px] text-white/70">
            Start free — no credit card. See your first spin in under three minutes.
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
