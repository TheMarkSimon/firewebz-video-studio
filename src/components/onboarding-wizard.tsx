"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { submitOnboarding } from "@/lib/actions/onboarding3d";
import { Loader2 } from "lucide-react";
import { PhotoSlot, type PhotoSlotStatus } from "@/components/photo-slot";

type PhotoEntry = {
  raw: string | null;
  processed: string | null;
  status: PhotoSlotStatus;
  errorMessage: string | null;
};

const INITIAL_PHOTO: PhotoEntry = { raw: null, processed: null, status: "empty", errorMessage: null };

export function OnboardingWizard() {
  const router = useRouter();
  const [photo, setPhoto] = useState<PhotoEntry>(INITIAL_PHOTO);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canGenerate = photo.status === "ready" && photo.processed != null;
  const isProcessing = photo.status === "processing" || photo.status === "queued";

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("photo_front", photo.processed!);
        const sessionId = await submitOnboarding(fd);
        router.push(`/generate?session=${sessionId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  const blockReason: string | null =
    isProcessing ? "Removing background…" :
    photo.status === "failed" ? "Background removal failed. Try a different photo." :
    photo.status === "empty" ? "Upload a front-facing product photo to continue." :
    null;

  return (
    <AppShell variant="onboarding" onReset={() => { setPhoto(INITIAL_PHOTO); setError(null); }}>
      <div className="mx-auto w-full max-w-[720px] pt-4 lg:pt-8">
        <h1 className="font-display text-[28px] font-bold text-fw-text md:text-[32px]">
          One photo. A 360° spin. Three minutes.
        </h1>
        <p className="mt-2 text-[15px] leading-[24px] text-fw-darkGray">
          Upload your product photo below. We'll remove the background, generate a full
          360° rotation, and hand you back a one-line snippet you can paste on any Shopify
          product page.
        </p>

        <div className="mt-8 grid gap-6 md:grid-cols-[320px_minmax(0,1fr)]">
          <PhotoSlot
            label="Product photo"
            kind="front"
            required
            value={photo.processed}
            rawValue={photo.raw}
            status={photo.status}
            errorMessage={photo.errorMessage}
            onChange={(raw, processed, status, errorMessage) =>
              setPhoto({ raw, processed, status, errorMessage })
            }
          />

          <div className="rounded-2xl border border-fw-border bg-white p-5">
            <p className="text-[13px] font-semibold uppercase tracking-wider text-fw-darkGray">
              For the best spin
            </p>
            <ul className="mt-3 space-y-2.5 text-[13px] leading-[20px] text-fw-text">
              <Tip>
                <strong>3/4 view works best.</strong> Angle the product ~30° off dead-front so
                one side is fully visible.
              </Tip>
              <Tip>
                <strong>Fill the frame.</strong> Product should take up 70–85% of the image.
              </Tip>
              <Tip>
                <strong>Even, front-side lighting.</strong> No dramatic shadows or backlight.
              </Tip>
              <Tip>
                <strong>Any background is fine.</strong> We remove it automatically.
              </Tip>
              <Tip>
                <strong>Big is better.</strong> Ideally 1024px or larger on the long edge.
              </Tip>
            </ul>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl bg-destructive/10 px-4 py-3 text-[13px] text-destructive">{error}</div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button disabled={!canGenerate || isPending} onClick={submit} className="h-11 px-8">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Generate my spin
          </Button>
          {blockReason && <span className="text-[12px] text-fw-darkGray">{blockReason}</span>}
          {canGenerate && !isPending && (
            <span className="text-[12px] text-fw-lightGray">Usually finishes in 2-3 minutes.</span>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-fw-purple" />
      <span>{children}</span>
    </li>
  );
}
