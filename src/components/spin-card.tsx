"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteSpin } from "@/lib/actions/spins";
import { Loader2, Trash2 } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  ready: "bg-emerald-500/10 text-emerald-700",
  draft: "bg-fw-disabled text-fw-darkGray",
  generating: "bg-fw-purpleSoft text-fw-text",
  failed: "bg-destructive/10 text-destructive",
};

export function SpinCard({
  id, title, status, photoUrl, createdAt,
}: {
  id: string;
  title: string;
  status: string;
  photoUrl: string | null;
  createdAt: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const proxied = photoUrl ? `/api/proxy?url=${encodeURIComponent(photoUrl)}` : null;

  function onDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 2500);
      return;
    }
    startTransition(() => deleteSpin(id));
  }

  return (
    <Link
      href={`/generate?spin=${id}`}
      className="group overflow-hidden rounded-2xl border border-fw-border bg-white transition-shadow hover:shadow-lg"
    >
      <div className="flex aspect-[4/3] items-center justify-center bg-fw-disabled/50">
        {proxied ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={proxied} alt={title} className="h-full w-full object-contain p-4" />
        ) : (
          <span className="text-[12px] text-fw-lightGray">No photo</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-fw-text">{title}</p>
          <p className="text-[11px] text-fw-lightGray">{new Date(createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[status] ?? STATUS_STYLES.draft}`}>
            {status}
          </span>
          <button
            onClick={onDelete}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${confirming ? "bg-destructive text-white" : "text-fw-lightGray hover:bg-fw-disabled hover:text-destructive"}`}
            aria-label={confirming ? "Click again to confirm delete" : "Delete spin"}
            title={confirming ? "Click again to confirm" : "Delete"}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </Link>
  );
}
