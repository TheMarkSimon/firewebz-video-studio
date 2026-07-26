"use client";

// Web billing card (non-Shopify rail, Lemon Squeezy). Shown in Studio for
// users WITHOUT an active Shopify subscription. Purchases go through
// /api/billing/checkout so every order carries the user id.

import { useState } from "react";
import { Sparkles } from "lucide-react";
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
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const webPro = plan.plan === "pro" && plan.provider === "web";

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
    ? `${plan.remaining} of ${plan.includedSpins} included spins left this month` +
      (plan.packCredits > 0 ? ` · ${plan.packCredits} extra credits` : "")
    : plan.enforced
      ? `${plan.remaining} of ${plan.freeTotal} free spins left` +
        (plan.packCredits > 0 ? ` · ${plan.packCredits} pack credits` : "")
      : "Free plan";

  return (
    <div className="mt-6 rounded-3xl border border-fw-border bg-white p-6">
      {purchaseNotice && (
        <div className="mb-4 rounded-2xl bg-fw-purpleSoft px-4 py-3 text-[13px] font-semibold text-fw-text">
          Payment received — your plan updates within a few seconds. Refresh if you don&apos;t
          see it yet.
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-fw-black" />
            <h2 className="text-[16px] font-bold text-fw-text">
              {webPro ? "Spinr Pro" : "Your plan"}
            </h2>
          </div>
          <p className="mt-1 text-[13px] text-fw-darkGray">{summary}</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {webPro ? (
            <>
              <Button onClick={() => void buy("topup")} disabled={busy !== null} className="h-10 px-5 text-[13px]">
                {busy === "topup" ? "Opening checkout…" : "Top up 5 spins — $12.50"}
              </Button>
              <Button asChild variant="outline" className="h-10 px-5 text-[13px]">
                <a href="/api/billing/portal">Manage subscription</a>
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => void buy("pack")}
                disabled={busy !== null}
                variant="outline"
                className="h-10 px-5 text-[13px]"
              >
                {busy === "pack" ? "Opening checkout…" : "10-spin pack — $39"}
              </Button>
              <Button onClick={() => void buy("pro")} disabled={busy !== null} className="h-10 px-5 text-[13px]">
                {busy === "pro" ? "Opening checkout…" : "Go Pro — $29/mo"}
              </Button>
            </>
          )}
        </div>
      </div>
      {error && <p className="mt-3 text-[13px] font-semibold text-red-600">{error}</p>}
      <p className="mt-3 text-[11px] text-fw-lightGray">
        Secure checkout by Lemon Squeezy. Pack spins never expire · unlimited views on every
        plan{webPro ? " · cancel anytime" : ""}.
      </p>
    </div>
  );
}
