"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { disconnectShopify } from "@/lib/actions/shopify";
import { Store, Loader2, CheckCircle, AlertCircle } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  auth: "Please sign in and try again.",
  config: "Shopify isn't configured on the server yet (missing app credentials).",
  shop: "That doesn't look like a myshopify.com store domain.",
  state: "That connection attempt expired — please try again.",
  hmac: "Shopify's response failed verification — please try again.",
  token: "Shopify rejected the connection — please try again.",
  owned: "That store is already connected to a different Spinr account.",
};

export function ShopifyConnectCard({
  connection,
  notice,
  reason,
}: {
  connection: { shop: string; shopName: string | null } | null;
  notice: string | null; // "connected" | "error" | null, from the OAuth redirect
  reason: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const banner =
    notice === "connected"
      ? { kind: "ok" as const, text: "Shopify store connected. Browse your products to create spins from the photos already on them." }
      : notice === "error"
        ? { kind: "err" as const, text: ERROR_MESSAGES[reason ?? ""] ?? "Something went wrong connecting Shopify." }
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
    </div>
  );
}
