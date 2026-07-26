"use client";

// Category showcase: real generated spins (live /embed pages) with the real
// source photos they were built from. Deliberately NO invented merchant
// brands, metrics, or testimonials — every claim here is a fact about the
// product. Real merchant stories slot into the right column when we have
// them (with permission).

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Camera, Clock3, MousePointer2, Wand2 } from "lucide-react";

const R2 = "https://pub-d34463da5a714fc09b05968a8eca8410.r2.dev/marketing/spotlight";

const SPOTLIGHT = [
  {
    id: "footwear",
    tab: "👟 Footwear",
    title: "Yellow Slide Sandal",
    spinId: "cmrgqm77y0001wtn2534125kk",
    photos: [`${R2}/sandal-front.png`, `${R2}/sandal-back.png`, `${R2}/sandal-left.png`, `${R2}/sandal-right.png`],
    story:
      "Footwear is where flat photos hurt most — shoppers want the profile, the sole, the heel. This spin was generated from the four catalog shots below.",
  },
  {
    id: "furniture",
    tab: "🪑 Home & Furniture",
    title: "Retro Leather Office Chair",
    spinId: "cmrizghkz0001q9fudn5bzwg7",
    photos: [`${R2}/chair-front.png`, `${R2}/chair-back.png`, `${R2}/chair-left.png`, `${R2}/chair-right.png`],
    story:
      "Furniture shoppers buy shape. A 360° rig for a chair is a freight problem; these four photos were enough to let shoppers walk around it.",
  },
  {
    id: "bags",
    tab: "👜 Bags & Accessories",
    title: "Leather Handbag",
    spinId: "cmrchlmbd0001c9vjuldddpou",
    photos: [`${R2}/handbag-front.png`, `${R2}/handbag-back.png`, `${R2}/handbag-left.png`],
    story:
      "Straps, zips, texture — the details buyers email support about. This spin needed just three catalog photos; one drag answers the question before it's asked.",
  },
] as const;

export function SpotlightShowcase() {
  const [active, setActive] = useState(0);
  const [dragged, setDragged] = useState(false);
  const item = SPOTLIGHT[active];
  const facts = [
    { icon: Camera, label: "Source material", value: `${item.photos.length} ordinary product photos` },
    { icon: Wand2, label: "Backgrounds", value: "Removed automatically" },
    { icon: Clock3, label: "Photos to live spin", value: "A few minutes" },
    { icon: MousePointer2, label: "Shopper experience", value: "Drag to turn — mouse or finger" },
  ];

  return (
    <section className="mt-24 scroll-mt-24" id="spotlight">
      {/* Header */}
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-fw-border bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-fw-darkGray">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fw-purple opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-fw-purple" />
          </span>
          See Spinr in action
        </span>
        <h2 className="mt-5 font-display text-[30px] font-bold leading-tight text-fw-text md:text-[38px]">
          Real products. Real spins. Go on — drag one.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-[24px] text-fw-darkGray">
          Every spin below is live, generated from the exact photos you see under it — the
          same flow you&apos;ll use on your own catalog.
        </p>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        {SPOTLIGHT.map((s, i) => (
          <button
            key={s.id}
            onClick={() => {
              setActive(i);
              setDragged(false);
            }}
            className={`rounded-full px-5 py-2.5 text-[13px] font-semibold transition-all duration-200 ${
              i === active
                ? "bg-fw-black text-white shadow-[0_8px_24px_-12px_rgba(16,16,18,0.5)]"
                : "border border-fw-border bg-white text-fw-darkGray hover:border-fw-black/30 hover:text-fw-text"
            }`}
          >
            {s.tab}
          </button>
        ))}
      </div>

      {/* Showcase card */}
      <div className="mx-auto mt-8 overflow-hidden rounded-3xl border border-fw-border bg-white shadow-[0_24px_80px_-40px_rgba(16,16,18,0.3)]">
        <div className="grid md:grid-cols-2">
          {/* Left: live interactive spin */}
          <div className="relative border-b border-fw-border md:border-b-0 md:border-r">
            <div
              className="relative aspect-square w-full bg-[radial-gradient(ellipse_at_center,rgba(215,252,71,0.18),transparent_65%)]"
              onPointerDown={() => setDragged(true)}
            >
              <iframe
                key={item.spinId}
                src={`/embed/${item.spinId}`}
                title={`${item.title} — interactive 360° spin`}
                className="h-full w-full"
                style={{ border: 0 }}
              />
              {!dragged && (
                <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center">
                  <span className="rounded-full bg-fw-black/85 px-4 py-2 text-[12px] font-semibold text-white shadow-lg backdrop-blur">
                    ↔ Drag to inspect in 360°
                  </span>
                </div>
              )}
            </div>
            {/* Source photos strip — the REAL inputs for this spin */}
            <div className="border-t border-fw-border bg-fw-disabled/30 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-fw-lightGray">
                Generated from these {item.photos.length} photos
              </p>
              <div className="mt-2.5 flex gap-2.5">
                {item.photos.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={src}
                    alt={`${item.title} source photo ${i + 1}`}
                    loading="lazy"
                    className="h-16 w-16 rounded-lg border border-fw-border bg-white object-contain"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right: the honest story + product facts */}
          <div className="flex flex-col justify-center p-7 md:p-10">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-fw-lightGray">
              {item.tab.replace(/^\S+\s/, "")}
            </p>
            <h3 className="mt-1.5 font-display text-[24px] font-bold text-fw-text">{item.title}</h3>
            <p className="mt-3 text-[14px] leading-[23px] text-fw-darkGray">{item.story}</p>

            <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {facts.map((f) => (
                <div key={f.label} className="rounded-2xl border border-fw-border bg-white p-4">
                  <f.icon className="h-5 w-5 text-fw-black" />
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-fw-lightGray">
                    {f.label}
                  </p>
                  <p className="mt-0.5 text-[13px] font-semibold text-fw-text">{f.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-1.5 rounded-pill bg-fw-purple px-6 py-3 text-[14px] font-bold text-fw-black transition-transform hover:scale-[1.02]"
              >
                Try this with your product — free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={`/embed/${item.spinId}`}
                target="_blank"
                rel="noreferrer"
                className="text-[13px] font-semibold text-fw-darkGray underline-offset-4 hover:underline"
              >
                Open full-screen ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
