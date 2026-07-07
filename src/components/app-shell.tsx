"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

// Layout shell, three variants:
//   marketing  — sticky anchor nav + footer (the one-page site)
//   default    — minimal app header, logo only (product pages)
//   onboarding — minimal header + inline "Start over" (replaces the old kebab menu)
const NAV_LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#why", label: "Why Spinr" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
] as const;

export function AppShell({
  children,
  variant = "default",
  onReset,
}: {
  children: React.ReactNode;
  variant?: "default" | "onboarding" | "marketing";
  onReset?: () => void;
}) {
  const isMarketing = variant === "marketing";

  return (
    <div className="min-h-screen bg-white">
      <header
        className={
          isMarketing
            ? "sticky top-0 z-40 border-b border-fw-border/70 bg-white/90 backdrop-blur"
            : ""
        }
      >
        {/* Full-width header, logo hugging the left edge — Canva pattern. */}
        <div className="flex w-full items-center justify-between px-4 py-2 lg:px-6">
          <Link href="/" aria-label="Spinr home">
            <BrandLogo size={100} />
          </Link>

          {isMarketing && (
            <>
              <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="text-[14px] font-semibold text-fw-text hover:opacity-60"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
              <Button asChild className="h-10 px-5 text-[14px]">
                <Link href="/onboarding">Create a spin</Link>
              </Button>
            </>
          )}

          {variant === "onboarding" && onReset && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-fw-darkGray hover:text-fw-text"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Start over
            </button>
          )}
        </div>
      </header>

      <main className="px-6 lg:px-8">{children}</main>

      {isMarketing && <MarketingFooter />}
    </div>
  );
}

function MarketingFooter() {
  return (
    <footer id="contact" className="mt-8 border-t border-fw-border">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-6 py-7 md:flex-row md:items-center lg:px-8">
        <div>
          <BrandLogo size={26} />
          <p className="mt-2 max-w-xs text-[13px] leading-[20px] text-fw-darkGray">
            Interactive 360° product spins for your storefront — from a single photo.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-[13px] text-fw-darkGray">
          <a href="mailto:contact@thespinr.com" className="font-semibold text-fw-text hover:opacity-60">
            contact@thespinr.com
          </a>
          <span>© {new Date().getFullYear()} Spinr. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
