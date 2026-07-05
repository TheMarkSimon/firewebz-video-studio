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
      <div className="mx-auto w-full max-w-[560px] pt-4 lg:pt-8">
        <h1 className="text-[22px] font-bold text-fw-text">Upload a photo of your product</h1>
        <p className="mt-1 text-[14px] text-fw-darkGray">
          One clean front-facing photo. Background is removed automatically. We'll turn it into
          a 360° spin you can embed on your storefront.
        </p>

        <div className="mt-6 max-w-[320px]">
          <PhotoSlot
            label="Front"
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
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-[13px] text-destructive">{error}</div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button disabled={!canGenerate || isPending} onClick={submit} className="h-11 px-8">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Generate spin
          </Button>
          {blockReason && <span className="text-[12px] text-fw-darkGray">{blockReason}</span>}
          {canGenerate && !isPending && (
            <span className="text-[12px] text-fw-lightGray">Usually 2-3 minutes.</span>
          )}
        </div>
      </div>
    </AppShell>
  );
}
