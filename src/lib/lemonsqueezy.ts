// Lemon Squeezy — web billing for non-Shopify users (Phase 5b).
// LS is the merchant of record: they run checkout, collect worldwide
// VAT/sales tax, and send webhooks that drive our plan state.
//
// Products (store 439398 "Spinr", env-configured):
//   PRO   — $29/mo subscription, 10 spins/month included
//   PACK  — $39 one-time, 10 credits, no subscription needed
//   TOPUP — $12.50 one-time, 5 credits, ACTIVE SUBSCRIBERS ONLY
//           (gated in our checkout route; $2.50/spin matches the
//           Shopify overage rate — see docs/lemonsqueezy-plan.md)
//
// Test mode: while the LS store is unactivated, checkouts run with test
// cards only — safe end-to-end testing before real money.

import { createHmac, timingSafeEqual } from "node:crypto";

const API = "https://api.lemonsqueezy.com/v1";

export function lsConfigured(): boolean {
  return Boolean(
    process.env.LEMONSQUEEZY_API_KEY &&
      process.env.LEMONSQUEEZY_STORE_ID &&
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET,
  );
}

export function lsVariantIds() {
  return {
    pro: process.env.LEMONSQUEEZY_PRO_VARIANT_ID ?? "",
    pack: process.env.LEMONSQUEEZY_PACK_VARIANT_ID ?? "",
    topup: process.env.LEMONSQUEEZY_TOPUP_VARIANT_ID ?? "",
  };
}

// Credits granted per one-time variant. The pro subscription grants no
// credits — its allowance is computed monthly from the SpinUsage ledger.
export function creditsForVariant(variantId: string): number {
  const v = lsVariantIds();
  if (variantId === v.pack) return 10;
  if (variantId === v.topup) return 5;
  return 0;
}

// Create a hosted checkout for a signed-in user. custom.user_id is how the
// webhook attributes the purchase to a Spinr account — never sell without it.
export async function createCheckout(opts: {
  variantId: string;
  userId: string;
  email: string;
  redirectUrl: string;
}): Promise<string> {
  const res = await fetch(`${API}/checkouts`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            email: opts.email,
            custom: { user_id: opts.userId },
          },
          product_options: {
            redirect_url: opts.redirectUrl,
            receipt_button_text: "Back to Spinr Studio",
            receipt_link_url: opts.redirectUrl,
          },
        },
        relationships: {
          store: { data: { type: "stores", id: process.env.LEMONSQUEEZY_STORE_ID } },
          variant: { data: { type: "variants", id: opts.variantId } },
        },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`LS checkout create failed: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as { data?: { attributes?: { url?: string } } };
  const url = json.data?.attributes?.url;
  if (!url) throw new Error("LS checkout returned no URL");
  return url;
}

// Webhook signature: HMAC-SHA256 hex of the RAW body with the signing secret.
export function verifyLsSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(digest);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Statuses we treat as "has an active web Pro plan".
export function lsStatusIsActive(status: string | null | undefined): boolean {
  return status === "active" || status === "on_trial" || status === "past_due";
}
