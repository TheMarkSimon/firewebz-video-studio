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

// --- Catalog + metafield operations ----------------------------------------

export interface ShopifyProduct {
  gid: string; // gid://shopify/Product/123
  title: string;
  handle: string;
  status: string; // ACTIVE | DRAFT | ARCHIVED
  imageUrls: string[]; // up to 4, merchant's order (first = featured)
}

export async function fetchProducts(
  shop: string,
  accessToken: string,
  first = 50,
): Promise<ShopifyProduct[]> {
  const data = await shopifyGraphQL<{
    products: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          handle: string;
          status: string;
          images: { edges: Array<{ node: { url: string } }> };
        };
      }>;
    };
  }>(
    shop,
    accessToken,
    `query Products($first: Int!) {
      products(first: $first, sortKey: TITLE) {
        edges { node {
          id title handle status
          images(first: 4) { edges { node { url } } }
        } }
      }
    }`,
    { first },
  );
  return data.products.edges.map(({ node }) => ({
    gid: node.id,
    title: node.title,
    handle: node.handle,
    status: node.status,
    imageUrls: node.images.edges.map((e) => e.node.url),
  }));
}

export async function fetchProduct(
  shop: string,
  accessToken: string,
  productGid: string,
): Promise<ShopifyProduct | null> {
  const data = await shopifyGraphQL<{
    product: {
      id: string;
      title: string;
      handle: string;
      status: string;
      images: { edges: Array<{ node: { url: string } }> };
    } | null;
  }>(
    shop,
    accessToken,
    `query Product($id: ID!) {
      product(id: $id) {
        id title handle status
        images(first: 4) { edges { node { url } } }
      }
    }`,
    { id: productGid },
  );
  if (!data.product) return null;
  return {
    gid: data.product.id,
    title: data.product.title,
    handle: data.product.handle,
    status: data.product.status,
    imageUrls: data.product.images.edges.map((e) => e.node.url),
  };
}

// Write the spin id onto the product as custom.spinr_id — the metafield the
// storefront Liquid/app block reads (pattern validated on the dev store).
export async function setSpinMetafield(
  shop: string,
  accessToken: string,
  productGid: string,
  spinId: string,
): Promise<void> {
  const data = await shopifyGraphQL<{
    metafieldsSet: {
      metafields: Array<{ id: string }> | null;
      userErrors: Array<{ field: string[] | null; message: string }>;
    };
  }>(
    shop,
    accessToken,
    `mutation SetSpin($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message }
      }
    }`,
    {
      metafields: [
        {
          ownerId: productGid,
          namespace: "custom",
          key: "spinr_id",
          type: "single_line_text_field",
          value: spinId,
        },
      ],
    },
  );
  const errs = data.metafieldsSet.userErrors;
  if (errs?.length) {
    throw new Error(`metafieldsSet: ${errs.map((e) => e.message).join("; ").slice(0, 300)}`);
  }
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
