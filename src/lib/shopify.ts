// Shopify Admin API + OAuth helpers (Phase 4).
//
// Classic authorization-code OAuth for a NON-embedded app: the merchant
// clicks "Connect Shopify" in their Spinr studio, approves on Shopify, and
// we store an offline Admin API token on their ShopifyConnection row.
//
// Env (add via CLI, never the dashboard UI):
//   SHOPIFY_API_KEY     — app client ID (Partner dashboard)
//   SHOPIFY_API_SECRET  — app client secret; also signs OAuth HMACs
//   SHOPIFY_SCOPES      — optional override, default below

import { createHmac, timingSafeEqual } from "node:crypto";

// read_products: catalog import. write_products: set the custom.spinr_id
// metafield when pushing embeds back (validated dev-store pattern).
export const SHOPIFY_SCOPES = process.env.SHOPIFY_SCOPES ?? "read_products,write_products";

// Quarterly-versioned Admin API. Bump deliberately; each version lives ~12mo.
export const SHOPIFY_API_VERSION = "2026-01";

// CSRF state cookie shared by the connect + callback routes (route files
// may only export handlers, so the constant lives here).
export const SHOPIFY_STATE_COOKIE = "spinr_shopify_state";

export function shopifyConfigured(): boolean {
  return Boolean(process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET);
}

// Accepts "kokok", "kokok.myshopify.com", or a pasted URL; returns the
// canonical myshopify domain or null if it can't be one.
export function normalizeShopDomain(input: string): string | null {
  let s = input.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!s.includes(".")) s = `${s}.myshopify.com`;
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(s) ? s : null;
}

export function buildAuthorizeUrl(shop: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.SHOPIFY_API_KEY ?? "",
    scope: SHOPIFY_SCOPES,
    redirect_uri: redirectUri,
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

// Shopify signs OAuth redirects: HMAC-SHA256 (hex) over the query string
// minus `hmac`/`signature`, keys sorted, using the app secret as key.
export function verifyOAuthHmac(searchParams: URLSearchParams): boolean {
  const secret = process.env.SHOPIFY_API_SECRET;
  const hmac = searchParams.get("hmac");
  if (!secret || !hmac) return false;
  const message = [...new Set([...searchParams.keys()])]
    .filter((k) => k !== "hmac" && k !== "signature")
    .sort()
    .map((k) => `${k}=${searchParams.getAll(k).join(",")}`)
    .join("&");
  const digest = createHmac("sha256", secret).update(message).digest("hex");
  const a = Buffer.from(digest);
  const b = Buffer.from(hmac);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function exchangeCodeForToken(
  shop: string,
  code: string,
): Promise<{ accessToken: string; scope: string }> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  const json = (await res.json()) as { access_token?: string; scope?: string };
  if (!json.access_token) throw new Error("Token exchange returned no access_token");
  return { accessToken: json.access_token, scope: json.scope ?? "" };
}

// Minimal Admin GraphQL client. Throws on transport or GraphQL errors.
export async function shopifyGraphQL<T = unknown>(
  shop: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Shopify GraphQL: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (json.errors) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors).slice(0, 300)}`);
  }
  if (json.data == null) throw new Error("Shopify GraphQL returned no data");
  return json.data;
}
