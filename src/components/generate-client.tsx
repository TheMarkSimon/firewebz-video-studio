"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  startSpinGeneration,
  getSpinGenerationStatus,
  type SpinStatusPayload,
} from "@/lib/actions/spinvideo";
import { pushSpinToShopify } from "@/lib/actions/shopify";
import { SpinScrubber } from "@/components/spin-scrubber";
import {
  Loader2,
  Sparkles,
  Download,
  RotateCw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Copy,
  ExternalLink,
  Mail,
  Store,
} from "lucide-react";

export type ShopifyPushInfo = {
  pushed: boolean;
  shopDomain: string;
  productHandle: string | null;
};

export type SessionPhotos = {
  front: string | null;
  back: string | null;
  left: string | null;
  right: string | null;
};

const POLL_MS = 5000;

export function GenerateClient({
  spinId,
  photos,
  initial,
  autoStart = false,
  shopifyPush = null,
}: {
  spinId: string;
  photos: SessionPhotos;
  initial: SpinStatusPayload;
  autoStart?: boolean;
  shopifyPush?: ShopifyPushInfo | null;
}) {
  // The payload IS the state machine: draft → preview, generating → progress
  // (poll until terminal), ready/failed → result. A ready row renders
  // instantly with no click, no cost, no wait — that's what makes reopening
  // the page (or the emailed link) free forever.
  const [payload, setPayload] = useState<SpinStatusPayload>(initial);
  const [isPending, startTransition] = useTransition();
  const [startError, setStartError] = useState<string | null>(null);
  // Action continuity from onboarding: the user already clicked "Generate my
  // spin" there, so start immediately — no preview, no second click. Shows
  // the progress screen from the very first frame.
  const [autoStarting, setAutoStarting] = useState(autoStart && initial.status === "draft");
  useEffect(() => {
    if (autoStarting) generate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll while a generation is in flight. Sequential setTimeout chain (not
  // setInterval): a poll that lands right at completion runs frame
  // extraction server-side and can take ~30s — never overlap calls.
  useEffect(() => {
    if (payload.status !== "generating") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const next = await getSpinGenerationStatus(spinId);
        if (cancelled) return;
        setPayload(next);
        if (next.status === "generating") timer = setTimeout(tick, POLL_MS);
      } catch {
        // Transient — keep polling.
        if (!cancelled) timer = setTimeout(tick, POLL_MS * 2);
      }
    };
    timer = setTimeout(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload.status, spinId]);

  function generate(force = false) {
    setStartError(null);
    startTransition(async () => {
      try {
        setPayload(await startSpinGeneration(spinId, { force }));
      } catch (e) {
        setStartError(e instanceof Error ? e.message : String(e));
      } finally {
        setAutoStarting(false);
      }
    });
  }

  // Proxy every remote photo through our domain (Zscaler-safe).
  const proxied = (u: string | null) =>
    u && !u.startsWith("data:") ? `/api/proxy?url=${encodeURIComponent(u)}` : u;
  const proxiedPhotos: SessionPhotos = {
    front: proxied(photos.front),
    back: proxied(photos.back),
    left: proxied(photos.left),
    right: proxied(photos.right),
  };

  // isPending covers the submit round-trip (and the whole run for the sync
  // Kling fallback) so the progress screen shows before the row flips.
  const showGenerating =
    payload.status === "generating" || ((isPending || autoStarting) && !startError);
  const showResult = !showGenerating && (payload.status === "ready" || payload.status === "failed");

  return (
    <div className="mx-auto max-w-5xl px-4 pt-4 lg:pt-6">
      {!showGenerating && !showResult && (
        <PreviewPhase
          spinId={spinId}
          photos={proxiedPhotos}
          onGenerate={() => generate(false)}
          isPending={isPending}
          error={startError}
        />
      )}
      {showGenerating && (
        <GeneratingPhase
          startedAtMs={payload.status === "generating" ? payload.startedAtMs : undefined}
          emailNotify={payload.emailNotify}
        />
      )}
      {showResult && (
        <ResultPhase
          spinId={spinId}
          photos={proxiedPhotos}
          payload={payload}
          onRegenerate={() => generate(true)}
          isPending={isPending}
          shopifyPush={shopifyPush}
        />
      )}
    </div>
  );
}

function PreviewPhase({
  spinId, photos, onGenerate, isPending, error,
}: {
  spinId: string;
  photos: SessionPhotos;
  onGenerate: () => void;
  isPending: boolean;
  error: string | null;
}) {
  const provided = (["front", "back", "left", "right"] as const).filter((k) => photos[k]);
  return (
    <div>
      <h1 className="mb-2 font-display text-[28px] font-bold text-fw-text">
        Ready to build your 360° spin
      </h1>
      <p className="mb-6 text-[15px] text-fw-darkGray">
        {provided.length > 1
          ? `Using ${provided.length} angles — the spin stays true to your product all the way around.`
          : "We'll turn this photo into a full 360° rotation your shoppers can drag."}
      </p>

      <div className="rounded-2xl border border-fw-border bg-white p-6">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-fw-darkGray">
          {provided.length > 1 ? `Source photos (${provided.length})` : "Source photo"}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          {provided.map((k) => (
            <div key={k} className="flex flex-col gap-1.5">
              <div className="aspect-[3/4] overflow-hidden rounded-lg border border-fw-border bg-fw-disabled">
                <img src={photos[k]!} alt={`Product ${k} view`} className="h-full w-full object-contain p-2" />
              </div>
              <span className="text-center text-[11px] capitalize text-fw-darkGray">{k}</span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-[13px] text-destructive">{error}</div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={onGenerate} disabled={isPending} className="h-11 px-8">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Build my spin
        </Button>
        <a
          href={`/onboarding?spin=${spinId}`}
          className="text-[13px] font-semibold text-fw-darkGray underline-offset-4 hover:underline"
        >
          Edit photos
        </a>
        <span className="text-[12px] text-fw-lightGray">Usually 2-3 minutes.</span>
      </div>
    </div>
  );
}

function GeneratingPhase({
  startedAtMs,
  emailNotify,
}: {
  startedAtMs?: number;
  emailNotify?: boolean;
}) {
  // Generation runs server-side (fal queue), so progress is time-driven on
  // the client: an asymptotic curve that always advances and never stalls,
  // capped at 97% until the poll flips the status. Anchored to the real
  // submit time so a reopened tab resumes mid-bar instead of restarting at 0.
  const anchorRef = useRef<number>(startedAtMs ?? Date.now());
  if (startedAtMs && anchorRef.current !== startedAtMs) anchorRef.current = startedAtMs;

  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      const t = Math.max(0, (Date.now() - anchorRef.current) / 1000);
      setProgress(Math.min(97, 97 * (1 - Math.exp(-t / 75))));
    }, 150);
    return () => clearInterval(id);
  }, []);

  const stage =
    progress < 12 ? "Uploading your photos…" :
    progress < 50 ? "Generating the 360° rotation…" :
    progress < 85 ? "Rendering studio lighting and textures…" :
    "Almost there — slicing frames for instant scrubbing…";

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-full max-w-md">
        <div className="flex items-end justify-between">
          <p className="text-[18px] font-semibold text-fw-text">Building your 360° spin</p>
          <span className="font-display text-[22px] font-bold text-fw-text">{Math.floor(progress)}%</span>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-fw-disabled">
          <div
            className="h-full rounded-full bg-fw-purple transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-[13px] text-fw-darkGray">{stage}</p>
        {emailNotify ? (
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-fw-disabled px-4 py-2 text-[12px] text-fw-darkGray">
            <Mail className="h-3.5 w-3.5" />
            Feel free to close this tab — we&apos;ll email you when it&apos;s ready.
          </p>
        ) : (
          <p className="mt-1 text-[12px] text-fw-lightGray">Usually 2–3 minutes. Keep this tab open.</p>
        )}
      </div>
    </div>
  );
}

function ResultPhase({
  spinId, photos, payload, onRegenerate, isPending, shopifyPush,
}: {
  spinId: string;
  photos: SessionPhotos;
  payload: SpinStatusPayload;
  onRegenerate: () => void;
  isPending: boolean;
  shopifyPush: ShopifyPushInfo | null;
}) {
  const succeeded = payload.status === "ready" && !!payload.videoUrl;
  const proxiedVideo = payload.videoUrl ? `/api/proxy?url=${encodeURIComponent(payload.videoUrl)}` : undefined;
  const proxiedFrames = payload.frameUrls?.map((u) => `/api/proxy?url=${encodeURIComponent(u)}`);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-bold text-fw-text md:text-[32px]">
            {succeeded ? "Your 360° spin is live." : "Generation failed"}
          </h1>
          {succeeded && (
            <p className="mt-1 text-[15px] text-fw-darkGray">
              Drag it below to test. Then copy the snippet to embed it on your storefront.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="h-10 px-5 text-[13px]">
            <a href={`/onboarding?spin=${spinId}`}>Edit photos</a>
          </Button>
          <Button variant="outline" onClick={onRegenerate} disabled={isPending} className="h-10 px-5 text-[13px]">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
            {succeeded ? "Regenerate" : "Try again"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl border border-fw-border bg-white p-4">
          {succeeded && proxiedVideo ? (
            <>
              <SpinScrubber
                frameUrls={proxiedFrames}
                videoUrl={proxiedVideo}
                className="h-[520px] w-full rounded-lg bg-[#f8f7ff]"
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button asChild variant="outline" className="h-9 px-4 text-[13px]">
                  <a href={proxiedVideo} download="spinr-spin.mp4">
                    <Download className="h-4 w-4" /> Download MP4
                  </a>
                </Button>
                <span className="text-[12px] text-fw-lightGray">Drag left/right to spin</span>
              </div>
            </>
          ) : (
            <div className="flex h-[520px] flex-col items-center justify-center rounded-lg bg-destructive/5 p-6 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="mt-3 text-[14px] font-semibold text-fw-text">Generation failed</p>
              <p className="mt-1 max-w-md text-[12px] text-fw-darkGray">
                {payload.errorMessage ?? "The video provider didn't return an MP4. See diagnostics below."}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <SourcePhotosCard photos={photos} />
          {succeeded && shopifyPush && <PushToStoreCard spinId={spinId} info={shopifyPush} />}
          {succeeded && <EmbedCard spinId={spinId} />}
        </div>
      </div>

      {succeeded && <NextStepsCard spinId={spinId} />}

      <DiagnosticsPanel payload={payload} />
    </div>
  );
}

function SourcePhotosCard({ photos }: { photos: SessionPhotos }) {
  const provided = (["front", "back", "left", "right"] as const).filter((k) => photos[k]);
  return (
    <div className="rounded-2xl border border-fw-border bg-white p-4">
      <p className="text-[13px] font-semibold uppercase tracking-wider text-fw-darkGray">
        {provided.length > 1 ? `Source photos (${provided.length})` : "Source photo"}
      </p>
      <div className={`mt-3 grid gap-2 ${provided.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {provided.length > 0 ? provided.map((k) => (
          <div key={k} className="flex flex-col gap-1">
            <div className="aspect-[3/4] overflow-hidden rounded-lg border border-fw-border bg-fw-disabled">
              <img src={photos[k]!} alt={`Product ${k}`} className="h-full w-full object-contain p-1.5" />
            </div>
            <span className="text-center text-[10px] capitalize text-fw-darkGray">{k}</span>
          </div>
        )) : (
          <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-fw-border bg-fw-disabled text-[10px] text-fw-lightGray">—</div>
        )}
      </div>
    </div>
  );
}

// One-click embed for spins imported from a Shopify product: writes the
// custom.spinr_id metafield the merchant's storefront block reads.
function PushToStoreCard({ spinId, info }: { spinId: string; info: ShopifyPushInfo }) {
  const [isPending, startTransition] = useTransition();
  const [pushed, setPushed] = useState(info.pushed);
  const [error, setError] = useState<string | null>(null);

  function push() {
    setError(null);
    startTransition(async () => {
      const res = await pushSpinToShopify(spinId);
      if (res.ok) setPushed(true);
      else setError(res.error ?? "Push failed — try again.");
    });
  }

  const productUrl = info.productHandle
    ? `https://${info.shopDomain}/products/${info.productHandle}`
    : null;

  return (
    <div className="rounded-2xl border border-fw-border bg-white p-4">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-fw-text">
        <Store className="h-3.5 w-3.5" /> Your Shopify product
      </p>
      <p className="mt-2 text-[13px] leading-[20px] text-fw-darkGray">
        {pushed
          ? "This spin is live on the product. Pushing again just refreshes it."
          : "One click puts this spin on the product page — no copy-paste."}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={push} disabled={isPending} className="h-9 px-4 text-[12px]">
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : pushed ? <CheckCircle className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}
          {isPending ? "Pushing…" : pushed ? "On your store — push again" : "Push to store"}
        </Button>
        {pushed && productUrl && (
          <a
            href={productUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[12px] font-semibold text-fw-darkGray underline-offset-4 hover:underline"
          >
            View product
          </a>
        )}
      </div>
      {error && <p className="mt-2 text-[11px] leading-snug text-destructive">{error}</p>}
    </div>
  );
}

function EmbedCard({ spinId }: { spinId: string }) {
  const [copied, setCopied] = useState<null | "snippet" | "link">(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const embedLink = `${origin}/embed/${spinId}`;
  const snippet =
    `<div data-spinr="${spinId}" style="height:520px;max-width:640px;margin:0 auto"></div>\n` +
    `<script src="${origin}/embed/spin.js" defer></script>`;

  function copy(text: string, kind: "snippet" | "link") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div className="rounded-2xl border border-fw-purple/30 bg-gradient-to-br from-fw-purpleSoft/50 to-white p-4">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-fw-text">
        <Sparkles className="h-3.5 w-3.5" /> Ship it to Shopify
      </p>
      <p className="mt-2 text-[13px] leading-[20px] text-fw-text">
        Paste this into any Shopify product page (or any HTML page). One line — done.
      </p>
      <pre className="mt-3 max-h-40 overflow-auto rounded-lg border border-fw-border bg-white p-3 text-[11px] leading-[16px] text-fw-text whitespace-pre-wrap break-all">
{snippet}
      </pre>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          onClick={() => copy(snippet, "snippet")}
          className="h-9 px-3 text-[12px]"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied === "snippet" ? "Copied!" : "Copy snippet"}
        </Button>
        <Button
          onClick={() => copy(embedLink, "link")}
          variant="outline"
          className="h-9 px-3 text-[12px]"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {copied === "link" ? "Copied!" : "Copy link"}
        </Button>
      </div>
    </div>
  );
}

function NextStepsCard({ spinId }: { spinId: string }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <div className="mt-8 rounded-2xl border border-fw-border bg-white p-6">
      <h2 className="text-[18px] font-bold text-fw-text">How to put this on your Shopify page</h2>
      <ol className="mt-4 space-y-3 text-[13px] leading-[20px] text-fw-text">
        <Step n={1}>
          In your Shopify admin, open the product you want to add the spin to.
        </Step>
        <Step n={2}>
          Edit the product description and switch to <strong>HTML view</strong> (the <code>&lt;/&gt;</code> icon).
        </Step>
        <Step n={3}>
          Paste the snippet from the card above wherever you want the spin to appear.
        </Step>
        <Step n={4}>
          Save. Preview the storefront page — shoppers can now drag your product to spin it.
        </Step>
      </ol>
      <p className="mt-4 text-[12px] text-fw-lightGray">
        Prefer a direct link? <a className="font-medium text-fw-text underline hover:opacity-60" href={`/embed/${spinId}`} target="_blank" rel="noreferrer">Open the spin standalone at {origin}/embed/{spinId}</a>
      </p>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fw-purpleSoft text-[11px] font-bold text-fw-purple">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

function DiagnosticsPanel({ payload }: { payload: SpinStatusPayload }) {
  const [open, setOpen] = useState(false);
  const fmtMs = (ms?: number) => (ms == null ? "—" : ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`);
  const ok: "ok" | "fail" = payload.status === "ready" ? "ok" : "fail";

  return (
    <div className="mt-8 rounded-2xl border border-fw-border bg-fw-disabled/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-left text-[13px] font-semibold text-fw-text"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-fw-purple" />
          Show diagnostics
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="space-y-3 border-t border-fw-border px-5 py-4 text-[12px] text-fw-text">
          <DiagRow label="Provider" value={payload.provider} ok="ok" />
          {payload.modelUsed && <DiagRow label="Model" value={payload.modelUsed} ok="ok" />}
          <DiagRow label="Duration" value={fmtMs(payload.durationMs)} ok="ok" />
          <DiagRow label="Cached" value={payload.cached ? "✓ served from cache (free)" : "fresh generation"} ok="ok" />
          <DiagRow label="Status" value={payload.status.toUpperCase()} ok={ok} />
          {payload.videoUrl && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-fw-darkGray">Video URL</div>
              <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-[11px] leading-relaxed break-all">{payload.videoUrl}</pre>
            </div>
          )}
          {payload.errorMessage && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-fw-darkGray">Error</div>
              <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-destructive/10 p-3 text-[11px] leading-relaxed text-destructive">{payload.errorMessage}</pre>
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
