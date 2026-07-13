import type { Metadata } from "next";
import "@shopify/polaris/build/esm/styles.css";

// Layout for everything under /shopify — the embedded admin app.
//
// App Bridge MUST see the shopify-api-key meta tag before its script runs,
// and next/script's beforeInteractive only works from the ROOT layout — so
// both tags are rendered inline here, in order, into the server HTML. The
// sync script is deliberate (App Bridge's own requirement); it only loads
// on /shopify/* routes. The client id is public (it's in every OAuth URL).
const CLIENT_ID = process.env.SHOPIFY_API_KEY ?? "d6a3575d86d37718e0456917cb60666e";

export const metadata: Metadata = {
  title: "Spinr",
  robots: { index: false, follow: false },
};

export default function ShopifyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <meta name="shopify-api-key" content={CLIENT_ID} />
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" />
      {children}
    </>
  );
}
