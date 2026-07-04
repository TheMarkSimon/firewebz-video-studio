import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spinr",
  description: "Turn 3 product photos into an interactive 360° view.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
