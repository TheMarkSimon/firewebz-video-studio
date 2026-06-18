"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { previewFromSession, generateVideoFromSession, type SessionPreview, type SessionVideoResult } from "@/lib/actions/session-flow";
import { Loader2, Sparkles, Download, RotateCw, Instagram, Music } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn, assetUrl } from "@/lib/utils";

type Business = {
  id: string;
  name: string;
  category: string;
  brandTone: string[];
  websiteUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
};
type Product = { id: string; name: string; imagePaths: string[] };

const PLATFORMS: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: "instagram_reels", label: "Instagram Reels", icon: Instagram },
  { value: "tiktok", label: "TikTok", icon: Music },
];

export function CreateClient({
  business,
  product,
}: {
  business: Business;
  product: Product;
  existingConcept: null;
}) {
  const [phase, setPhase] = useState<"preview" | "generating" | "result">("preview");
  const [preview, setPreview] = useState<SessionPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [result, setResult] = useState<SessionVideoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const productImageUrl = assetUrl(product.imagePaths[0]);

  // Fetch the LLM-built scene description on mount
  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);
    previewFromSession(business.id)
      .then((p) => { if (!cancelled) setPreview(p); })
      .catch((e) => { if (!cancelled) setPreviewError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [business.id]);

  function generate() {
    setError(null);
    setPhase("generating");
    startTransition(async () => {
      try {
        const res = await generateVideoFromSession(business.id);
        setResult(res);
        setPhase("result");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setPhase("preview");
      }
    });
  }

  return (
    <div className="mx-auto max-w-4xl pt-4 lg:pt-6">
      {phase === "preview" && (
        <PreviewPhase
          business={business}
          productImageUrl={productImageUrl}
          preview={preview}
          previewLoading={previewLoading}
          previewError={previewError}
          onGenerate={generate}
          isPending={isPending}
          error={error}
        />
      )}

      {phase === "generating" && <GeneratingPhase />}

      {phase === "result" && result && (
        <ResultPhase
          business={business}
          productImageUrl={productImageUrl}
          result={result}
          onRegenerate={generate}
          isPending={isPending}
        />
      )}
    </div>
  );
}

function PreviewPhase({
  business,
  productImageUrl,
  preview,
  previewLoading,
  previewError,
  onGenerate,
  isPending,
  error,
}: {
  business: Business;
  productImageUrl: string | null;
  preview: SessionPreview | null;
  previewLoading: boolean;
  previewError: string | null;
  onGenerate: () => void;
  isPending: boolean;
  error: string | null;
}) {
  return (
    <div>
      <h1 className="mb-2 text-[22px] font-bold text-fw-text">Here's what we'll create</h1>
      <p className="mb-6 text-[15px] text-fw-darkGray">A quick preview of your video before we generate it.</p>

      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
        <div className="grid grid-cols-[140px_1fr] gap-6">
          <div className="aspect-[9/16] w-full overflow-hidden rounded-xl bg-fw-disabled">
            {productImageUrl ? (
              <img src={productImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-[12px] text-fw-lightGray">No image</div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {previewLoading && !preview && (
              <div className="flex items-center gap-2 text-[14px] text-fw-darkGray">
                <Loader2 className="h-4 w-4 animate-spin text-fw-purple" />
                Reading your brand…
              </div>
            )}

            {preview && (
              <>
                <h2 className="text-[18px] font-bold leading-tight text-fw-text">{preview.title}</h2>
                <p className="text-[14px] leading-relaxed text-fw-text">{preview.paragraph}</p>
                <dl className="mt-2 space-y-1.5 text-[13px]">
                  <Row label="Mood" value={preview.mood} />
                  <Row label="Best for" value={preview.bestFor} />
                  <Row label="Business" value={`${business.name} · ${business.category}`} />
                  <Row label="Format" value="9:16 vertical · ~5 seconds" />
                </dl>
              </>
            )}

            {!previewLoading && !preview && (
              <>
                <h2 className="text-[18px] font-bold text-fw-text">{business.name}</h2>
                <p className="text-[14px] text-fw-darkGray">
                  {previewError ?? "A 5-second vertical product video, optimized for Instagram Reels and TikTok."}
                </p>
                <dl className="mt-2 space-y-1.5 text-[13px]">
                  <Row label="Category" value={business.category} />
                  <Row label="Brand tone" value={business.brandTone.length ? business.brandTone.join(", ") : "—"} />
                  <Row label="Format" value="9:16 vertical · ~5 seconds" />
                </dl>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-[13px] text-destructive">{error}</div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={onGenerate} disabled={isPending || previewLoading} className="h-11 px-8">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Looks great, generate
        </Button>
        <span className="text-[12px] text-fw-lightGray">May take 30-60 seconds.</span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-fw-darkGray">{label}</dt>
      <dd className="text-fw-text font-medium">{value}</dd>
    </div>
  );
}

function GeneratingPhase() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-fw-purpleSoft" />
        <Loader2 className="h-10 w-10 animate-spin text-fw-purple" />
      </div>
      <p className="mt-6 text-[16px] font-semibold text-fw-text">Creating your video…</p>
      <p className="mt-1 text-[13px] text-fw-darkGray">This usually takes 30-60 seconds.</p>
    </div>
  );
}

function ResultPhase({
  business,
  productImageUrl,
  result,
  onRegenerate,
  isPending,
}: {
  business: Business;
  productImageUrl: string | null;
  result: SessionVideoResult;
  onRegenerate: () => void;
  isPending: boolean;
}) {
  const [platform, setPlatform] = useState<string>("instagram_reels");
  const [draft, setDraft] = useState({
    hook: result.hook ?? "",
    caption: result.caption ?? "",
    hashtags: (result.hashtags ?? []).join(" "),
    cta: result.cta ?? "Shop now",
  });

  const videoUrl = assetUrl(result.videoUrl ?? null);

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-fw-text">Your video is ready</h1>
          <p className="text-[14px] text-fw-darkGray">{business.name} · {business.category}</p>
        </div>
        <Button variant="outline" onClick={onRegenerate} disabled={isPending} className="h-10 px-5 text-[13px]">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
          Regenerate
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        <div>
          <div className="aspect-[9/16] w-full overflow-hidden rounded-2xl bg-black">
            {videoUrl ? (
              <video src={videoUrl} controls className="h-full w-full object-cover" />
            ) : result.status === "failed" ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 bg-destructive/10 p-4 text-center text-[13px] text-destructive">
                {result.errorMessage ?? "Generation failed"}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 bg-fw-purpleSoft p-4 text-center">
                <Sparkles className="h-8 w-8 text-fw-purple" />
                <p className="text-[13px] font-semibold text-fw-text">Mock generation complete</p>
                <p className="text-[11px] text-fw-darkGray">Configure a video provider in Settings.</p>
              </div>
            )}
          </div>
          {videoUrl && (
            <Button asChild variant="outline" className="mt-3 w-full h-9 text-[13px]">
              <a href={videoUrl} download={`firewebz-${business.name.replace(/\s+/g, "-")}.mp4`}>
                <Download className="h-4 w-4" /> Download MP4
              </a>
            </Button>
          )}
          {result.lifestyleSceneUrl && (
            <div className="mt-3">
              <p className="text-[11px] uppercase tracking-wider text-fw-darkGray">AI-generated scene</p>
              <img src={result.lifestyleSceneUrl} alt="" className="mt-1 w-full rounded-lg border border-fw-border" />
              {result.lifestyleSceneDescription && (
                <p className="mt-1.5 text-[11px] text-fw-darkGray italic">{result.lifestyleSceneDescription}</p>
              )}
              <p className="mt-1.5 text-[10px] text-fw-lightGray">
                Small product details may vary from your original photo.
              </p>
            </div>
          )}
          {productImageUrl && (
            <div className="mt-3">
              <p className="text-[11px] uppercase tracking-wider text-fw-darkGray">Your source photo</p>
              <img src={productImageUrl} alt="" className="mt-1 w-full rounded-lg border border-fw-border" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Field label="Where will you post this?">
            <div className="grid grid-cols-2 gap-3 max-w-md">
              {PLATFORMS.map((p) => {
                const Icon = p.icon;
                const sel = platform === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPlatform(p.value)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left transition-all",
                      sel ? "border-fw-purple bg-fw-purpleSoft shadow-[0_0_0_3px_rgba(147,129,255,0.18)]" : "border-[#E2E8F0] hover:border-fw-purple/40"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", sel ? "text-fw-purple" : "text-fw-darkGray")} />
                    <span className={cn("text-[14px] font-semibold", sel ? "text-fw-purpleDark" : "text-fw-text")}>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Hook">
            <Textarea
              value={draft.hook}
              onChange={(e) => setDraft({ ...draft, hook: e.target.value })}
              rows={2}
              className="min-h-[60px] font-semibold"
            />
          </Field>

          <Field label="Caption">
            <Textarea value={draft.caption} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} rows={3} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Hashtags">
              <Input value={draft.hashtags} onChange={(e) => setDraft({ ...draft, hashtags: e.target.value })} placeholder="#tag #tag" />
            </Field>
            <Field label="Call to action">
              <Input value={draft.cta} onChange={(e) => setDraft({ ...draft, cta: e.target.value })} />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-fw-darkGray">{label}</span>
      {children}
    </div>
  );
}
