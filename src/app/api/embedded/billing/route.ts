// Embedded billing: subscribe (returns the Shopify confirmation URL — the
// client redirects the TOP window there) and cancel. The return URL carries
// ?shop so the billing callback can reconcile without a web session, then
// sends the merchant back into their admin.

import { NextRequest, NextResponse } from "next/server";
import { EmbeddedAuthError, requireShopContext } from "@/lib/embedded-auth";
import { cancelSubscriptionCore, subscribeCore } from "@/lib/shopify-ops";
import { getAppOrigin } from "@/lib/app-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireShopContext(req);
    const body = (await req.json().catch(() => ({}))) as { action?: string };

    if (body.action === "cancel") {
      const result = await cancelSubscriptionCore(ctx.connection);
      return NextResponse.json(result, { status: result.ok ? 200 : 422 });
    }

    const origin = getAppOrigin() ?? req.nextUrl.origin;
    const result = await subscribeCore(
      ctx.connection,
      `${origin}/api/shopify/billing/callback?shop=${encodeURIComponent(ctx.shop)}&embedded=1`,
    );
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (err) {
    if (err instanceof EmbeddedAuthError) {
      console.error("[embedded] auth refused:", err.message);
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[embedded/billing]", err);
    return NextResponse.json({ error: "Billing action failed — try again." }, { status: 500 });
  }
}
