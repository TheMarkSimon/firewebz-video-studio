"use client";

// Vercel Web Analytics — OUR site traffic only. Never on merchant
// storefront embeds or inside the Shopify admin: shoppers on merchant
// pages are not ours to measure (and every byte there costs merchants
// pagespeed).

import { Analytics } from "@vercel/analytics/react";
import { usePathname } from "next/navigation";

const EXCLUDED = ["/embed", "/shopify"];

export function SiteAnalytics() {
  const pathname = usePathname();
  if (EXCLUDED.some((p) => pathname?.startsWith(p))) return null;
  return <Analytics />;
}
