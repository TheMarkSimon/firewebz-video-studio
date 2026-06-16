"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppShell } from "@/components/app-shell";
import { submitOnboarding } from "@/lib/actions/onboarding";
import { Loader2, Upload, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FashionIcon, FoodIcon, BeautyIcon, HomeIcon, HealthIcon, TechIcon, ServicesIcon, OtherIcon,
  FriendlyIcon, PlayfulIcon, BoldIcon, PremiumIcon,
} from "@/components/category-icons";

type CardIcon = React.ComponentType<{ className?: string }>;

type State = {
  name: string;
  websiteUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
  category: string;
  categoryOther: string;
  brandTone: string[];
  imageFiles: File[];
};

const INITIAL: State = {
  name: "",
  websiteUrl: "",
  instagramUrl: "",
  tiktokUrl: "",
  category: "",
  categoryOther: "",
  brandTone: [],
  imageFiles: [],
};

const SECTIONS = [
  { label: "Account setup", steps: [0] },
  { label: "Category", steps: [1] },
  { label: "Brand tone", steps: [2] },
  { label: "Photos", steps: [3] },
];
const TOTAL_STEPS = 4;
const MAX_TONES = 3;

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

const TONES: Array<{ value: string; label: string; icon: CardIcon }> = [
  { value: "Friendly", label: "Friendly", icon: FriendlyIcon },
  { value: "Playful", label: "Playful", icon: PlayfulIcon },
  { value: "Bold", label: "Bold", icon: BoldIcon },
  { value: "Premium", label: "Premium", icon: PremiumIcon },
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
  function toggleTone(val: string) {
    setState((s) => {
      const present = s.brandTone.includes(val);
      if (present) return { ...s, brandTone: s.brandTone.filter((v) => v !== val) };
      if (s.brandTone.length >= MAX_TONES) return s;
      return { ...s, brandTone: [...s.brandTone, val] };
    });
  }

  const categoryValid = state.category !== "" && (state.category !== "Other" || state.categoryOther.trim().length > 0);

  const valid = ((): boolean => {
    switch (step) {
      case 0: return state.name.trim().length > 0;
      case 1: return categoryValid;
      case 2: return state.brandTone.length > 0;
      case 3: return state.imageFiles.length > 0;
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
        fd.append("brandTone", JSON.stringify(state.brandTone));
        if (state.websiteUrl) fd.append("websiteUrl", state.websiteUrl);
        if (state.instagramUrl) fd.append("instagramUrl", state.instagramUrl);
        if (state.tiktokUrl) fd.append("tiktokUrl", state.tiktokUrl);
        for (const f of state.imageFiles) fd.append("images", f);
        const sessionId = await submitOnboarding(fd);
        router.push(`/create?session=${sessionId}`);
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
        {/* Left section rail (Lemonade-style) */}
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
                  className="relative mb-7 block w-full text-left"
                >
                  <span
                    className={cn(
                      "absolute -left-[31px] top-[3px] flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 bg-white",
                      isActive ? "border-fw-purple" :
                      isDone   ? "border-fw-purple bg-fw-purple" :
                                 "border-fw-lightGray"
                    )}
                  >
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-fw-purple" />}
                    {isDone && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                  </span>
                  <span className={cn(
                    "text-[16px] font-semibold",
                    isActive || isDone ? "text-fw-text" : "text-fw-lightGray"
                  )}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center content column */}
        <div className="w-full max-w-[760px]">
          <div key={step} className="fw-screen-enter">
            {/* Left-aligned heading (avatar removed for compactness) */}
            <h1 className="mb-6 text-left text-[20px] font-bold leading-[1.4] text-fw-text">
              {meta.title}
            </h1>

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
              <CardGrid
                options={TONES}
                selected={state.brandTone}
                onToggle={toggleTone}
              />
            )}

            {step === 3 && (
              <>
                <ImageUpload files={state.imageFiles} onChange={(f) => update("imageFiles", f)} />
                {error && <div className="mt-3 max-w-md rounded-xl bg-destructive/10 px-4 py-3 text-[14px] text-destructive">{error}</div>}
              </>
            )}

            <div className="mt-8 flex items-center gap-4">
              <Button disabled={!valid || isPending} onClick={next} className="h-11 px-8">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (step === TOTAL_STEPS - 1 ? "Generate concept" : "Next")}
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

const SCREENS = [
  { title: "Welcome! Let's start with your company." },
  { title: "What category are you in?" },
  { title: "What's your brand tone?" },
  { title: "Last step — upload some product photos." },
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
        const atMax = !single && !isSel && selected.length >= MAX_TONES;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => !atMax && onToggle(opt.value)}
            disabled={atMax}
            className={cn(
              "group relative flex flex-col items-center justify-between rounded-xl border bg-white p-4 transition-all",
              "h-[180px] w-full max-w-[200px]",
              isSel
                ? "border-fw-purple bg-fw-purpleSoft shadow-[0_0_0_4px_rgba(147,129,255,0.18)]"
                : "border-[#E2E8F0] hover:border-fw-purple/40",
              atMax && "opacity-40 cursor-not-allowed"
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

function ImageUpload({ files, onChange }: { files: File[]; onChange: (f: File[]) => void }) {
  return (
    <div className="flex flex-col gap-3 max-w-xl">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-fw-lighterGray bg-white p-8 hover:border-fw-purple hover:bg-fw-purpleSoft/30">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-fw-purple">
          <Upload className="h-5 w-5 text-white" />
        </div>
        <p className="text-[14px] font-semibold text-fw-text">Click to upload photos</p>
        <p className="text-[12px] text-fw-darkGray">JPG, PNG, or WebP</p>
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onChange([...files, ...Array.from(e.target.files ?? [])])} />
      </label>
      {files.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {files.map((f, i) => {
            const url = URL.createObjectURL(f);
            return (
              <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-fw-border bg-fw-disabled">
                <img src={url} alt={f.name} className="h-full w-full object-cover" />
                <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-fw-text shadow hover:bg-destructive hover:text-white">
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
