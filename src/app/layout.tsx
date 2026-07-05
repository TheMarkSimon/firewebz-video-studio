import type { Metadata } from "next";
import "./globals.css";

// Site-wide metadata defaults. Individual pages override title/description
// via their own `export const metadata` blocks.
export const metadata: Metadata = {
  title: {
    default: "Spinr — 360° product spins from one photo",
    template: "%s · Spinr",
  },
  description:
    "Turn a single product photo into an interactive 360° spin your Shopify shoppers can drag. AI-generated, studio-quality, ready in three minutes.",
  applicationName: "Spinr",
  keywords: [
    "shopify 360 product view",
    "ai product spin",
    "interactive product photography",
    "shopify 3d viewer alternative",
  ],
  authors: [{ name: "Spinr" }],
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
