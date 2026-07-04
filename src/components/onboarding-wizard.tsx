"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppShell } from "@/components/app-shell";
import { submitOnboarding3d } from "@/lib/actions/onboarding3d";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FashionIcon, FoodIcon, BeautyIcon, HomeIcon, HealthIcon, TechIcon, ServicesIcon, OtherIcon,
} from "@/components/category-icons";
import { PhotoSlot, type SlotKind } from "@/components/photo-slot";

type CardIcon = React.ComponentType<{ className?: string }>;

type PhotoEntry = { raw: string | null; processed: string | null };

type State = {
  name: string;
  websiteUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  category: string;
  categoryOther: string;
  photos: Record<SlotKind, PhotoEntry>;
};

const INITIAL: State = {
  name: "",
  websiteUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
  category: "",
  categoryOther: "",
  photos: {
    front: { raw: null, processed: null },
    back: { raw: null, processed: null },
    left: { raw: null, processed: null },
    right: { raw: null, processed: null },
  },
};

const SECTIONS = [
  { label: "About you", steps: [0] },
  { label: "Category", steps: [1] },
  { label: "Photos", steps: [2] },
];
const TOTAL_STEPS = 3;

const CATEGORIES: Array<{ value: string; label: string; icon: CardIcon }> = [
  { value: "Fashion", label: "Fashion", icon: FashionIcon },
  { value: "Food", label: "Food & Drink", icon: FoodIcon },
  { value: "Beauty", label: "Beauty", icon: BeautyIcon },
  { value: "Home", label: "Home & Decor", icon: HomeIcon },
  { value: "Health", label: "Health & Wellness", icon: HealthIcon },
  { value: "Tech", label: "Tech & Gadgets", icon: TechIcon },
  { value: "Services", label: "Services", icon: ServicesIcon },
  { value: "Other", label: "Other", icon: OtherIcon },
];

const SLOTS: Array<{ kind: SlotKind; label: string; required: boolean }> = [
  { kind: "front", label: "Front", required: true },
  { kind: "back",  label: "Back",  required: true },
  { kind: "left",  label: "Left side",  required: true },
  { kind: "right", label: "Right side", required: false },
];

function sectionIndexForStep(step: number): number {
  for (let i = 0; i < SECTIONS.length; i++) if (SECTIONS[i].steps.includes(step)) return i;
  return 0;
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<State>(INITIAL);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof State>(key: K, value: State[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }
  function updatePhoto(kind: SlotKind, raw: string | null, processed: string | null) {
    setState((s) => ({
      ...s,
      photos: { ...s.photos, [kind]: { raw, processed } },
    }));
  }

  const categoryValid = state.category !== "" && (state.category !== "Other" || state.categoryOther.trim().length > 0);
  const requiredPhotos: SlotKind[] = ["front", "back", "left"];
  const photosValid = requiredPhotos.every((k) => Boolean(state.photos[k].processed || state.photos[k].raw));

  const valid = ((): boolean => {
    switch (step) {
      case 0: return state.name.trim().length > 0;
      case 1: return categoryValid;
      case 2: return photosValid;
      default: return false;
    }
  })();

  function next() {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else submit();
  }
  function back() { if (step > 0) setStep(step - 1); }
  function reset() { setStep(0); setState(INITIAL); setError(null); }

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const finalCategory = state.category === "Other" ? state.categoryOther : state.category;
        const fd = new FormData();
        fd.append("businessName", state.name);
        fd.append("category", finalCategory);
        if (state.websiteUrl) fd.append("websiteUrl", state.websiteUrl);
        if (state.instagramUrl) fd.append("instagramUrl", state.instagramUrl);
        if (state.tiktokUrl) fd.append("tiktokUrl", state.tiktokUrl);
        for (const slot of SLOTS) {
          const p = state.photos[slot.kind];
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

  const activeSection = sectionIndexForStep(step);
  const meta = SCREENS[step];

  return (
    <AppShell variant="onboarding" onReset={reset}>
      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6 lg:gap-10 pt-4 lg:pt-6">
        <aside className="hidden lg:block">
          <div className="relative pl-8">
            <div className="absolute left-[11px] top-3 bottom-3 w-px bg-fw-lighterGray" />
            {SECTIONS.map((s, i) => {
              const isActive = i === activeSection;
              const isDone = i < activeSection;
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => isDone && setStep(SECTIONS[i].steps[0])}
                  disabled={!isDone && !isActive}
                  className="relative mb-6 block w-full text-left"
                >
                  <span
                    className={cn(
                      "absolute -left-6 top-[2px] flex h-4 w-4 items-center justify-center rounded-full border-2",
                      isActive ? "border-fw-purple bg-fw-purple" :
                      isDone   ? "border-fw-purple bg-white" :
                                 "border-fw-lightGray bg-white"
                    )}
                  >
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    {isDone && <Check className="h-2.5 w-2.5 text-fw-purple" strokeWidth={3} />}
                  </span>
                  <span className={cn(
                    "text-[14px] font-semibold",
                    isActive || isDone ? "text-fw-text" : "text-fw-lightGray"
                  )}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="w-full max-w-[820px]">
          <div key={step} className="fw-screen-enter">
            <h1 className="mb-2 text-left text-[22px] font-bold leading-[1.4] text-fw-text">
              {meta.title}
            </h1>
            {meta.subtitle && (
              <p className="mb-6 text-[14px] text-fw-darkGray">{meta.subtitle}</p>
            )}

            {step === 0 && (
              <div className="space-y-3 max-w-md">
                <Input autoFocus value={state.name} onChange={(e) => update("name", e.target.value)} placeholder="Business name" />
                <Input value={state.websiteUrl} onChange={(e) => update("websiteUrl", e.target.value)} placeholder="Website URL (optional)" />
                <Input value={state.instagramUrl} onChange={(e) => update("instagramUrl", e.target.value)} placeholder="Instagram URL (optional)" />
                <Input value={state.tiktokUrl} onChange={(e) => update("tiktokUrl", e.target.value)} placeholder="TikTok URL (optional)" />
              </div>
            )}

            {step === 1 && (
              <>
                <CardGrid
                  options={CATEGORIES}
                  selected={state.category ? [state.category] : []}
                  onToggle={(v) => update("category", v)}
                  single
                />
                {state.category === "Other" && (
                  <div className="mt-4 max-w-md">
                    <Input
                      autoFocus
                      value={state.categoryOther}
                      onChange={(e) => update("categoryOther", e.target.value)}
                      placeholder="What do you sell?"
                    />
                  </div>
                )}
              </>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="rounded-xl bg-fw-purpleSoft/50 p-4 text-[13px] leading-relaxed text-fw-text">
                  <strong>3 mandatory photos, 1 optional.</strong> Backgrounds are auto-removed in your browser — you can see the result before we build the 3D model. Snap in a standard warehouse or store, natural light is fine.
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {SLOTS.map((s) => {
                    const p = state.photos[s.kind];
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
                  <div className="rounded-xl bg-destructive/10 px-4 py-3 text-[13px] text-destructive">{error}</div>
                )}
              </div>
            )}

            <div className="mt-8 flex items-center gap-4">
              <Button disabled={!valid || isPending} onClick={next} className="h-11 px-8">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (step === TOTAL_STEPS - 1 ? "Generate 3D view" : "Next")}
              </Button>
              {step > 0 && (
                <button onClick={back} disabled={isPending} className="text-[14px] text-fw-darkGray hover:text-fw-text">
                  Back
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

const SCREENS: Array<{ title: string; subtitle?: string }> = [
  { title: "Let's start with your company.", subtitle: "Business name is required. Social links help us understand your brand." },
  { title: "What category is your product in?", subtitle: "Pick the closest match." },
  { title: "Upload photos of your product.", subtitle: "3 required (front, back, left), 1 optional. We'll clean the backgrounds automatically." },
];

function CardGrid({
  options, selected, onToggle, single = false,
}: {
  options: Array<{ value: string; label: string; icon: CardIcon }>;
  selected: string[];
  onToggle: (v: string) => void;
  single?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {options.map((opt) => {
        const isSel = selected.includes(opt.value);
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            className={cn(
              "group relative flex flex-col items-center justify-between rounded-xl border bg-white p-4 transition-all",
              "h-[180px] w-full max-w-[200px]",
              isSel
                ? "border-fw-purple bg-fw-purpleSoft shadow-[0_0_0_4px_rgba(147,129,255,0.18)]"
                : "border-[#E2E8F0] hover:border-fw-purple/40",
            )}
          >
            <div className="flex flex-1 items-center justify-center">
              <Icon className="h-20 w-20" />
            </div>
            <span className={cn(
              "text-[15px] font-medium leading-tight text-center",
              isSel ? "text-fw-purpleDark" : "text-[#1A202C]"
            )}>
              {opt.label}
            </span>
            {!single && (
              <span className={cn(
                "mt-2 flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all",
                isSel ? "border-fw-purple bg-fw-purple" : "border-fw-lightGray bg-white"
              )}>
                {isSel && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
