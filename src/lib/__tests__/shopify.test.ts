// Unit tests for the pure/security-critical Shopify helpers. No network,
// no DB — anything requiring either belongs in the smoke script.
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildAuthorizeUrl,
  freeSpins,
  normalizeShopDomain,
  overagePriceUsd,
  proIncludedSpins,
  proPriceUsd,
  quotaEnforced,
  verifyOAuthHmac,
} from "@/lib/shopify";

const ENV_KEYS = [
  "SHOPIFY_API_KEY",
  "SHOPIFY_API_SECRET",
  "SPINR_PRO_PRICE_USD",
  "SPINR_PRO_INCLUDED_SPINS",
  "SPINR_OVERAGE_USD",
  "SPINR_FREE_SPINS",
  "SPINR_QUOTA_ENFORCE",
];
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("normalizeShopDomain", () => {
  it("appends myshopify.com to a bare handle", () => {
    expect(normalizeShopDomain("kokok")).toBe("kokok.myshopify.com");
  });
  it("accepts a full domain, case-insensitively", () => {
    expect(normalizeShopDomain("KOKOK-ndm2wtj1.MYSHOPIFY.com")).toBe("kokok-ndm2wtj1.myshopify.com");
  });
  it("strips protocol and path from pasted URLs", () => {
    expect(normalizeShopDomain("https://kokok.myshopify.com/admin/settings")).toBe("kokok.myshopify.com");
  });
  it("rejects non-myshopify domains", () => {
    expect(normalizeShopDomain("evil.com")).toBeNull();
    expect(normalizeShopDomain("kokok.myshopify.com.evil.com")).toBeNull();
    expect(normalizeShopDomain("")).toBeNull();
  });
});

describe("verifyOAuthHmac", () => {
  function signedParams(secret: string): URLSearchParams {
    const params = new URLSearchParams({
      code: "abc123",
      shop: "kokok.myshopify.com",
      state: "deadbeef",
      timestamp: "1760000000",
    });
    const message = [...params.keys()]
      .sort()
      .map((k) => `${k}=${params.get(k)}`)
      .join("&");
    params.set("hmac", createHmac("sha256", secret).update(message).digest("hex"));
    return params;
  }

  it("accepts a correctly signed query", () => {
    process.env.SHOPIFY_API_SECRET = "test-secret";
    expect(verifyOAuthHmac(signedParams("test-secret"))).toBe(true);
  });
  it("rejects a query signed with the wrong secret", () => {
    process.env.SHOPIFY_API_SECRET = "test-secret";
    expect(verifyOAuthHmac(signedParams("other-secret"))).toBe(false);
  });
  it("rejects a tampered query", () => {
    process.env.SHOPIFY_API_SECRET = "test-secret";
    const params = signedParams("test-secret");
    params.set("shop", "attacker.myshopify.com");
    expect(verifyOAuthHmac(params)).toBe(false);
  });
  it("rejects when hmac or secret is missing", () => {
    process.env.SHOPIFY_API_SECRET = "test-secret";
    expect(verifyOAuthHmac(new URLSearchParams({ shop: "a.myshopify.com" }))).toBe(false);
    delete process.env.SHOPIFY_API_SECRET;
    expect(verifyOAuthHmac(signedParams("test-secret"))).toBe(false);
  });
});

describe("plan config", () => {
  it("has the launch-model defaults", () => {
    expect(proPriceUsd()).toBe("29");
    expect(proIncludedSpins()).toBe(10);
    expect(overagePriceUsd()).toBe("2.50");
    expect(freeSpins()).toBe(3);
    expect(quotaEnforced()).toBe(false); // dormant unless explicitly enabled
  });
  it("is env-tunable without a deploy", () => {
    process.env.SPINR_PRO_PRICE_USD = "39";
    process.env.SPINR_PRO_INCLUDED_SPINS = "20";
    process.env.SPINR_QUOTA_ENFORCE = "1";
    expect(proPriceUsd()).toBe("39");
    expect(proIncludedSpins()).toBe(20);
    expect(quotaEnforced()).toBe(true);
  });
});

describe("buildAuthorizeUrl", () => {
  it("targets the shop and carries client id, scopes, state and redirect", () => {
    process.env.SHOPIFY_API_KEY = "client123";
    const url = new URL(
      buildAuthorizeUrl("kokok.myshopify.com", "https://thespinr.com/api/shopify/callback", "state42"),
    );
    expect(url.origin).toBe("https://kokok.myshopify.com");
    expect(url.pathname).toBe("/admin/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("client123");
    expect(url.searchParams.get("scope")).toContain("read_products");
    expect(url.searchParams.get("state")).toBe("state42");
    expect(url.searchParams.get("redirect_uri")).toBe("https://thespinr.com/api/shopify/callback");
  });
});
