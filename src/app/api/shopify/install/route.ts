// App Store install entry. Set this as the app's App URL in the Partner
// dashboard: when a merchant installs from the listing (or opens the app in
// their admin), Shopify GETs this URL with ?shop=...&hmac=...&timestamp=...
// and expects OAuth to begin.
//
// Two cases:
//   - Merchant already signed in to Spinr → straight into the OAuth
//     authorize flow (via /api/shopify/connect, which owns the CSRF state).
//   - No Spinr session yet (typical App Store install) → remember the shop
//     in a short-lived cookie and send them to sign in; /studio resumes the
//     connection automatically after Google auth (see studio/page.tsx).

import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { getAppOrigin } from "@/lib/app-origin";
import { normalizeShopDomain, shopifyConfigured, verifyOAuthHmac } from "@/lib/shopify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PENDING_SHOP_COOKIE = "spinr_pending_shop";

export async function GET(req: NextRequest) {
  const origin = getAppOrigin() ?? req.nextUrl.origin;
  const sp = req.nextUrl.searchParams;

  const shop = normalizeShopDomain(sp.get("shop") ?? "");
  if (!shop || !shopifyConfigured()) {
    return NextResponse.redirect(new URL("/", origin));
  }
  // Shopify signs these requests like OAuth redirects; refuse forgeries.
  if (sp.get("hmac") && !verifyOAuthHmac(sp)) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  const userId = await getUserId();
  if (userId) {
    return NextResponse.redirect(new URL(`/api/shopify/connect?shop=${encodeURIComponent(shop)}`, origin));
  }

  // No Spinr account yet: park the shop, collect the sign-in, resume.
  const res = NextResponse.redirect(new URL("/studio", origin));
  res.cookies.set(PENDING_SHOP_COOKIE, shop, {
    httpOnly: true,
    secure: origin.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 60,
  });
  return res;
}
