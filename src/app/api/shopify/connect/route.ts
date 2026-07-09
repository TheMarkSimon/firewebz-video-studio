// Step 1 of the Shopify connection: signed-in merchant submits their store
// domain, we bounce them to Shopify's authorize screen. CSRF protection via
// a random state value pinned in an httpOnly cookie and echoed back by
// Shopify to the callback.

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getUserId } from "@/lib/auth";
import { getAppOrigin } from "@/lib/app-origin";
import {
  buildAuthorizeUrl,
  normalizeShopDomain,
  shopifyConfigured,
  SHOPIFY_STATE_COOKIE,
} from "@/lib/shopify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function studioRedirect(origin: string, params: Record<string, string>): NextResponse {
  const url = new URL("/studio", origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const origin = getAppOrigin() ?? req.nextUrl.origin;

  const userId = await getUserId();
  if (!userId) return studioRedirect(origin, { shopify: "error", reason: "auth" });

  if (!shopifyConfigured()) {
    return studioRedirect(origin, { shopify: "error", reason: "config" });
  }

  const shop = normalizeShopDomain(req.nextUrl.searchParams.get("shop") ?? "");
  if (!shop) return studioRedirect(origin, { shopify: "error", reason: "shop" });

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(buildAuthorizeUrl(shop, `${origin}/api/shopify/callback`, state));
  res.cookies.set(SHOPIFY_STATE_COOKIE, state, {
    httpOnly: true,
    secure: origin.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: 600, // the whole approve-dance takes seconds; 10 min is plenty
  });
  return res;
}
