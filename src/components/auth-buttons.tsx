"use client";

import { signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, LogOut } from "lucide-react";

export function SignInButton({
  label = "Sign in",
  callbackUrl = "/studio",
  variant = "outline",
}: {
  label?: string;
  callbackUrl?: string;
  variant?: "outline" | "default";
}) {
  return (
    <Button
      variant={variant}
      className="h-10 px-5 text-[14px]"
      onClick={() => signIn("google", { callbackUrl })}
    >
      {label}
    </Button>
  );
}

export function UserMenu({ name, image }: { name: string | null; image: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-fw-border bg-fw-disabled"
        aria-label="Account menu"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={name ?? "Account"} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="text-[14px] font-bold text-fw-text">{(name ?? "?").slice(0, 1)}</span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-52 rounded-2xl border border-fw-border bg-white p-2 shadow-xl">
            {name && <p className="px-3 py-2 text-[13px] font-semibold text-fw-text">{name}</p>}
            <Link
              href="/studio"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[14px] text-fw-text hover:bg-fw-disabled"
            >
              <LayoutGrid className="h-4 w-4" /> My Studio
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[14px] text-fw-text hover:bg-fw-disabled"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
