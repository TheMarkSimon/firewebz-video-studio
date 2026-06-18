"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { previewFromSession, generateVideoFromSession, type SessionPreview, type SessionVideoResult } from "@/lib/actions/session-flow";
import { Loader2, Sparkles, Download, RotateCw, Instagram, Music, ChevronDown, ChevronUp, AlertCircle, CheckCircle } from "lucide-react";
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

      {result.diagnostics && <DiagnosticsPanel diagnostics={result.diagnostics} />}
    </div>
  );
}

function DiagnosticsPanel({ diagnostics: d }: { diagnostics: NonNullable<SessionVideoResult["diagnostics"]> }) {
  const [open, setOpen] = useState(false);
  const fmtMs = (ms?: number) => (ms == null ? "—" : ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`);

  return (
    <div className="mt-8 rounded-2xl border border-fw-border bg-fw-disabled/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-left text-[13px] font-semibold text-fw-text"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-fw-purple" />
          Show diagnostics (what just happened behind the scenes)
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="space-y-4 border-t border-fw-border px-5 py-4 text-[12px] text-fw-text">
          {/* Stage 1 status */}
          <DiagRow
            label="Stage 1 — Imagen (lifestyle scene)"
            value={
              !d.twoStageEnabled
                ? "DISABLED (USE_TWO_STAGE_VIDEO env var not set to '1')"
                : d.twoStageUsed
                  ? `OK — Imagen generated a lifestyle scene in ${fmtMs(d.imagenDurationMs)}`
                  : `FAILED — ${d.twoStageFallbackReason ?? "unknown"} (fell back to original product photo)`
            }
            ok={!d.twoStageEnabled ? "warn" : d.twoStageUsed ? "ok" : "fail"}
          />

          {d.imagenPrompt && (
            <DiagBlock label="Imagen prompt (what we asked the image model to create)">
              {d.imagenPrompt}
            </DiagBlock>
          )}
          {d.imagenSceneDescription && (
            <DiagBlock label="Imagen scene description (what we told the user)">
              {d.imagenSceneDescription}
            </DiagBlock>
          )}
          {d.imagenError && (
            <DiagBlock label="Imagen error" tone="error">
              {d.imagenError}
            </DiagBlock>
          )}

          {/* Stage 2 status */}
          <DiagRow
            label={`Stage 2 — Runway (${d.runwayModel ?? "?"})`}
            value={`Completed in ${fmtMs(d.runwayDurationMs)} · task ${d.runwayTaskId ?? "?"}`}
            ok="ok"
          />

          {d.runwayPrompt && (
            <DiagBlock label="Runway prompt (what we asked the video model to do with the first frame)">
              {d.runwayPrompt}
            </DiagBlock>
          )}

          <DiagRow label="Style picked" value={d.videoStyleKey ?? "?"} ok="ok" />
          <DiagRow label="Total time" value={fmtMs(d.totalDurationMs)} ok="ok" />

          {!d.twoStageEnabled && (
            <div className="rounded-lg bg-fw-yellow/20 px-3 py-2 text-[11px] text-fw-text">
              ⚠️ Two-stage is OFF on this deployment. Runway only saw your original product photo, so the video can only be subtle motion of that exact photo. Set <code className="rounded bg-white px-1">USE_TWO_STAGE_VIDEO=1</code> in Vercel env vars and redeploy.
            </div>
          )}
          {d.twoStageEnabled && !d.twoStageUsed && (
            <div className="rounded-lg bg-destructive/15 px-3 py-2 text-[11px] text-destructive">
              ⚠️ Two-stage is enabled but Imagen failed. Runway got your original photo as fallback, which is why output looks like a basic catalog animation. The Imagen error above tells you why it failed (most common cause: billing not enabled on the Google Cloud project tied to GEMINI_API_KEY).
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DiagRow({ label, value, ok }: { label: string; value: string; ok: "ok" | "warn" | "fail" }) {
  const icon =
    ok === "ok" ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> :
    ok === "warn" ? <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> :
    <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-fw-darkGray">{label}</div>
        <div className="text-[12px] text-fw-text">{value}</div>
      </div>
    </div>
  );
}

function DiagBlock({ label, children, tone = "info" }: { label: string; children: React.ReactNode; tone?: "info" | "error" }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-fw-darkGray">{label}</div>
      <pre className={cn(
        "mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg p-3 text-[11px] leading-relaxed",
        tone === "error" ? "bg-destructive/10 text-destructive" : "bg-white text-fw-text"
      )}>{children}</pre>
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
