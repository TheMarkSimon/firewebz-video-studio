// Step 2 of the Shopify connection: Shopify redirects the merchant back
// here after they approve. We verify everything (state cookie, HMAC
// signature, shop format), exchange the code for an offline Admin API
// token, and upsert the ShopifyConnection on the signed-in user.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { getAppOrigin } from "@/lib/app-origin";
import {
  exchangeCodeForToken,
  normalizeShopDomain,
  shopifyConfigured,
  shopifyGraphQL,
  verifyOAuthHmac,
  SHOPIFY_STATE_COOKIE,
} from "@/lib/shopify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function studioRedirect(origin: string, params: Record<string, string>): NextResponse {
  const url = new URL("/studio", origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = NextResponse.redirect(url);
  res.cookies.delete(SHOPIFY_STATE_COOKIE);
  return res;
}

function stateMatches(fromQuery: string | null, fromCookie: string | undefined): boolean {
  if (!fromQuery || !fromCookie) return false;
  const a = Buffer.from(fromQuery);
  const b = Buffer.from(fromCookie);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(req: NextRequest) {
  const origin = getAppOrigin() ?? req.nextUrl.origin;
  const sp = req.nextUrl.searchParams;

  const userId = await getUserId();
  if (!userId) return studioRedirect(origin, { shopify: "error", reason: "auth" });
  if (!shopifyConfigured()) return studioRedirect(origin, { shopify: "error", reason: "config" });

  if (!stateMatches(sp.get("state"), req.cookies.get(SHOPIFY_STATE_COOKIE)?.value)) {
    return studioRedirect(origin, { shopify: "error", reason: "state" });
  }
  if (!verifyOAuthHmac(sp)) {
    return studioRedirect(origin, { shopify: "error", reason: "hmac" });
  }

  const shop = normalizeShopDomain(sp.get("shop") ?? "");
  const code = sp.get("code");
  if (!shop || !code) return studioRedirect(origin, { shopify: "error", reason: "shop" });

  // One Spinr account per shop — refuse silent takeovers.
  const existing = await prisma.shopifyConnection.findUnique({ where: { shop } });
  if (existing && existing.userId !== userId) {
    return studioRedirect(origin, { shopify: "error", reason: "owned" });
  }

  let accessToken: string;
  let scope: string;
  try {
    ({ accessToken, scope } = await exchangeCodeForToken(shop, code));
  } catch (err) {
    console.error("[shopify/callback] token exchange failed:", err);
    return studioRedirect(origin, { shopify: "error", reason: "token" });
  }

  // Grab the store's display name — also proves the token works. Non-fatal.
  let shopName: string | null = null;
  try {
    const data = await shopifyGraphQL<{ shop: { name: string } }>(
      shop,
      accessToken,
      `{ shop { name } }`,
    );
    shopName = data.shop?.name ?? null;
  } catch (err) {
    console.error("[shopify/callback] shop name lookup failed (non-fatal):", err);
  }

  await prisma.shopifyConnection.upsert({
    where: { shop },
    create: { userId, shop, shopName, accessToken, scope },
    update: { shopName, accessToken, scope },
  });

  return studioRedirect(origin, { shopify: "connected", shop });
}
