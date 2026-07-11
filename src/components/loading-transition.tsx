"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";

// Full-screen branded transition for the moments the app is working on the
// user's behalf (post-auth resume, saving + queuing a spin). Spinning GREEN
// Spinr swirl on a near-black disc (founder-picked pairing from the brand
// set), with a Ramp-style mono micro-copy ticker underneath so latency
// reads as "high-performance machine at work", never as a freeze.
//
// Pure CSS (tailwindcss-animate) — deliberately no framer-motion dep.
export function LoadingTransition({
  headline,
  messages,
}: {
  headline: string;
  messages: string[];
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % messages.length), 1100);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-fw-black">
          <img
            src="/brand/spinr-mark-green.png"
            alt=""
            className="h-12 w-12 animate-spin"
            style={{ animationDuration: "1.4s" }}
          />
        </div>
        <p className="mt-6 font-display text-[22px] font-bold text-fw-text">{headline}</p>
        <div className="mt-3 flex h-5 items-center gap-2 overflow-hidden">
          <span className="h-3.5 w-1.5 shrink-0 rounded-[2px] bg-fw-purple" aria-hidden />
          <span
            key={i}
            className="animate-in fade-in slide-in-from-bottom-2 font-mono text-[12px] tracking-wide text-fw-darkGray duration-300"
          >
            {messages[i]}
          </span>
        </div>
      </div>
    </div>
  );
}
