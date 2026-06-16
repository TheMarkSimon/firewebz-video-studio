"use client";

import Link from "next/link";
import { useState } from "react";
import { FirewebzLogo } from "@/components/firewebz-logo";
import { MoreHorizontal, X, LayoutDashboard, Sparkles, Calendar, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const MENU_ITEMS = [
  { href: "/onboarding", label: "Start a new post", icon: Plus },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/concepts", label: "My concepts", icon: Sparkles },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({
  children,
  variant = "default",
  onReset,
}: {
  children: React.ReactNode;
  variant?: "default" | "onboarding";
  onReset?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <header className="flex h-16 items-center justify-between px-6 lg:px-8">
        <Link href="/">
          <FirewebzLogo />
        </Link>
        <button
          onClick={() => setMenuOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-fw-darkGray hover:bg-fw-disabled"
          aria-label="Open menu"
        >
          <MoreHorizontal className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </header>

      <main className="px-6 lg:px-8">{children}</main>

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/20" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute right-6 top-20 w-72 rounded-2xl border border-fw-border bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-fw-darkGray">Menu</span>
              <button onClick={() => setMenuOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-fw-disabled">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {variant === "onboarding" && onReset && (
                <button
                  onClick={() => { onReset(); setMenuOpen(false); }}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] text-fw-text hover:bg-fw-purpleSoft"
                >
                  <Plus className="h-4 w-4 text-fw-purple" />
                  Start over
                </button>
              )}
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] text-fw-text hover:bg-fw-purpleSoft"
                  >
                    <Icon className="h-4 w-4 text-fw-purple" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
