"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { submitOnboarding3d } from "@/lib/actions/onboarding3d";
import { Loader2 } from "lucide-react";
import { PhotoSlot, type SlotKind, type PhotoSlotStatus } from "@/components/photo-slot";

type PhotoEntry = {
  raw: string | null;
  processed: string | null;
  status: PhotoSlotStatus;
  errorMessage: string | null;
};

const SLOTS: Array<{ kind: SlotKind; label: string; required: boolean }> = [
  { kind: "front", label: "Front", required: true },
  { kind: "back",  label: "Back",  required: true },
  { kind: "left",  label: "Left side",  required: true },
  { kind: "right", label: "Right side", required: false },
];

const INITIAL_SLOT: PhotoEntry = { raw: null, processed: null, status: "empty", errorMessage: null };
const INITIAL_PHOTOS: Record<SlotKind, PhotoEntry> = {
  front: INITIAL_SLOT,
  back: INITIAL_SLOT,
  left: INITIAL_SLOT,
  right: INITIAL_SLOT,
};

export function OnboardingWizard() {
  const router = useRouter();
  const [photos, setPhotos] = useState<Record<SlotKind, PhotoEntry>>(INITIAL_PHOTOS);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function updatePhoto(
    kind: SlotKind,
    raw: string | null,
    processed: string | null,
    status: PhotoSlotStatus,
    errorMessage: string | null,
  ) {
    setPhotos((s) => ({ ...s, [kind]: { raw, processed, status, errorMessage } }));
  }
  function reset() {
    setPhotos(INITIAL_PHOTOS);
    setError(null);
  }

  const requiredPhotos: SlotKind[] = ["front", "back", "left"];
  // Fail-loudly gate: every required slot must be status="ready" (background
  // removal succeeded). A raw upload with no cleaning is NOT acceptable — that
  // was the silent-failure path polluting Hunyuan3D input with raw backgrounds.
  const anyProcessing = SLOTS.some((s) => {
    const st = photos[s.kind].status;
    return st === "processing" || st === "queued";
  });
  const anyRequiredFailed = requiredPhotos.some((k) => photos[k].status === "failed");
  const allRequiredReady = requiredPhotos.every((k) => photos[k].status === "ready");
  // Optional slot: if the user uploaded one but it failed, block until they fix or remove it.
  const optionalFailed = photos.right.status === "failed";
  const canGenerate = allRequiredReady && !anyProcessing && !optionalFailed;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        // No business identity fields — just cleaned photos.
        fd.append("businessName", "Product");
        fd.append("category", "");
        for (const slot of SLOTS) {
          const p = photos[slot.kind];
          if (p.status === "ready" && p.processed) {
            fd.append(`photo_${slot.kind}`, p.processed);
          }
        }
        const sessionId = await submitOnboarding3d(fd);
        router.push(`/generate?session=${sessionId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  const blockReason: string | null =
    anyProcessing ? "Waiting for background removal to finish…" :
    anyRequiredFailed ? "One or more required photos need to be re-uploaded (see red slot below)." :
    optionalFailed ? "The optional Right photo failed background removal. Retry it or remove it to continue." :
    !allRequiredReady ? "Upload Front, Back, and Left photos to continue." :
    null;

  return (
    <AppShell variant="onboarding" onReset={reset}>
      <div className="mx-auto w-full max-w-[900px] pt-4 lg:pt-8">
        <h1 className="text-[22px] font-bold text-fw-text">Upload photos of your product</h1>
        <p className="mt-1 text-[14px] text-fw-darkGray">
          3 required (Front, Back, Left), 1 optional (Right). Backgrounds are removed automatically — if that fails, we'll ask you to try a different photo (we don't ship raw backgrounds into the 3D model).
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {SLOTS.map((s) => {
            const p = photos[s.kind];
            return (
              <PhotoSlot
                key={s.kind}
                label={s.label}
                kind={s.kind}
                required={s.required}
                value={p.processed}
                rawValue={p.raw}
                status={p.status}
                errorMessage={p.errorMessage}
                onChange={(raw, processed, status, errorMessage) =>
                  updatePhoto(s.kind, raw, processed, status, errorMessage)
                }
              />
            );
          })}
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-[13px] text-destructive">{error}</div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button disabled={!canGenerate || isPending} onClick={submit} className="h-11 px-8">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Generate 3D view
          </Button>
          {blockReason && (
            <span className="text-[12px] text-fw-darkGray">{blockReason}</span>
          )}
          {canGenerate && (
            <span className="text-[12px] text-fw-lightGray">Usually 60–120 seconds after upload.</span>
          )}
        </div>
      </div>
    </AppShell>
  );
}
