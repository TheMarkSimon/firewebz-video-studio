import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Firewebz Video Studio",
  description: "Turn your products into ready-to-post Reels and TikToks.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
