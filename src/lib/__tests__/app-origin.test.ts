import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAppOrigin, isPublicOrigin } from "@/lib/app-origin";

const KEYS = ["NEXTAUTH_URL", "VERCEL_PROJECT_PRODUCTION_URL"];
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("getAppOrigin", () => {
  it("prefers NEXTAUTH_URL and strips trailing slash", () => {
    process.env.NEXTAUTH_URL = "https://thespinr.com/";
    expect(getAppOrigin()).toBe("https://thespinr.com");
  });
  it("falls back to the Vercel production domain", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "thespinr.com";
    expect(getAppOrigin()).toBe("https://thespinr.com");
  });
  it("returns null when nothing is configured", () => {
    expect(getAppOrigin()).toBeNull();
  });
});

describe("isPublicOrigin", () => {
  it("accepts public https origins", () => {
    expect(isPublicOrigin("https://thespinr.com")).toBe(true);
  });
  it("rejects localhost and http — fal webhooks can't reach those", () => {
    expect(isPublicOrigin("http://localhost:3000")).toBe(false);
    expect(isPublicOrigin("https://localhost:3000")).toBe(false);
    expect(isPublicOrigin("http://thespinr.com")).toBe(false);
    expect(isPublicOrigin(null)).toBe(false);
  });
});
