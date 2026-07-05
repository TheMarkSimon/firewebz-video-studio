import Link from "next/link";
import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { ArrowRight, Camera, Sparkles, Store } from "lucide-react";

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
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 pt-12 lg:pt-20">
        {/* Hero */}
        <section className="flex flex-col items-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-fw-purple/20 bg-fw-purpleSoft/60 px-4 py-1.5 text-[12px] font-semibold text-fw-purple">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} />
            One photo. A 360° spin. Live in three minutes.
          </div>

          <h1 className="font-display text-[44px] font-bold leading-[1.05] text-fw-text md:text-[64px]">
            The shortest path from a<br />product photo to more sales.
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
            <Button asChild variant="outline" size="lg" className="min-w-[220px]">
              <Link href="/spin-demo">See a live spin</Link>
            </Button>
          </div>

          <p className="mt-6 text-[13px] text-fw-lightGray">
            Free while in beta · No account needed · Works with every Shopify theme
          </p>
        </section>

        {/* Three-step how-it-works */}
        <section className="mt-24 grid grid-cols-1 gap-6 md:grid-cols-3">
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
        </section>

        {/* Why it matters */}
        <section className="mt-24 rounded-3xl border border-fw-border bg-white p-8 md:p-12">
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

        {/* Bottom CTA */}
        <section className="my-24 rounded-3xl bg-gradient-to-br from-fw-purple to-fw-purple/80 p-10 text-center text-white md:p-16">
          <h2 className="font-display text-[32px] font-bold leading-tight md:text-[42px]">
            Turn your best product photo<br />into your best sales pitch.
          </h2>
          <p className="mt-4 text-[16px] text-white/90">
            Free while in beta. See your first spin in under three minutes.
          </p>
          <div className="mt-8">
            <Button asChild size="lg" className="min-w-[220px] bg-white text-fw-purple hover:bg-white/90">
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
    <div className="rounded-2xl border border-fw-border bg-white p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fw-purpleSoft text-fw-purple">
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
