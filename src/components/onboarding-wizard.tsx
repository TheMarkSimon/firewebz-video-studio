"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/app-shell";
import { submitOnboarding3d } from "@/lib/actions/onboarding3d";
import { Loader2 } from "lucide-react";
import { PhotoSlot, type SlotKind } from "@/components/photo-slot";

type PhotoEntry = { raw: string | null; processed: string | null };

const SLOTS: Array<{ kind: SlotKind; label: string; required: boolean }> = [
  { kind: "front", label: "Front", required: true },
  { kind: "back",  label: "Back",  required: true },
  { kind: "left",  label: "Left side",  required: true },
  { kind: "right", label: "Right side", required: false },
];

const INITIAL_PHOTOS: Record<SlotKind, PhotoEntry> = {
  front: { raw: null, processed: null },
  back: { raw: null, processed: null },
  left: { raw: null, processed: null },
  right: { raw: null, processed: null },
};

export function OnboardingWizard() {
  const router = useRouter();
  const [photos, setPhotos] = useState<Record<SlotKind, PhotoEntry>>(INITIAL_PHOTOS);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function updatePhoto(kind: SlotKind, raw: string | null, processed: string | null) {
    setPhotos((s) => ({ ...s, [kind]: { raw, processed } }));
  }
  function reset() {
    setPhotos(INITIAL_PHOTOS);
    setError(null);
  }

  const requiredPhotos: SlotKind[] = ["front", "back", "left"];
  const valid = requiredPhotos.every((k) => Boolean(photos[k].processed || photos[k].raw));

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        // No business identity fields — just photos. Hunyuan3D doesn't need them.
        fd.append("businessName", "Product");
        fd.append("category", "");
        for (const slot of SLOTS) {
          const p = photos[slot.kind];
          const chosen = p.processed || p.raw;
          if (chosen) fd.append(`photo_${slot.kind}`, chosen);
        }
        const sessionId = await submitOnboarding3d(fd);
        router.push(`/generate?session=${sessionId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <AppShell variant="onboarding" onReset={reset}>
      <div className="mx-auto w-full max-w-[900px] pt-4 lg:pt-8">
        <h1 className="text-[22px] font-bold text-fw-text">Upload photos of your product</h1>
        <p className="mt-1 text-[14px] text-fw-darkGray">
          3 required (Front, Back, Left), 1 optional (Right). Backgrounds are removed automatically. Take them in normal light — no studio needed.
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
                onChange={(raw, processed) => updatePhoto(s.kind, raw, processed)}
                processing={false}
              />
            );
          })}
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-[13px] text-destructive">{error}</div>
        )}

        <div className="mt-8 flex items-center gap-4">
          <Button disabled={!valid || isPending} onClick={submit} className="h-11 px-8">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Generate 3D view
          </Button>
          <span className="text-[12px] text-fw-lightGray">Usually 30–90 seconds after upload.</span>
        </div>
      </div>
    </AppShell>
  );
}
