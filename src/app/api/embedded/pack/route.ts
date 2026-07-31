// Embedded: start a one-time Spin Pack purchase (10 spins / $39) through
// Shopify Billing. Returns the confirmation URL the merchant approves on.

import { NextRequest, NextResponse } from "next/server";
import { EmbeddedAuthError, requireShopContext } from "@/lib/embedded-auth";
import { createAppPackPurchase, getShopToken, shopIsDevelopmentStore } from "@/lib/shopify";
import { getAppOrigin } from "@/lib/app-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { shop, connection } = await requireShopContext(req);
    const token = await getShopToken(connection);
    // Dev stores (incl. app reviewers) can only approve TEST charges.
    const forceTest = await shopIsDevelopmentStore(shop, token);
    const origin = getAppOrigin() ?? req.nextUrl.origin;
    const returnUrl = `${origin}/api/shopify/billing/pack-callback?shop=${encodeURIComponent(shop)}&embedded=1`;
    const { confirmationUrl } = await createAppPackPurchase(shop, token, returnUrl, { forceTest });
    return NextResponse.json({ confirmationUrl });
  } catch (err) {
    if (err instanceof EmbeddedAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[embedded/pack]", err);
    return NextResponse.json({ error: "Couldn't start the purchase — try again." }, { status: 500 });
  }
}
