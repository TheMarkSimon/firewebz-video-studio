"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SpinrIcon } from "@/components/spinr-icon";
import { importShopifyProduct } from "@/lib/actions/shopify";
import { Loader2, CheckCircle } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  draft: "Spin draft",
  generating: "Generating…",
  ready: "Spin ready",
  failed: "Spin failed",
};

export function ProductImportCard({
  gid,
  title,
  imageUrl,
  photoCount,
  spin,
}: {
  gid: string;
  title: string;
  imageUrl: string | null;
  photoCount: number;
  spin: { id: string; status: string; pushed: boolean } | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const proxied = imageUrl ? `/api/proxy?url=${encodeURIComponent(imageUrl)}` : null;

  function onImport() {
    setError(null);
    startTransition(async () => {
      try {
        const spinId = await importShopifyProduct(gid);
        router.push(`/generate?spin=${spinId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Import failed — try again.");
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-fw-border bg-white">
      <div className="flex aspect-[4/3] items-center justify-center bg-fw-disabled/50">
        {proxied ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={proxied} alt={title} className="h-full w-full object-contain p-4" />
        ) : (
          <span className="text-[12px] text-fw-lightGray">No photo</span>
        )}
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-fw-text">{title}</p>
            <p className="text-[11px] text-fw-lightGray">
              {photoCount} photo{photoCount === 1 ? "" : "s"}
              {spin?.pushed && (
                <span className="ml-2 inline-flex items-center gap-1 text-emerald-600">
                  <CheckCircle className="h-3 w-3" /> on your store
                </span>
              )}
            </p>
          </div>
          {spin ? (
            <Button asChild variant="outline" className="h-9 shrink-0 px-3.5 text-[12px]">
              <Link href={`/generate?spin=${spin.id}`}>{STATUS_LABEL[spin.status] ?? "View spin"}</Link>
            </Button>
          ) : (
            <Button onClick={onImport} disabled={isPending || photoCount === 0} className="h-9 shrink-0 px-3.5 text-[12px]">
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SpinrIcon className="h-3.5 w-3.5" />}
              {isPending ? "Preparing photos…" : "Review photos"}
            </Button>
          )}
        </div>
        {error && <p className="mt-2 text-[11px] leading-snug text-destructive">{error}</p>}
      </div>
    </div>
  );
}
