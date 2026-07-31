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
import { prisma } from "@/lib/db";

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
): Promise<{ accessToken: string; scope: string; expiresAt: Date | null }> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
      // Deprecated non-expiring offline tokens are REJECTED on new installs
      // ("Invalid API key or access token") — always request the expiring
      // variant; getShopToken refreshes via client_credentials.
      expiring: 1,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  const json = (await res.json()) as { access_token?: string; scope?: string; expires_in?: number };
  if (!json.access_token) throw new Error("Token exchange returned no access_token");
  return {
    accessToken: json.access_token,
    scope: json.scope ?? "",
    expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
  };
}

// Public-distribution apps only get EXPIRING Admin tokens (~24h); static
// tokens 403 with "Non-expiring access tokens are no longer accepted". The
// client-credentials grant mints a fresh token server-to-server for any
// shop the app is installed on — no merchant interaction needed.
async function mintClientCredentialsToken(
  shop: string,
): Promise<{ accessToken: string; expiresAt: Date | null }> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`client_credentials grant failed: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("client_credentials grant returned no access_token");
  return {
    accessToken: json.access_token,
    expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
  };
}

// The one true way to get a usable Admin token for a connection: returns the
// stored token while fresh, otherwise mints + persists a new one. ALWAYS use
// this instead of reading connection.accessToken directly.
export async function getShopToken(
  connection: {
    id: string;
    shop: string;
    accessToken: string;
    tokenExpiresAt: Date | null;
  },
  opts: { force?: boolean } = {},
): Promise<string> {
  const freshUntil = connection.tokenExpiresAt?.getTime() ?? 0;
  if (!opts.force && freshUntil > Date.now() + 2 * 60 * 1000) return connection.accessToken;

  try {
    const minted = await mintClientCredentialsToken(connection.shop);
    await prisma.shopifyConnection.update({
      where: { id: connection.id },
      data: { accessToken: minted.accessToken, tokenExpiresAt: minted.expiresAt },
    });
    return minted.accessToken;
  } catch (err) {
    // Best effort: legacy stores (pre-public-distribution) may still accept
    // the stored static token.
    console.error("[shopify] token refresh failed, using stored token:", err);
    return connection.accessToken;
  }
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
      products(first: $first, sortKey: TITLE, query: "status:active") {
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

// Token exchange (embedded app): swap a verified App Bridge session token
// for an offline Admin API access token — no OAuth redirect dance. Works
// for any shop where the app is installed.
export async function exchangeSessionToken(
  shop: string,
  sessionToken: string,
): Promise<{ accessToken: string; scope: string; expiresAt: Date | null }> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token: sessionToken,
      subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
      requested_token_type: "urn:shopify:params:oauth:token-type:offline-access-token",
      // Without this, the exchange mints a DEPRECATED non-expiring token that
      // new stores refuse on every Admin call — the app-review blocker of
      // 2026-07 (dev dashboard: "Deprecated offline token use detected").
      expiring: 1,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  const json = (await res.json()) as { access_token?: string; scope?: string; expires_in?: number };
  if (!json.access_token) throw new Error("Token exchange returned no access_token");
  return {
    accessToken: json.access_token,
    scope: json.scope ?? "",
    expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
  };
}

// Register app-lifecycle webhooks (idempotent: "already taken" errors are
// expected on reconnect and ignored). Called after every OAuth callback so
// each installed shop reports uninstalls and subscription changes to
// /api/webhooks/shopify. The GDPR compliance topics are NOT registered here
// — Shopify only accepts those via the Partner dashboard configuration.
export async function registerAppWebhooks(
  shop: string,
  accessToken: string,
  origin: string,
): Promise<void> {
  const callbackUrl = `${origin}/api/webhooks/shopify`;
  for (const topic of ["APP_UNINSTALLED", "APP_SUBSCRIPTIONS_UPDATE"]) {
    try {
      const data = await shopifyGraphQL<{
        webhookSubscriptionCreate: {
          userErrors: Array<{ message: string }>;
        };
      }>(
        shop,
        accessToken,
        `mutation Register($topic: WebhookSubscriptionTopic!, $sub: WebhookSubscriptionInput!) {
          webhookSubscriptionCreate(topic: $topic, webhookSubscription: $sub) {
            userErrors { message }
          }
        }`,
        { topic, sub: { callbackUrl, format: "JSON" } },
      );
      const errs = data.webhookSubscriptionCreate.userErrors ?? [];
      const real = errs.filter((e) => !/taken/i.test(e.message));
      if (real.length) {
        console.error(`[shopify] webhook ${topic} registration:`, real.map((e) => e.message).join("; "));
      }
    } catch (err) {
      // Non-fatal: the poll/reconcile paths still keep state roughly right.
      console.error(`[shopify] webhook ${topic} registration failed:`, err);
    }
  }
}

// --- Billing (app subscriptions) --------------------------------------------
//
// Merchants pay THROUGH Shopify: we create an AppSubscription, they approve
// it on Shopify's confirmation screen, the charge lands on their existing
// Shopify invoice, and Shopify pays the Partner account out. No card entry,
// no PCI, and it's mandatory anyway for App Store distribution.
//
// Pricing config (env):
//   SPINR_PRO_PRICE_USD  — monthly price, default "29" (placeholder until
//                          the founder sets pricing)
//   SHOPIFY_BILLING_LIVE — set to "1" to create REAL charges. Absent (the
//                          beta default) every subscription is test:true —
//                          full flow, no money moves. Dev stores can only
//                          take test charges regardless.

export const SPINR_PRO_PLAN_NAME = "Spinr Pro";

// Plan economics — every number env-tunable so merchant feedback can move
// pricing without a deploy. Defaults = the launch model (COGS ≈ $0.71/run):
//   Free: 3 lifetime spins. Pro: $29/mo, 10 spins included, $2.50/extra.
export function proPriceUsd(): string {
  return process.env.SPINR_PRO_PRICE_USD ?? "29";
}

export function overagePriceUsd(): string {
  return process.env.SPINR_OVERAGE_USD ?? "2.50";
}

export function proIncludedSpins(): number {
  return parseInt(process.env.SPINR_PRO_INCLUDED_SPINS ?? "10", 10);
}

export function freeSpins(): number {
  return parseInt(process.env.SPINR_FREE_SPINS ?? "3", 10);
}

// Monthly ceiling on overage charges — Shopify requires one; merchants see
// it as spend protection.
export function usageCapUsd(): string {
  return process.env.SPINR_USAGE_CAP_USD ?? "250";
}

// Master switch for quota enforcement. OFF by default: during validation,
// everything stays free (the machinery is deployed but dormant). Flip with
// SPINR_QUOTA_ENFORCE=1 when billing goes live.
export function quotaEnforced(): boolean {
  return process.env.SPINR_QUOTA_ENFORCE === "1";
}

export function billingIsTest(): boolean {
  return process.env.SHOPIFY_BILLING_LIVE !== "1";
}

export interface AppSubscriptionInfo {
  gid: string;
  name: string;
  status: string; // PENDING | ACTIVE | CANCELLED | DECLINED | EXPIRED | FROZEN
  test: boolean;
}

// Two line items: the $29 recurring base AND a usage line (capped) that
// overage spins are billed against. The merchant approves both on one
// confirmation screen; overages then appear on their Shopify invoice with
// no further approval.
// Development stores can never approve REAL charges — even with live
// billing on, their subscriptions must be test charges or the approval
// screen errors out (this includes Shopify's app reviewers).
export async function shopIsDevelopmentStore(shop: string, accessToken: string): Promise<boolean> {
  try {
    const data = await shopifyGraphQL<{ shop: { plan: { partnerDevelopment: boolean } } }>(
      shop,
      accessToken,
      `{ shop { plan { partnerDevelopment } } }`,
    );
    return Boolean(data.shop?.plan?.partnerDevelopment);
  } catch (err) {
    console.error("[shopify] dev-store check failed (assuming dev → test charge):", err);
    return true; // safe default: a wrongly-test charge beats a failed real one
  }
}

export async function createAppSubscription(
  shop: string,
  accessToken: string,
  returnUrl: string,
  opts: { forceTest?: boolean } = {},
): Promise<{ confirmationUrl: string; subscriptionGid: string; usageLineItemGid: string | null }> {
  const data = await shopifyGraphQL<{
    appSubscriptionCreate: {
      confirmationUrl: string | null;
      appSubscription: {
        id: string;
        lineItems: Array<{ id: string; plan: { pricingDetails: { __typename: string } } }>;
      } | null;
      userErrors: Array<{ field: string[] | null; message: string }>;
    };
  }>(
    shop,
    accessToken,
    `mutation Subscribe($name: String!, $returnUrl: URL!, $test: Boolean!, $lineItems: [AppSubscriptionLineItemInput!]!) {
      appSubscriptionCreate(name: $name, returnUrl: $returnUrl, test: $test, lineItems: $lineItems) {
        confirmationUrl
        appSubscription {
          id
          lineItems { id plan { pricingDetails { __typename } } }
        }
        userErrors { field message }
      }
    }`,
    {
      name: SPINR_PRO_PLAN_NAME,
      returnUrl,
      test: billingIsTest() || opts.forceTest === true,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: { amount: proPriceUsd(), currencyCode: "USD" },
              interval: "EVERY_30_DAYS",
            },
          },
        },
        {
          plan: {
            appUsagePricingDetails: {
              cappedAmount: { amount: usageCapUsd(), currencyCode: "USD" },
              terms: `$${overagePriceUsd()} per spin beyond the ${proIncludedSpins()} included each month`,
            },
          },
        },
      ],
    },
  );
  const result = data.appSubscriptionCreate;
  if (result.userErrors?.length) {
    throw new Error(`appSubscriptionCreate: ${result.userErrors.map((e) => e.message).join("; ").slice(0, 300)}`);
  }
  if (!result.confirmationUrl || !result.appSubscription?.id) {
    throw new Error("appSubscriptionCreate returned no confirmationUrl");
  }
  const usageLine = result.appSubscription.lineItems.find(
    (li) => li.plan.pricingDetails.__typename === "AppUsagePricing",
  );
  return {
    confirmationUrl: result.confirmationUrl,
    subscriptionGid: result.appSubscription.id,
    usageLineItemGid: usageLine?.id ?? null,
  };
}

// One-time Spin Pack purchase (10 spins / $39) — the no-subscription offer
// for catalog-project merchants, matching the web (Lemon Squeezy) pack.
// Merchant approves on Shopify's confirmation screen; the return URL gets
// ?charge_id=<numeric id> appended, which the callback verifies via the
// Admin API before granting credits (never trust the query string alone).
export const SPINR_PACK_NAME = "Spinr Spin Pack — 10 spins";

export function packPriceUsd(): string {
  return process.env.SPINR_PACK_PRICE_USD ?? "39";
}
export function packCredits(): number {
  return parseInt(process.env.SPINR_PACK_CREDITS ?? "10", 10);
}

export async function createAppPackPurchase(
  shop: string,
  accessToken: string,
  returnUrl: string,
  opts: { forceTest?: boolean } = {},
): Promise<{ confirmationUrl: string; purchaseGid: string }> {
  const data = await shopifyGraphQL<{
    appPurchaseOneTimeCreate: {
      confirmationUrl: string | null;
      appPurchaseOneTime: { id: string } | null;
      userErrors: Array<{ field: string[] | null; message: string }>;
    };
  }>(
    shop,
    accessToken,
    `mutation Pack($name: String!, $price: MoneyInput!, $returnUrl: URL!, $test: Boolean!) {
      appPurchaseOneTimeCreate(name: $name, price: $price, returnUrl: $returnUrl, test: $test) {
        confirmationUrl
        appPurchaseOneTime { id }
        userErrors { field message }
      }
    }`,
    {
      name: SPINR_PACK_NAME,
      price: { amount: packPriceUsd(), currencyCode: "USD" },
      returnUrl,
      test: billingIsTest() || opts.forceTest === true,
    },
  );
  const result = data.appPurchaseOneTimeCreate;
  if (result.userErrors?.length) {
    throw new Error(`appPurchaseOneTimeCreate: ${result.userErrors.map((e) => e.message).join("; ").slice(0, 300)}`);
  }
  if (!result.confirmationUrl || !result.appPurchaseOneTime?.id) {
    throw new Error("appPurchaseOneTimeCreate returned no confirmationUrl");
  }
  return { confirmationUrl: result.confirmationUrl, purchaseGid: result.appPurchaseOneTime.id };
}

// Verify a one-time purchase by id straight from the Admin API — used by
// the return-URL callback. Returns status + whether it was a test charge.
export async function getAppPurchaseOneTime(
  shop: string,
  accessToken: string,
  purchaseGid: string,
): Promise<{ status: string; test: boolean; name: string } | null> {
  const data = await shopifyGraphQL<{
    node: { status?: string; test?: boolean; name?: string } | null;
  }>(
    shop,
    accessToken,
    `query Pack($id: ID!) {
      node(id: $id) {
        ... on AppPurchaseOneTime { status test name }
      }
    }`,
    { id: purchaseGid },
  );
  if (!data.node?.status) return null;
  return { status: data.node.status, test: Boolean(data.node.test), name: data.node.name ?? "" };
}

// Bill one overage spin against the subscription's usage line. Returns the
// usage record gid. Throws if the capped amount is exhausted.
export async function createAppUsageRecord(
  shop: string,
  accessToken: string,
  usageLineItemGid: string,
  description: string,
): Promise<string> {
  const data = await shopifyGraphQL<{
    appUsageRecordCreate: {
      appUsageRecord: { id: string } | null;
      userErrors: Array<{ field: string[] | null; message: string }>;
    };
  }>(
    shop,
    accessToken,
    `mutation Usage($subscriptionLineItemId: ID!, $price: MoneyInput!, $description: String!) {
      appUsageRecordCreate(subscriptionLineItemId: $subscriptionLineItemId, price: $price, description: $description) {
        appUsageRecord { id }
        userErrors { field message }
      }
    }`,
    {
      subscriptionLineItemId: usageLineItemGid,
      price: { amount: overagePriceUsd(), currencyCode: "USD" },
      description,
    },
  );
  const result = data.appUsageRecordCreate;
  if (result.userErrors?.length) {
    throw new Error(`appUsageRecordCreate: ${result.userErrors.map((e) => e.message).join("; ").slice(0, 300)}`);
  }
  if (!result.appUsageRecord?.id) throw new Error("appUsageRecordCreate returned no record");
  return result.appUsageRecord.id;
}

// The app's currently-active subscription on this store, or null. Source of
// truth for plan state — we re-read it after the merchant returns from the
// confirmation screen (and any time we want to reconcile).
export async function getActiveSubscription(
  shop: string,
  accessToken: string,
): Promise<AppSubscriptionInfo | null> {
  const data = await shopifyGraphQL<{
    currentAppInstallation: {
      activeSubscriptions: Array<{ id: string; name: string; status: string; test: boolean }>;
    };
  }>(
    shop,
    accessToken,
    `{ currentAppInstallation { activeSubscriptions { id name status test } } }`,
  );
  const sub = data.currentAppInstallation.activeSubscriptions[0];
  return sub ? { gid: sub.id, name: sub.name, status: sub.status, test: sub.test } : null;
}

export async function cancelAppSubscription(
  shop: string,
  accessToken: string,
  subscriptionGid: string,
): Promise<void> {
  const data = await shopifyGraphQL<{
    appSubscriptionCancel: {
      appSubscription: { id: string; status: string } | null;
      userErrors: Array<{ field: string[] | null; message: string }>;
    };
  }>(
    shop,
    accessToken,
    `mutation Cancel($id: ID!) {
      appSubscriptionCancel(id: $id) {
        appSubscription { id status }
        userErrors { field message }
      }
    }`,
    { id: subscriptionGid },
  );
  const errs = data.appSubscriptionCancel.userErrors;
  if (errs?.length) {
    throw new Error(`appSubscriptionCancel: ${errs.map((e) => e.message).join("; ").slice(0, 300)}`);
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
