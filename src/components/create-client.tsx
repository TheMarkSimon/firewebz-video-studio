"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { generateConcepts, updateConceptFields } from "@/lib/actions/concepts";
import { generateVideoForConcept } from "@/lib/actions/videos";
import { buildPreviewForProduct } from "@/lib/actions/preview";
import { submitFeedback } from "@/lib/actions/feedback";
import { addToCalendar } from "@/lib/actions/calendar";
import { Loader2, Sparkles, Download, Star, RotateCw, Calendar as CalIcon, Check, X, Instagram, Music } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn, assetUrl } from "@/lib/utils";

type ScenePreview = {
  title: string;
  paragraph: string;
  mood: string;
  bestFor: string;
};

type Business = { id: string; name: string; category: string; brandTone: string[] };
type Product = { id: string; name: string; imagePaths: string[] };
type ExistingConcept = {
  id: string;
  hook: string;
  caption: string;
  hashtags: string[];
  cta: string;
  platform: string;
  videoStyle: string;
  video: {
    id: string;
    status: string;
    filePath: string | null;
    provider: string;
    errorMessage: string | null;
    hasFeedback: boolean;
  } | null;
} | null;

const PLATFORMS: Array<{ value: string; label: string; icon: LucideIcon }> = [
  { value: "instagram_reels", label: "Instagram Reels", icon: Instagram },
  { value: "tiktok", label: "TikTok", icon: Music },
];

export function CreateClient({
  business,
  product,
  existingConcept,
}: {
  business: Business;
  product: Product;
  existingConcept: ExistingConcept;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Phase: preview | generating | result
  const initialPhase: "preview" | "generating" | "result" =
    existingConcept?.video?.status === "completed" ? "result" :
    existingConcept ? "preview" :
    "preview";
  const [phase, setPhase] = useState<"preview" | "generating" | "result">(initialPhase);
  const [conceptId, setConceptId] = useState<string | null>(existingConcept?.id ?? null);
  const [scenePreview, setScenePreview] = useState<ScenePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const productImage = product.imagePaths[0];
  const productImageUrl = assetUrl(productImage);

  // When entering the preview phase, fetch the LLM-generated scene description.
  useEffect(() => {
    if (phase !== "preview" || scenePreview) return;
    let cancelled = false;
    setPreviewLoading(true);
    buildPreviewForProduct(product.id, "Product spotlight", 5)
      .then((res) => {
        if (cancelled) return;
        setScenePreview(res.preview.sceneDescription);
      })
      .catch(() => {
        // fall through silently; PreviewPhase will show a minimal fallback
      })
      .finally(() => !cancelled && setPreviewLoading(false));
    return () => { cancelled = true; };
  }, [phase, product.id, scenePreview]);

  async function generateNow() {
    setError(null);
    setPhase("generating");
    startTransition(async () => {
      try {
        let cid = conceptId;
        if (!cid) {
          const ids = await generateConcepts({
            businessId: business.id,
            productId: product.id,
            platforms: ["instagram_reels"],
            videoStyles: ["Product spotlight"],
            count: 1,
            ctaPreference: "Shop now",
          });
          cid = ids[0];
          setConceptId(cid);
        }
        await generateVideoForConcept(cid);
        setPhase("result");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
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
          scenePreview={scenePreview}
          previewLoading={previewLoading}
          onRefreshPreview={() => setScenePreview(null)}
          onGenerate={generateNow}
          isPending={isPending}
          error={error}
        />
      )}

      {phase === "generating" && <GeneratingPhase />}

      {phase === "result" && existingConcept && (
        <ResultPhase
          business={business}
          product={product}
          productImageUrl={productImageUrl}
          concept={existingConcept}
          onRegenerate={generateNow}
          isPending={isPending}
        />
      )}
    </div>
  );
}

function PreviewPhase({
  business,
  productImageUrl,
  scenePreview,
  previewLoading,
  onRefreshPreview,
  onGenerate,
  isPending,
  error,
}: {
  business: Business;
  productImageUrl: string | null;
  scenePreview: ScenePreview | null;
  previewLoading: boolean;
  onRefreshPreview: () => void;
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
            {previewLoading && !scenePreview && (
              <div className="flex items-center gap-2 text-[14px] text-fw-darkGray">
                <Loader2 className="h-4 w-4 animate-spin text-fw-purple" />
                Reading your brand…
              </div>
            )}

            {scenePreview && (
              <>
                <h2 className="text-[18px] font-bold leading-tight text-fw-text">{scenePreview.title}</h2>
                <p className="text-[14px] leading-relaxed text-fw-text">{scenePreview.paragraph}</p>
                <dl className="mt-2 space-y-1.5 text-[13px]">
                  <Row label="Mood" value={scenePreview.mood} />
                  <Row label="Best for" value={scenePreview.bestFor} />
                  <Row label="Business" value={`${business.name} · ${business.category}`} />
                  <Row label="Format" value="9:16 vertical · ~5 seconds" />
                </dl>
              </>
            )}

            {!previewLoading && !scenePreview && (
              <>
                <h2 className="text-[18px] font-bold text-fw-text">{business.name}</h2>
                <p className="text-[14px] text-fw-darkGray">A 5-second vertical product video, optimized for Instagram Reels and TikTok.</p>
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
        <Button variant="outline" onClick={onRefreshPreview} disabled={isPending || previewLoading} className="h-11 px-5 text-[13px]">
          <RotateCw className="h-4 w-4" /> Try a different idea
        </Button>
        <span className="text-[12px] text-fw-lightGray">May take up to a minute.</span>
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
      <p className="mt-1 text-[13px] text-fw-darkGray">This usually takes 20–60 seconds.</p>
    </div>
  );
}

function ResultPhase({
  business,
  product,
  productImageUrl,
  concept,
  onRegenerate,
  isPending,
}: {
  business: Business;
  product: Product;
  productImageUrl: string | null;
  concept: NonNullable<ExistingConcept>;
  onRegenerate: () => void;
  isPending: boolean;
}) {
  const router = useRouter();
  const [platform, setPlatform] = useState<string>(concept.platform || "instagram_reels");
  const [draft, setDraft] = useState({
    hook: concept.hook,
    caption: concept.caption,
    hashtags: concept.hashtags.join(" "),
    cta: concept.cta,
  });
  const [showFeedback, setShowFeedback] = useState(false);
  const [, startTransition] = useTransition();

  const video = concept.video;
  const videoUrl = assetUrl(video?.filePath);

  function saveDraft() {
    startTransition(async () => {
      await updateConceptFields(concept.id, {
        hook: draft.hook,
        caption: draft.caption,
        cta: draft.cta,
        hashtags: draft.hashtags.split(/\s+/).filter(Boolean),
      });
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-fw-text">Your video is ready</h1>
          <p className="text-[14px] text-fw-darkGray">{business.name} · {product.name}</p>
        </div>
        <Button variant="outline" onClick={onRegenerate} disabled={isPending} className="h-10 px-5 text-[13px]">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
          Regenerate
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        {/* Video column */}
        <div>
          <div className="aspect-[9/16] w-full overflow-hidden rounded-2xl bg-black">
            {videoUrl ? (
              <video src={videoUrl} controls className="h-full w-full object-cover" />
            ) : video?.status === "failed" ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 bg-destructive/10 p-4 text-center text-[13px] text-destructive">
                {video.errorMessage ?? "Generation failed"}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 bg-fw-purpleSoft p-4 text-center">
                <Sparkles className="h-8 w-8 text-fw-purple" />
                <p className="text-[13px] font-semibold text-fw-text">Mock generation complete</p>
                <p className="text-[11px] text-fw-darkGray">Set up a real video provider in Settings.</p>
              </div>
            )}
          </div>
          {videoUrl && (
            <Button asChild variant="outline" className="mt-3 w-full h-9 text-[13px]">
              <a href={videoUrl} download={`firewebz-${video?.id ?? "video"}.mp4`}>
                <Download className="h-4 w-4" /> Download MP4
              </a>
            </Button>
          )}
        </div>

        {/* Text + platform column */}
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
              onBlur={saveDraft}
              rows={2}
              className="min-h-[60px] font-semibold"
            />
          </Field>

          <Field label="Caption">
            <Textarea value={draft.caption} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} onBlur={saveDraft} rows={3} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Hashtags">
              <Input value={draft.hashtags} onChange={(e) => setDraft({ ...draft, hashtags: e.target.value })} onBlur={saveDraft} placeholder="#tag #tag" />
            </Field>
            <Field label="Call to action">
              <Input value={draft.cta} onChange={(e) => setDraft({ ...draft, cta: e.target.value })} onBlur={saveDraft} />
            </Field>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {video && !video.hasFeedback && (
              <Button variant="outline" onClick={() => setShowFeedback(true)} className="h-10 px-4 text-[13px]">
                <Star className="h-4 w-4" /> Rate this
              </Button>
            )}
            {video && (
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await addToCalendar({
                      businessId: business.id,
                      conceptId: concept.id,
                      generatedVideoId: video.id,
                      scheduledDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
                      platform,
                      status: "video_generated",
                    });
                    router.push("/calendar");
                  })
                }
                className="h-10 px-4 text-[13px]"
              >
                <CalIcon className="h-4 w-4" /> Add to calendar
              </Button>
            )}
          </div>
        </div>
      </div>

      {showFeedback && video && (
        <FeedbackModal videoId={video.id} onClose={() => setShowFeedback(false)} />
      )}
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

function FeedbackModal({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  const router = useRouter();
  const [rating, setRating] = useState(4);
  const [wouldPost, setWouldPost] = useState<"yes" | "maybe" | "no">("maybe");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-[18px] font-bold text-fw-text">Rate this video</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-fw-disabled">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 space-y-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fw-darkGray">Rating</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} className="p-1">
                  <Star className={cn("h-6 w-6", n <= rating ? "fill-fw-yellow text-fw-yellow" : "text-fw-lightGray")} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fw-darkGray">Would you post this?</p>
            <div className="flex gap-2">
              {(["yes", "maybe", "no"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setWouldPost(v)}
                  className={cn(
                    "flex-1 rounded-pill border-2 px-4 py-2 text-[13px] font-semibold capitalize",
                    wouldPost === v ? "border-fw-purple bg-fw-purple text-white" : "border-fw-border bg-white text-fw-text"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" rows={2} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await submitFeedback({ generatedVideoId: videoId, rating, wouldPost, rejectionReasons: [], notes });
                  onClose();
                  router.refresh();
                })
              }
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Submit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
