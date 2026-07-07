"use client";

import { useEffect, useRef, useState } from "react";
import { SpinScrubber } from "@/components/spin-scrubber";
import { DEMO_SPIN_FRAMES } from "@/lib/demo-frames";
import { MoveHorizontal } from "lucide-react";

// Notion-style rotating headline word: cycles through outcomes, in brand
// orange, remounting per word so the CSS animation replays.
const WORDS = ["more sales", "fewer returns", "longer sessions", "a wow moment"];

export function RotatingWord() {
  const [i, setI] = useState(0);
  const [width, setWidth] = useState<number | null>(null);
  const sizersRef = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % WORDS.length), 2400);
    return () => clearInterval(id);
  }, []);

  // The slot hugs the CURRENT phrase (no dead gap around short words) and
  // animates its width between phrases. Hidden sizers with identical type
  // styles provide the measurement; re-measure on viewport resize because
  // the headline font size is responsive.
  useEffect(() => {
    const measure = () => {
      const el = sizersRef.current[i];
      if (el) setWidth(el.offsetWidth);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [i]);

  return (
    <span
      className="relative inline-block whitespace-nowrap align-bottom"
      style={{
        width: width ?? undefined,
        transition: "width 450ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {WORDS.map((w, idx) => (
        <span
          key={`sizer-${w}`}
          ref={(el) => { sizersRef.current[idx] = el; }}
          className="invisible absolute left-0 top-0 whitespace-nowrap px-3"
          aria-hidden
        >
          {w}
        </span>
      ))}
      <span key={i} className="fw-screen-enter inline-block whitespace-nowrap rounded-2xl bg-fw-purple px-3 text-fw-black">
        {WORDS[i]}
      </span>
    </span>
  );
}

// Ramp-style hero centerpiece — except it's not a video OF the product,
// it IS the product: a live draggable 360° spin from one of our own test
// generations. Auto-rotates until the visitor grabs it.
export function HeroSpin() {
  const proxied = DEMO_SPIN_FRAMES.map((u) => `/api/proxy?url=${encodeURIComponent(u)}`);
  return (
    <div className="relative mx-auto mt-14 w-full max-w-3xl">
      <div className="overflow-hidden rounded-3xl border border-fw-border bg-white shadow-[0_24px_80px_-32px_rgba(16,16,18,0.25)]">
        <SpinScrubber
          frameUrls={proxied}
          className="aspect-video w-full bg-white"
          autoRotateSpeed={0.12}
        />
      </div>
      <div className="pointer-events-none absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-fw-black px-4 py-1.5 text-[12px] font-semibold text-white shadow-lg">
        <MoveHorizontal className="h-3.5 w-3.5 text-fw-purple" />
        Live demo — drag to spin
      </div>
      <p className="mt-4 text-center text-[13px] text-fw-lightGray">
        This spin was generated from a single photo. Yours takes 3 minutes.
      </p>
    </div>
  );
}
