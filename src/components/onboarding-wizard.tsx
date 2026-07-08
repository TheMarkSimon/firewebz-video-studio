"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AppShell, type ShellUser } from "@/components/app-shell";
import { SignInButton } from "@/components/auth-buttons";
import { saveSpinPhotos } from "@/lib/actions/spins";
import { Loader2, Sparkles, X } from "lucide-react";
import { PhotoSlot, type SlotKind, type PhotoSlotStatus } from "@/components/photo-slot";

type PhotoEntry = {
  raw: string | null;
  processed: string | null;
  status: PhotoSlotStatus;
  errorMessage: string | null;
};

const SLOTS: Array<{ kind: SlotKind; label: string; required: boolean }> = [
  { kind: "front", label: "Front", required: true },
  { kind: "back",  label: "Back",  required: false },
  { kind: "left",  label: "Left",  required: false },
  { kind: "right", label: "Right", required: false },
];

const EMPTY_SLOT: PhotoEntry = { raw: null, processed: null, status: "empty", errorMessage: null };

// Anonymous draft stash: processed photos are fal.media URL strings, so the
// whole wizard state survives the Google OAuth redirect via sessionStorage —
// no popup-OAuth tricks needed.
const DRAFT_KEY = "spinr:draft";

type InitialPhotos = { front?: string | null; back?: string | null; left?: string | null; right?: string | null };

function buildInitial(initial?: InitialPhotos): Record<SlotKind, PhotoEntry> {
  const fromUrl = (u?: string | null): PhotoEntry =>
    u ? { raw: null, processed: u, status: "ready", errorMessage: null } : EMPTY_SLOT;
  return {
    front: fromUrl(initial?.front),
    back: fromUrl(initial?.back),
    left: fromUrl(initial?.left),
    right: fromUrl(initial?.right),
  };
}

export function OnboardingWizard({
  user,
  spinId,
  initialTitle,
  initialPhotos,
}: {
  user: ShellUser;
  spinId?: string;
  initialTitle?: string;
  initialPhotos?: InitialPhotos;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState<Record<SlotKind, PhotoEntry>>(() => buildInitial(initialPhotos));
  const [title, setTitle] = useState(initialTitle ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [authModal, setAuthModal] = useState(false);
  // True while the post-OAuth auto-continue is saving the restored draft —
  // renders a "you're signed in, building your spin" overlay so the return
  // from Google never reads as a silent no-op.
  const [resuming, setResuming] = useState(false);
  const resumedRef = useRef(false);
  const isEdit = Boolean(spinId);

  // Restore a stashed draft after the OAuth round-trip (or an accidental
  // reload). If the user is now signed in, continue their flow automatically —
  // the "instant payoff" after sign-in.
  useEffect(() => {
    if (isEdit || resumedRef.current) return;
    resumedRef.current = true;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as { title?: string; photos?: InitialPhotos };
      sessionStorage.removeItem(DRAFT_KEY);
      if (draft.photos?.front) {
        setPhotos(buildInitial(draft.photos));
        if (draft.title) setTitle(draft.title);
        if (user) {
          // Auto-continue: the user clicked "Generate my spin", authed, and
          // came back — carry that intent all the way through. Save the spin
          // and land on /generate with the generation ALREADY starting
          // (autostart), never on a screen that asks them to click again.
          setResuming(true);
          submitDraft(draft.title ?? "", draft.photos, { autostart: true });
        }
      }
    } catch {
      // Corrupt stash — ignore, the user just starts fresh.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updatePhoto(kind: SlotKind, raw: string | null, processed: string | null, status: PhotoSlotStatus, errorMessage: string | null) {
    setPhotos((s) => ({ ...s, [kind]: { raw, processed, status, errorMessage } }));
  }

  const anyProcessing = SLOTS.some((s) => {
    const st = photos[s.kind].status;
    return st === "processing" || st === "queued";
  });
  const anyFailed = SLOTS.some((s) => photos[s.kind].status === "failed");
  const frontReady = photos.front.status === "ready" && photos.front.processed != null;
  const canGenerate = frontReady && !anyProcessing && !anyFailed;

  const extraCount = (["back", "left", "right"] as const).filter((k) => photos[k].status === "ready").length;

  function currentPhotoUrls(): InitialPhotos {
    const get = (k: SlotKind) => (photos[k].status === "ready" ? photos[k].processed : null);
    return { front: get("front"), back: get("back"), left: get("left"), right: get("right") };
  }

  function submitDraft(
    draftTitle: string,
    draftPhotos?: InitialPhotos,
    opts: { autostart?: boolean } = {},
  ) {
    const p = draftPhotos ?? currentPhotoUrls();
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        if (spinId) fd.append("spinId", spinId);
        fd.append("title", draftTitle);
        if (p.front) fd.append("photo_front", p.front);
        if (p.back) fd.append("photo_back", p.back);
        if (p.left) fd.append("photo_left", p.left);
        if (p.right) fd.append("photo_right", p.right);
        const id = await saveSpinPhotos(fd);
        router.push(`/generate?spin=${id}${opts.autostart ? "&autostart=1" : ""}`);
      } catch (e) {
        setResuming(false);
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function onGenerateClick() {
    if (!user) {
      // Sunk-cost gate: stash the draft (URL strings survive the redirect),
      // then ask for sign-in. On return, the effect above auto-continues.
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ title, photos: currentPhotoUrls() }));
      } catch { /* storage full/blocked — sign-in still works, they re-upload */ }
      setAuthModal(true);
      return;
    }
    // "Generate my spin" IS the intent — start generating on arrival. Edit
    // mode keeps the preview step ("Save & continue" ≠ "spend $ regenerating").
    submitDraft(title, undefined, { autostart: !isEdit });
  }

  const blockReason: string | null =
    anyProcessing ? "Removing backgrounds…" :
    anyFailed ? "A photo failed background removal — retry or remove it (red slot below)." :
    !frontReady ? "Upload at least the Front photo to continue." :
    null;

  return (
    <AppShell variant="onboarding" user={user} onReset={() => { setPhotos(buildInitial()); setError(null); }}>
      <div className="mx-auto w-full max-w-[900px] pb-32 pt-8 lg:pt-14">
        <h1 className="font-display text-[30px] font-bold text-fw-text md:text-[36px]">
          {isEdit ? "Update your product photos." : "Upload your product photos."}
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-[24px] text-fw-darkGray">
          {isEdit
            ? "Replace any photo below — we'll rebuild the spin from the new set."
            : "Front is enough to start. More angles = a spin that's true to your product."}
        </p>

        <div className="mt-8 max-w-sm">
          <label htmlFor="spin-title" className="text-[13px] font-semibold text-fw-text">
            Product name <span className="font-normal text-fw-lightGray">(shown in your Studio)</span>
          </label>
          <input
            id="spin-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Chuck Taylor High-Top, Cream"
            className="mt-1.5 h-11 w-full rounded-xl border border-fw-border bg-white px-4 text-[14px] text-fw-text outline-none placeholder:text-fw-lightGray focus:border-fw-black"
          />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
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
          <div className="mt-6 rounded-xl bg-destructive/10 px-4 py-3 text-[13px] text-destructive">{error}</div>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Button disabled={!canGenerate || isPending} onClick={onGenerateClick} className="h-11 px-8">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isEdit ? "Save & continue" : "Generate my spin"}
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

      {resuming && !error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/85 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <Loader2 className="h-7 w-7 animate-spin text-fw-text" />
            <p className="text-[17px] font-semibold text-fw-text">
              You&apos;re signed in — building your spin now.
            </p>
            <p className="text-[13px] text-fw-darkGray">
              Your photos were saved. Taking you to the progress page…
            </p>
          </div>
        </div>
      )}

      {authModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-fw-black/50 p-4"
          onClick={() => setAuthModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setAuthModal(false)}
              className="float-right -mr-3 -mt-3 flex h-8 w-8 items-center justify-center rounded-full text-fw-lightGray hover:bg-fw-disabled hover:text-fw-text"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-fw-purpleSoft">
              <Sparkles className="h-6 w-6 text-fw-black" />
            </div>
            <h2 id="auth-modal-title" className="mt-4 font-display text-[24px] font-bold text-fw-text">
              Your spin is ready to build.
            </h2>
            <p className="mt-2 text-[14px] leading-[22px] text-fw-darkGray">
              Create a free account to generate it, keep it in your Studio, and embed it on
              your store. Your photos are saved — you won't lose anything.
            </p>
            <div className="mt-6 flex justify-center">
              <SignInButton label="Continue with Google" callbackUrl="/onboarding" variant="default" />
            </div>
            <p className="mt-4 text-[12px] text-fw-lightGray">Free while in beta. No credit card.</p>
          </div>
        </div>
      )}
    </AppShell>
  );
}
