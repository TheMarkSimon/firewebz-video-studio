// Per-request CSP for the embedded admin app. Review requirement: the
// frame-ancestors directive must allow the SPECIFIC shop's admin plus
// admin.shopify.com. The shop comes from the ?shop query param Shopify
// always appends when loading the app; fall back to the myshopify wildcard
// when it's absent (e.g. client-side navigations).
//
// Edge runtime — no node imports, validation is a plain regex.

import { NextRequest, NextResponse } from "next/server";

export const config = { matcher: ["/shopify/:path*"] };

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const raw = (req.nextUrl.searchParams.get("shop") ?? "").toLowerCase();
  const shop = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(raw) ? raw : null;
  const ancestors = shop
    ? `https://${shop} https://admin.shopify.com`
    : "https://*.myshopify.com https://admin.shopify.com";
  res.headers.set("Content-Security-Policy", `frame-ancestors ${ancestors};`);
  return res;
}
