import type { Metadata } from "next";
import Script from "next/script";
import "@shopify/polaris/build/esm/styles.css";

// Layout for everything under /shopify — the embedded admin app. Loads the
// latest App Bridge (review requirement: the CDN script, before other
// scripts) and declares the api key via the meta tag App Bridge reads.
// The client id is public (it's in every OAuth URL).
const CLIENT_ID = process.env.SHOPIFY_API_KEY ?? "d6a3575d86d37718e0456917cb60666e";

export const metadata: Metadata = {
  title: "Spinr",
  robots: { index: false, follow: false },
  other: { "shopify-api-key": CLIENT_ID },
};

export default function ShopifyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" strategy="beforeInteractive" />
      {children}
    </>
  );
}
