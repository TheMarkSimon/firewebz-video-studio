"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  disconnectShopify,
  startShopifySubscription,
  cancelShopifySubscription,
} from "@/lib/actions/shopify";
import { Store, Loader2, CheckCircle, AlertCircle } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  auth: "Please sign in and try again.",
  config: "Shopify isn't configured on the server yet (missing app credentials).",
  shop: "That doesn't look like a myshopify.com store domain.",
  state: "That connection attempt expired — please try again.",
  hmac: "Shopify's response failed verification — please try again.",
  token: "Shopify rejected the connection — please try again.",
  owned: "That store is already connected to a different Spinr account.",
  scopes:
    "Shopify granted no product permissions. Fix: in the Partner dashboard, save the app's scopes (read_products,write_products); then on the store, uninstall the Spinr app (Settings → Apps and sales channels); then connect again here and approve the new permission screen.",
};

export function ShopifyConnectCard({
  connection,
  notice,
  reason,
  billing,
  billingNotice,
}: {
  connection: { shop: string; shopName: string | null } | null;
  notice: string | null; // "connected" | "error" | null, from the OAuth redirect
  reason: string | null;
  billing: {
    status: string | null;
    test: boolean;
    priceUsd: string;
    includedSpins: number;
    overageUsd: string;
    includedUsed: number;
    overageCount: number;
    enforced: boolean;
    freeRemaining: number;
    freeTotal: number;
  } | null;
  billingNotice: string | null; // "active" | "incomplete" | "error" | null
}) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const banner =
    notice === "connected"
      ? { kind: "ok" as const, text: "Shopify store connected. Browse your products to create spins from the photos already on them." }
      : notice === "error"
        ? { kind: "err" as const, text: ERROR_MESSAGES[reason ?? ""] ?? "Something went wrong connecting Shopify." }
        : billingNotice === "active"
          ? { kind: "ok" as const, text: "Spinr Pro is active — billed through your Shopify account. Nothing else to set up." }
          : billingNotice === "incomplete"
            ? { kind: "err" as const, text: "The subscription wasn't completed on Shopify. You can upgrade again any time." }
            : billingNotice === "error"
              ? { kind: "err" as const, text: "Couldn't confirm the subscription with Shopify — reload to retry." }
              : null;

  function onDisconnect() {
    if (!connection) return;
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 2500);
      return;
    }
    startTransition(() => disconnectShopify(connection.shop));
  }

  return (
    <div className="mt-8 rounded-2xl border border-fw-border bg-white p-5">
      {banner && (
        <div
          className={`mb-4 flex items-start gap-2 rounded-xl px-4 py-3 text-[13px] ${
            banner.kind === "ok" ? "bg-emerald-500/10 text-emerald-800" : "bg-destructive/10 text-destructive"
          }`}
        >
          {banner.kind === "ok" ? (
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {banner.text}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fw-purpleSoft">
            <Store className="h-5 w-5 text-fw-text" />
          </div>
          <div>
            <p className="text-[15px] font-bold text-fw-text">Shopify</p>
            {connection ? (
              <p className="flex items-center gap-1.5 text-[13px] text-fw-darkGray">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                Connected to <strong className="text-fw-text">{connection.shopName ?? connection.shop}</strong>
                <span className="text-fw-lightGray">({connection.shop})</span>
              </p>
            ) : (
              <p className="text-[13px] text-fw-darkGray">
                Connect your store to import products and push spins back — no theme edits.
              </p>
            )}
          </div>
        </div>

        {connection ? (
          <div className="flex items-center gap-2">
            <Button asChild className="h-10 px-5 text-[13px]">
              <Link href="/studio/products">Browse products</Link>
            </Button>
            <Button variant="outline" onClick={onDisconnect} disabled={isPending} className="h-10 px-5 text-[13px]">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {confirming ? "Click again to confirm" : "Disconnect"}
            </Button>
          </div>
        ) : (
          <form action="/api/shopify/connect" method="GET" className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              name="shop"
              required
              placeholder="your-store.myshopify.com"
              className="h-10 w-64 rounded-xl border border-fw-border bg-white px-3.5 text-[13px] text-fw-text outline-none placeholder:text-fw-lightGray focus:border-fw-black"
            />
            <Button type="submit" className="h-10 px-5 text-[13px]">
              Connect
            </Button>
          </form>
        )}
      </div>

      {connection && billing && <PlanRow billing={billing} />}
    </div>
  );
}

// Free ↔ Pro, billed through Shopify (Billing API): upgrade sends the
// merchant to Shopify's confirmation screen; cancel is immediate.
function PlanRow({
  billing,
}: {
  billing: {
    status: string | null;
    test: boolean;
    priceUsd: string;
    includedSpins: number;
    overageUsd: string;
    includedUsed: number;
    overageCount: number;
    enforced: boolean;
    freeRemaining: number;
    freeTotal: number;
  };
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = billing.status === "ACTIVE";

  function upgrade() {
    setError(null);
    startTransition(async () => {
      const res = await startShopifySubscription();
      if (res.ok) window.location.href = res.confirmationUrl;
      else setError(res.error);
    });
  }

  function cancel() {
    if (!confirmCancel) {
      setConfirmCancel(true);
      setTimeout(() => setConfirmCancel(false), 2500);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await cancelShopifySubscription();
      if (!res.ok) setError(res.error ?? "Cancel failed.");
    });
  }

  return (
    <div className="mt-4 border-t border-fw-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[13px] font-bold text-fw-text">
            {active ? "Spinr Pro" : "Free plan"}
            {active && billing.test && (
              <span className="rounded-full bg-fw-disabled px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fw-darkGray">
                test mode
              </span>
            )}
          </p>
          {/* Lead with the user's OWN balance ("N left"), never just the
              plan pitch — merchants must always know where they stand. */}
          <p className="mt-0.5 text-[12px] text-fw-darkGray">
            {active
              ? `${Math.max(0, billing.includedSpins - billing.includedUsed)} of ${billing.includedSpins} included spin${billing.includedSpins === 1 ? "" : "s"} left this cycle` +
                (billing.overageCount > 0
                  ? ` · ${billing.overageCount} extra ($${(billing.overageCount * parseFloat(billing.overageUsd)).toFixed(2)}) on your Shopify invoice`
                  : ` · extras are $${billing.overageUsd}/spin`) +
                ". Views are never metered."
              : (billing.enforced
                  ? `You have ${billing.freeRemaining} of ${billing.freeTotal} free spins left. `
                  : `Includes ${billing.freeTotal} free spins — and everything's free while we're in beta. `) +
                `Pro: $${billing.priceUsd}/mo for ${billing.includedSpins} spin${billing.includedSpins === 1 ? "" : "s"} a month, then $${billing.overageUsd}/spin. Billed through Shopify — no card entry.`}
          </p>
        </div>
        {active ? (
          <Button variant="outline" onClick={cancel} disabled={isPending} className="h-9 px-4 text-[12px]">
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {confirmCancel ? "Click again to confirm" : "Cancel plan"}
          </Button>
        ) : (
          <Button onClick={upgrade} disabled={isPending} className="h-9 px-4 text-[12px]">
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Upgrade to Pro
          </Button>
        )}
      </div>
      {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
