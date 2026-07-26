"use client";

// Slim plan line for Studio (web billing rail). Design rule: Studio has ONE
// primary CTA (Create new spin) — billing is ambient status plus a door.
// The purchase options only appear on intent ("Get more spins"), and the
// line turns prominent when the user is actually out of spins.

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface WebPlan {
  plan: "free" | "pro";
  provider: "shopify" | "web" | null;
  enforced: boolean;
  remaining: number;
  packCredits: number;
  freeTotal: number;
  includedSpins: number;
}

export function WebPlanCard({ plan, purchaseNotice }: { plan: WebPlan; purchaseNotice: boolean }) {
  const [open, setOpen] = useState(purchaseNotice);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const webPro = plan.plan === "pro" && plan.provider === "web";
  const total = plan.remaining + plan.packCredits;
  const out = plan.enforced && total <= 0;

  async function buy(product: "pack" | "pro" | "topup") {
    setBusy(product);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "Checkout failed");
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed — try again.");
      setBusy(null);
    }
  }

  const summary = webPro
    ? `Pro · ${plan.remaining} of ${plan.includedSpins} spins left this month` +
      (plan.packCredits > 0 ? ` · ${plan.packCredits} extra credits` : "")
    : `${plan.remaining} of ${plan.freeTotal} free spins left` +
      (plan.packCredits > 0 ? ` · ${plan.packCredits} pack credits` : "");

  return (
    <div className="mt-1.5">
      {purchaseNotice && (
        <p className="mb-1 text-[13px] font-semibold text-fw-text">
          ✓ Payment received — your balance updates within a few seconds.
        </p>
      )}
      <p className={`text-[13px] ${out ? "font-semibold text-amber-600" : "text-fw-darkGray"}`}>
        {out ? "You're out of spins" : summary}
        {" · "}
        <button
          onClick={() => setOpen((v) => !v)}
          className="font-semibold text-fw-text underline underline-offset-4 hover:opacity-70"
        >
          Get more spins
        </button>
      </p>

      {open && (
        <div className="mt-3 flex max-w-xl flex-wrap items-center gap-2.5 rounded-2xl border border-fw-border bg-white p-3">
          {webPro ? (
            <>
              <Button
                onClick={() => void buy("topup")}
                disabled={busy !== null}
                variant="outline"
                className="h-9 px-4 text-[13px]"
              >
                {busy === "topup" ? "Opening…" : "Top up 5 spins — $12.50"}
              </Button>
              <a
                href="/api/billing/portal"
                className="text-[13px] font-semibold text-fw-darkGray underline-offset-4 hover:underline"
              >
                Manage subscription
              </a>
            </>
          ) : (
            <>
              <Button
                onClick={() => void buy("pack")}
                disabled={busy !== null}
                variant="outline"
                className="h-9 px-4 text-[13px]"
              >
                {busy === "pack" ? "Opening…" : "10-spin pack — $39"}
              </Button>
              <Button
                onClick={() => void buy("pro")}
                disabled={busy !== null}
                variant="outline"
                className="h-9 px-4 text-[13px]"
              >
                {busy === "pro" ? "Opening…" : "Go Pro — $29/mo"}
              </Button>
              <span className="text-[11px] text-fw-lightGray">
                Secure checkout by Lemon Squeezy · pack spins never expire
              </span>
            </>
          )}
          {error && <p className="w-full text-[12px] font-semibold text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
