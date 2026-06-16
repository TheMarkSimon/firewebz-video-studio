"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_LABELS, REJECTION_REASONS, type Platform, type VideoStyle } from "@/lib/types";
import { generateConcepts, updateConceptFields } from "@/lib/actions/concepts";
import { generateVideoForConcept } from "@/lib/actions/videos";
import { submitFeedback } from "@/lib/actions/feedback";
import { addToCalendar } from "@/lib/actions/calendar";
import { Loader2, Film, Star, Download, Sparkles, ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { cn, assetUrl } from "@/lib/utils";

type Concept = {
  id: string;
  title: string;
  platform: string;
  videoStyle: string;
  hook: string;
  storyboard: string[];
  onScreenText: string[];
  voiceoverScript: string | null;
  caption: string;
  hashtags: string[];
  cta: string;
  performanceHypothesis: string;
  status: string;
  productName: string;
  productImagePaths: string[];
  videos: Array<{
    id: string;
    provider: string;
    status: string;
    filePath: string | null;
    errorMessage: string | null;
    durationSeconds: number | null;
    feedback: Array<{ rating: number; wouldPost: string }>;
  }>;
};

type Business = { id: string; name: string; products: Array<{ id: string; name: string }> };

export function ConceptsClient({
  businesses,
  activeBusinessId,
  activeProductId,
  concepts,
  autoGenerate,
  autoGenerateConfig,
}: {
  businesses: Business[];
  activeBusinessId?: string;
  activeProductId?: string;
  concepts: Concept[];
  autoGenerate?: boolean;
  autoGenerateConfig: { count: number; styles: string[]; platforms: string[]; cta: string };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [autoDone, setAutoDone] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (autoGenerate && !autoDone && activeBusinessId && activeProductId) {
      setAutoDone(true);
      startTransition(async () => {
        await generateConcepts({
          businessId: activeBusinessId,
          productId: activeProductId,
          platforms: autoGenerateConfig.platforms as Platform[],
          videoStyles: autoGenerateConfig.styles as VideoStyle[],
          count: autoGenerateConfig.count,
          ctaPreference: autoGenerateConfig.cta,
        });
        router.replace(`/concepts?businessId=${activeBusinessId}&productId=${activeProductId}`);
      });
    }
  }, [autoGenerate, autoDone, activeBusinessId, activeProductId, autoGenerateConfig, router, startTransition]);

  if (isPending && autoGenerate) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-fw-purple" />
        <p className="mt-4 text-[15px] text-fw-darkGray">Crafting your first concept…</p>
      </div>
    );
  }

  if (concepts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-fw-purpleSoft">
          <Sparkles className="h-8 w-8 text-fw-purple" />
        </div>
        <p className="mt-4 text-[16px] font-semibold text-fw-text">No concepts yet</p>
        <p className="mt-1 text-[14px] text-fw-darkGray">Run onboarding to generate your first concept.</p>
        <Button asChild className="mt-6">
          <a href="/onboarding">Start onboarding</a>
        </Button>
      </div>
    );
  }

  const safeIndex = Math.min(activeIndex, concepts.length - 1);
  const concept = concepts[safeIndex];

  return (
    <div className="mx-auto max-w-5xl">
      {businesses.length > 1 && (
        <div className="mb-4 flex justify-end">
          <BusinessSwitcher businesses={businesses} activeId={activeBusinessId} />
        </div>
      )}

      {concepts.length > 1 && (
        <div className="mb-6 flex items-center justify-center gap-4">
          <button
            onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
            disabled={safeIndex === 0}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-fw-darkGray hover:bg-fw-purpleSoft disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-[14px] text-fw-darkGray">
            Concept <span className="font-semibold text-fw-text">{safeIndex + 1}</span> of {concepts.length}
          </span>
          <button
            onClick={() => setActiveIndex((i) => Math.min(concepts.length - 1, i + 1))}
            disabled={safeIndex === concepts.length - 1}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-fw-darkGray hover:bg-fw-purpleSoft disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      <ConceptCard key={concept.id} concept={concept} businessId={activeBusinessId} />
    </div>
  );
}

function BusinessSwitcher({ businesses, activeId }: { businesses: Business[]; activeId?: string }) {
  const router = useRouter();
  return (
    <select
      className="h-10 rounded-xl border-2 border-fw-border bg-white px-3 text-[14px] text-fw-text focus:border-fw-purple focus:outline-none"
      value={activeId ?? ""}
      onChange={(e) => router.push(`/concepts?businessId=${e.target.value}`)}
    >
      {businesses.map((b) => (
        <option key={b.id} value={b.id}>{b.name}</option>
      ))}
    </select>
  );
}

function ConceptCard({ concept, businessId }: { concept: Concept; businessId?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState({
    hook: concept.hook,
    caption: concept.caption,
    hashtags: concept.hashtags.join(" "),
    cta: concept.cta,
  });
  const [showFeedback, setShowFeedback] = useState(false);

  const latestVideo = concept.videos[0];
  const productImage = concept.productImagePaths[0];
  const productImageUrl = assetUrl(productImage);
  const videoUrl = assetUrl(latestVideo?.filePath);

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

  function generate() {
    startTransition(async () => {
      // Persist any local edits first
      await updateConceptFields(concept.id, {
        hook: draft.hook,
        caption: draft.caption,
        cta: draft.cta,
        hashtags: draft.hashtags.split(/\s+/).filter(Boolean),
      });
      await generateVideoForConcept(concept.id);
      router.refresh();
    });
  }

  return (
    <div className="rounded-3xl bg-white p-6 lg:p-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
        {/* Left: product image preview */}
        <div className="flex flex-col gap-4">
          <div className="aspect-[9/16] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-fw-purpleSoft to-fw-disabled">
            {productImageUrl ? (
              <img src={productImageUrl} alt={concept.productName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-fw-lightGray text-[13px]">No image</div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{PLATFORM_LABELS[concept.platform as Platform] ?? concept.platform}</Badge>
            <Badge variant="outline">{concept.videoStyle}</Badge>
            <Badge variant="outline">9:16</Badge>
          </div>
          <div className="rounded-xl bg-fw-purpleSoft p-3 text-[12px] leading-relaxed text-fw-text">
            <span className="font-semibold">Why this works:</span> {concept.performanceHypothesis}
          </div>
        </div>

        {/* Right: editable fields */}
        <div className="flex flex-col gap-5">
          <Field label="Hook">
            <Textarea
              value={draft.hook}
              onChange={(e) => setDraft({ ...draft, hook: e.target.value })}
              onBlur={saveDraft}
              rows={2}
              className="min-h-[60px] text-[16px] font-semibold leading-snug"
            />
          </Field>

          <Field label="Caption">
            <Textarea
              value={draft.caption}
              onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
              onBlur={saveDraft}
              rows={3}
            />
          </Field>

          <Field label="Hashtags">
            <Input
              value={draft.hashtags}
              onChange={(e) => setDraft({ ...draft, hashtags: e.target.value })}
              onBlur={saveDraft}
              placeholder="#hashtag #hashtag"
            />
          </Field>

          <Field label="Call to action">
            <Input
              value={draft.cta}
              onChange={(e) => setDraft({ ...draft, cta: e.target.value })}
              onBlur={saveDraft}
            />
          </Field>

          {/* Video preview / generate button */}
          {latestVideo && latestVideo.status === "completed" && videoUrl && (
            <div className="rounded-2xl border border-fw-border bg-white p-4">
              <div className="flex items-center gap-2 pb-3">
                <Film className="h-4 w-4 text-fw-purple" />
                <span className="text-[14px] font-semibold text-fw-text">Your video</span>
                <Badge variant="success" className="ml-auto">via {latestVideo.provider}</Badge>
              </div>
              <video src={videoUrl} controls className="mx-auto aspect-[9/16] max-h-[400px] w-auto rounded-xl bg-black" />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <a href={videoUrl} download={`firewebz-${latestVideo.id}.mp4`}>
                    <Download className="h-4 w-4" /> Download
                  </a>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowFeedback(true)}>
                  <Star className="h-4 w-4" /> Rate this
                </Button>
                {businessId && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await addToCalendar({
                          businessId,
                          conceptId: concept.id,
                          generatedVideoId: latestVideo.id,
                          scheduledDate: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
                          platform: concept.platform,
                          status: "video_generated",
                        });
                        router.push("/calendar");
                      })
                    }
                  >
                    Add to calendar
                  </Button>
                )}
              </div>
            </div>
          )}

          {latestVideo?.status === "completed" && !videoUrl && (
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-fw-purpleSoft p-6 text-center">
              <Sparkles className="h-6 w-6 text-fw-purple" />
              <p className="text-[14px] font-semibold text-fw-text">Mock generation complete</p>
              <p className="text-[12px] text-fw-darkGray">Set up a real video provider in Settings to get an MP4.</p>
            </div>
          )}

          {latestVideo?.status === "failed" && (
            <div className="rounded-2xl bg-destructive/10 p-4 text-[13px] text-destructive">
              {latestVideo.errorMessage ?? "Generation failed"}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button onClick={generate} disabled={isPending} className="h-11 px-7">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
              {latestVideo ? "Regenerate video" : "Generate video"}
            </Button>
            {latestVideo?.status === "processing" && (
              <span className="flex items-center gap-2 text-[13px] text-fw-darkGray">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Working on it…
              </span>
            )}
          </div>
        </div>
      </div>

      {showFeedback && latestVideo && (
        <FeedbackModal videoId={latestVideo.id} onClose={() => setShowFeedback(false)} />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold uppercase tracking-wider text-fw-darkGray">{label}</span>
      {children}
    </div>
  );
}

function FeedbackModal({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  const router = useRouter();
  const [rating, setRating] = useState(4);
  const [wouldPost, setWouldPost] = useState<"yes" | "maybe" | "no">("maybe");
  const [reasons, setReasons] = useState<string[]>([]);
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
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-fw-darkGray">Rating</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} className="p-1">
                  <Star className={cn("h-6 w-6", n <= rating ? "fill-fw-yellow text-fw-yellow" : "text-fw-lightGray")} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-fw-darkGray">Would you post this?</p>
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

          {(wouldPost !== "yes" || rating < 4) && (
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-fw-darkGray">What's off?</p>
              <div className="flex flex-wrap gap-1.5">
                {REJECTION_REASONS.map((r) => {
                  const sel = reasons.includes(r);
                  return (
                    <button
                      key={r}
                      onClick={() => setReasons((rs) => (sel ? rs.filter((x) => x !== r) : [...rs, r]))}
                      className={cn(
                        "rounded-pill border px-3 py-1 text-[11px]",
                        sel ? "border-fw-purple bg-fw-purple text-white" : "border-fw-border bg-white text-fw-text"
                      )}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-fw-darkGray">Notes</p>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else?" rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await submitFeedback({ generatedVideoId: videoId, rating, wouldPost, rejectionReasons: reasons, notes });
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
