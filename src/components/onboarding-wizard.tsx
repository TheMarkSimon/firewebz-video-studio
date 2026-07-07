"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { submitOnboarding } from "@/lib/actions/onboarding3d";
import { Loader2 } from "lucide-react";
import { PhotoSlot, type SlotKind, type PhotoSlotStatus } from "@/components/photo-slot";

type PhotoEntry = {
  raw: string | null;
  processed: string | null;
  status: PhotoSlotStatus;
  errorMessage: string | null;
};

// Front is the anchor frame every provider needs. The other angles are
// optional: multi-image providers (Seedance reference-to-video) use them to
// ground the unseen sides of the product; single-image providers ignore them.
const SLOTS: Array<{ kind: SlotKind; label: string; required: boolean }> = [
  { kind: "front", label: "Front", required: true },
  { kind: "back",  label: "Back",  required: false },
  { kind: "left",  label: "Left",  required: false },
  { kind: "right", label: "Right", required: false },
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

  function updatePhoto(kind: SlotKind, raw: string | null, processed: string | null, status: PhotoSlotStatus, errorMessage: string | null) {
    setPhotos((s) => ({ ...s, [kind]: { raw, processed, status, errorMessage } }));
  }

  const anyProcessing = SLOTS.some((s) => {
    const st = photos[s.kind].status;
    return st === "processing" || st === "queued";
  });
  // Optional slots block only if the user uploaded one and it failed —
  // they should retry or remove it, not silently ship a broken angle.
  const anyFailed = SLOTS.some((s) => photos[s.kind].status === "failed");
  const frontReady = photos.front.status === "ready" && photos.front.processed != null;
  const canGenerate = frontReady && !anyProcessing && !anyFailed;

  const extraCount = (["back", "left", "right"] as const).filter((k) => photos[k].status === "ready").length;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        for (const slot of SLOTS) {
          const p = photos[slot.kind];
          if (p.status === "ready" && p.processed) {
            fd.append(`photo_${slot.kind}`, p.processed);
          }
        }
        const sessionId = await submitOnboarding(fd);
        router.push(`/generate?session=${sessionId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  const blockReason: string | null =
    anyProcessing ? "Removing backgrounds…" :
    anyFailed ? "A photo failed background removal — retry or remove it (red slot below)." :
    !frontReady ? "Upload at least the Front photo to continue." :
    null;

  return (
    <AppShell variant="onboarding" onReset={() => { setPhotos(INITIAL_PHOTOS); setError(null); }}>
      <div className="mx-auto w-full max-w-[900px] pb-32 pt-8 lg:pt-14">
        <h1 className="font-display text-[30px] font-bold text-fw-text md:text-[36px]">
          Upload your product photos.
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-[24px] text-fw-darkGray">
          Front is enough to start. More angles = a spin that's true to your product.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
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

        <p className="mt-5 text-[13px] leading-[20px] text-fw-lightGray">
          Best results: fill the frame, keep the same distance for every angle, even lighting.
          Any background works — we remove it.
        </p>

        {error && (
          <div className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-[13px] text-destructive">{error}</div>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Button disabled={!canGenerate || isPending} onClick={submit} className="h-11 px-8">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Generate my spin
          </Button>
          {blockReason && <span className="text-[12px] text-fw-darkGray">{blockReason}</span>}
          {canGenerate && !isPending && (
            <span className="text-[12px] text-fw-lightGray">
              {extraCount > 0
                ? `Using ${1 + extraCount} angles. Usually finishes in 2-3 minutes.`
                : "Tip: adding more angles makes the spin more accurate."}
            </span>
          )}
        </div>
      </div>
    </AppShell>
  );
}

