"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { SignInButton, UserMenu } from "@/components/auth-buttons";
import { RotateCcw } from "lucide-react";

export type ShellUser = { id: string; name: string | null; image: string | null } | null;

// Layout shell, three variants:
//   marketing  — sticky anchor nav + footer (the one-page site)
//   default    — minimal app header (product pages)
//   onboarding — minimal header + inline "Start over"
// Pass `user` from server pages (getSessionUser) to show the account menu.
const NAV_LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#why", label: "Why Spinr" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
  { href: "/help", label: "Help" },
] as const;

export function AppShell({
  children,
  variant = "default",
  onReset,
  user = null,
}: {
  children: React.ReactNode;
  variant?: "default" | "onboarding" | "marketing";
  onReset?: () => void;
  user?: ShellUser;
}) {
  const isMarketing = variant === "marketing";

  // Statically-rendered pages (the marketing homepage) can't pass `user`
  // from the server without giving up static rendering — so when no user
  // prop arrives, hydrate the session client-side. Without this, the
  // homepage header shows "Sign in" to signed-in users, which reads as
  // "the app forgot me".
  const [sessionUser, setSessionUser] = useState<ShellUser>(user);
  useEffect(() => {
    if (user) {
      setSessionUser(user);
      return;
    }
    let cancelled = false;
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (!cancelled && s?.user) {
          setSessionUser({ id: "session", name: s.user.name ?? null, image: s.user.image ?? null });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-white">
      <header
        className={
          isMarketing
            ? // Ramp-style glassy sticky bar: translucent white + heavy blur,
              // hairline bottom border.
              "sticky top-0 z-40 border-b border-fw-border/50 bg-white/60 backdrop-blur-xl"
            : ""
        }
      >
        {/* Full-width header: logo + nav clustered LEFT (Ramp pattern),
            account/CTA on the right. */}
        <div className="flex w-full items-center justify-between px-4 py-2 lg:px-6">
          <div className="flex items-center gap-8">
            <Link href="/" aria-label="Spinr home">
              <BrandLogo size={50} />
            </Link>
            {isMarketing && (
              <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
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
            )}
          </div>

          <div className="flex items-center gap-3">
            {variant === "onboarding" && onReset && (
              <button
                onClick={onReset}
                className="flex items-center gap-1.5 text-[13px] font-semibold text-fw-darkGray hover:text-fw-text"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Start over
              </button>
            )}
            {isMarketing && sessionUser && (
              <Button asChild variant="outline" className="h-10 px-5 text-[14px]">
                <Link href="/studio">My Studio</Link>
              </Button>
            )}
            {isMarketing && (
              <Button asChild className="h-10 px-5 text-[14px]">
                <Link href="/onboarding">Create a free spin</Link>
              </Button>
            )}
            {sessionUser ? <UserMenu name={sessionUser.name} image={sessionUser.image} /> : <SignInButton />}
          </div>
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
            Interactive 360° product spins for your storefront — from the photos you already have.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-[13px] text-fw-darkGray">
          <a href="mailto:contact@thespinr.com" className="font-semibold text-fw-text hover:opacity-60">
            contact@thespinr.com
          </a>
          <div className="flex gap-4">
            <Link href="/help" className="hover:text-fw-text">Help</Link>
            <Link href="/privacy" className="hover:text-fw-text">Privacy</Link>
            <Link href="/terms" className="hover:text-fw-text">Terms</Link>
          </div>
          <span>© {new Date().getFullYear()} Spinr. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
