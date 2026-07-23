// Auth for the embedded admin app.
//
// Every request from /shopify/app carries an App Bridge SESSION TOKEN
// (Authorization: Bearer <jwt>) — a short-lived HS256 JWT signed with the
// app secret, whose `dest` claim names the shop. We verify it ourselves
// (30 lines of node:crypto — no jsonwebtoken dependency) and then resolve
// the shop to a Spinr account:
//
//   - Existing connection → its owning user (Google user or shadow user).
//   - No connection (fresh App Store install opened in admin) → TOKEN
//     EXCHANGE mints an offline Admin token, and we provision a SHADOW USER
//     (email "shopify:<shop>") to own the shop's spins. If the merchant
//     later signs in on thespinr.com and connects the same shop, the OAuth
//     callback merges the shadow account into their Google account.

import { createHmac, timingSafeEqual } from "node:crypto";
import type { ShopifyConnection } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getAppOrigin } from "@/lib/app-origin";
import { exchangeSessionToken, registerAppWebhooks, shopifyGraphQL } from "@/lib/shopify";

export const SHADOW_EMAIL_PREFIX = "shopify:";

export class EmbeddedAuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

function b64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Verify an App Bridge session token: signature (HS256, app secret),
// expiry/nbf, audience (our client id). Returns the shop domain from `dest`.
export function verifySessionToken(token: string): { shop: string } {
  const secret = process.env.SHOPIFY_API_SECRET;
  const clientId = process.env.SHOPIFY_API_KEY;
  if (!secret || !clientId) throw new EmbeddedAuthError("App credentials not configured", 500);

  const parts = token.split(".");
  if (parts.length !== 3) throw new EmbeddedAuthError("Malformed session token");
  const [header, payload, signature] = parts;

  const expected = b64url(createHmac("sha256", secret).update(`${header}.${payload}`).digest());
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new EmbeddedAuthError("Invalid session token signature");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let claims: any;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new EmbeddedAuthError("Unreadable session token payload");
  }

  const now = Math.floor(Date.now() / 1000);
  const skew = 10;
  if (typeof claims.exp !== "number" || claims.exp < now - skew) {
    throw new EmbeddedAuthError("Session token expired");
  }
  if (typeof claims.nbf === "number" && claims.nbf > now + skew) {
    throw new EmbeddedAuthError("Session token not yet valid");
  }
  if (claims.aud !== clientId) throw new EmbeddedAuthError("Session token audience mismatch");

  let shop: string;
  try {
    shop = new URL(claims.dest).hostname.toLowerCase();
  } catch {
    throw new EmbeddedAuthError("Session token missing shop");
  }
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) {
    throw new EmbeddedAuthError("Session token shop not recognized");
  }
  return { shop };
}

export interface ShopContext {
  shop: string;
  userId: string;
  connection: ShopifyConnection;
}

// Resolve the Authorization header to a full shop context, provisioning the
// connection + shadow user on first embedded open (token exchange).
export async function requireShopContext(req: Request): Promise<ShopContext> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) throw new EmbeddedAuthError("Missing session token");

  const { shop } = verifySessionToken(token);

  let connection = await prisma.shopifyConnection.findUnique({ where: { shop } });
  if (!connection) {
    const exchange = () =>
      exchangeSessionToken(shop, token).catch((err) => {
        console.error(`[embedded-auth] token exchange failed for ${shop}:`, err);
        throw new EmbeddedAuthError("Store setup incomplete — complete the connection first", 409);
      });

    // Validate the minted token with a trivial Admin call before trusting
    // it. Fresh App Store installs have produced tokens that 401 on first
    // use (seen during app review 2026-07) — retry the exchange once with
    // a short delay before giving up, and log everything: this path runs
    // exactly once per store, when nobody is watching.
    const validate = async (tok: string): Promise<string | null> => {
      try {
        const data = await shopifyGraphQL<{ shop: { name: string } }>(shop, tok, `{ shop { name } }`);
        return data.shop?.name ?? "";
      } catch (err) {
        console.error(`[embedded-auth] minted-token validation failed for ${shop}:`, err);
        return null;
      }
    };

    let minted = await exchange();
    console.error(
      `[embedded-auth] provisioning ${shop}: scope="${minted.scope}" expiring=${Boolean(minted.expiresAt)}`,
    );
    let shopName = await validate(minted.accessToken);
    if (shopName === null) {
      await new Promise((r) => setTimeout(r, 1500));
      minted = await exchange();
      shopName = await validate(minted.accessToken);
      console.error(
        `[embedded-auth] exchange retry for ${shop}: ${shopName === null ? "STILL FAILING" : "recovered"}`,
      );
    }
    if (shopName === null) {
      // Surface a readable, retryable error instead of letting downstream
      // Admin calls 401 into a generic 500.
      throw new EmbeddedAuthError(
        "Shopify hasn't finished activating this store's access yet — please reopen the app in a few seconds.",
        503,
      );
    }

    const shadow = await prisma.user.upsert({
      where: { email: `${SHADOW_EMAIL_PREFIX}${shop}` },
      create: { email: `${SHADOW_EMAIL_PREFIX}${shop}`, name: shop.replace(".myshopify.com", "") },
      update: {},
    });

    connection = await prisma.shopifyConnection.upsert({
      where: { shop },
      create: {
        userId: shadow.id,
        shop,
        accessToken: minted.accessToken,
        tokenExpiresAt: minted.expiresAt,
        scope: minted.scope,
        shopName: shopName || undefined,
      },
      update: {
        accessToken: minted.accessToken,
        tokenExpiresAt: minted.expiresAt,
        scope: minted.scope,
        shopName: shopName || undefined,
      },
    });

    const origin = getAppOrigin();
    if (origin) await registerAppWebhooks(shop, minted.accessToken, origin);
  }

  return { shop, userId: connection.userId, connection };
}
