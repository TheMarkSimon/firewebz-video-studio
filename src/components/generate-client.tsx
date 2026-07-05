"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { generateSpinVideoFromSession, type SpinVideoGenerationResult } from "@/lib/actions/spinvideo";
import { SpinScrubber } from "@/components/spin-scrubber";
import { Loader2, Sparkles, Download, RotateCw, ChevronDown, ChevronUp, AlertCircle, CheckCircle } from "lucide-react";

export function GenerateClient({
  sessionId,
  frontPhotoUrl,
}: {
  sessionId: string;
  frontPhotoUrl: string | null;
}) {
  const [phase, setPhase] = useState<"preview" | "generating" | "result">("preview");
  const [result, setResult] = useState<SpinVideoGenerationResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function generate() {
    setError(null);
    setPhase("generating");
    startTransition(async () => {
      try {
        const res = await generateSpinVideoFromSession(sessionId);
        setResult(res);
        setPhase("result");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setPhase("preview");
      }
    });
  }

  const proxiedPhoto = frontPhotoUrl && !frontPhotoUrl.startsWith("data:")
    ? `/api/proxy?url=${encodeURIComponent(frontPhotoUrl)}`
    : frontPhotoUrl;

  return (
    <div className="mx-auto max-w-4xl pt-4 lg:pt-6">
      {phase === "preview" && (
        <PreviewPhase
          photoUrl={proxiedPhoto}
          onGenerate={generate}
          isPending={isPending}
          error={error}
        />
      )}
      {phase === "generating" && <GeneratingPhase />}
      {phase === "result" && result && (
        <ResultPhase
          photoUrl={proxiedPhoto}
          result={result}
          onRegenerate={generate}
          isPending={isPending}
        />
      )}
    </div>
  );
}

function PreviewPhase({
  photoUrl, onGenerate, isPending, error,
}: {
  photoUrl: string | null;
  onGenerate: () => void;
  isPending: boolean;
  error: string | null;
}) {
  return (
    <div>
      <h1 className="mb-2 text-[22px] font-bold text-fw-text">Ready to build your spin</h1>
      <p className="mb-6 text-[15px] text-fw-darkGray">One product photo · 360° spin video</p>

      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-fw-darkGray">Source photo</p>
        <div className="mt-3 max-w-[240px]">
          <div className="aspect-[3/4] overflow-hidden rounded-lg border border-fw-border bg-fw-disabled">
            {photoUrl ? (
              <img src={photoUrl} alt="front" className="h-full w-full object-contain p-2" />
            ) : (
              <div className="flex h-full items-center justify-center text-[11px] text-fw-lightGray">Not provided</div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-[13px] text-destructive">{error}</div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button onClick={onGenerate} disabled={isPending} className="h-11 px-8">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Build spin
        </Button>
        <span className="text-[12px] text-fw-lightGray">Usually 2-3 minutes.</span>
      </div>
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
      <p className="mt-6 text-[16px] font-semibold text-fw-text">Building your 360° spin…</p>
      <p className="mt-1 text-[12px] text-fw-lightGray">Kling v3 Pro takes 2-3 minutes.</p>
    </div>
  );
}

function ResultPhase({
  photoUrl, result, onRegenerate, isPending,
}: {
  photoUrl: string | null;
  result: SpinVideoGenerationResult;
  onRegenerate: () => void;
  isPending: boolean;
}) {
  const succeeded = result.status === "completed" && !!result.videoUrl;
  const proxiedVideo = result.videoUrl ? `/api/proxy?url=${encodeURIComponent(result.videoUrl)}` : undefined;

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <h1 className="text-[22px] font-bold text-fw-text">
          {succeeded ? "Your 360° spin is ready" : "Generation failed"}
        </h1>
        <Button variant="outline" onClick={onRegenerate} disabled={isPending} className="h-10 px-5 text-[13px]">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
          Regenerate
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
          {succeeded && proxiedVideo ? (
            <>
              <SpinScrubber
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
                {result.errorMessage ?? "The video provider didn't return an MP4. See diagnostics below."}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-fw-darkGray">Source photo</p>
          <div className="mt-3 aspect-[3/4] overflow-hidden rounded-lg border border-fw-border bg-fw-disabled">
            {photoUrl ? (
              <img src={photoUrl} alt="front" className="h-full w-full object-contain p-2" />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-fw-lightGray">—</div>
            )}
          </div>
        </div>
      </div>

      <DiagnosticsPanel result={result} />
    </div>
  );
}

function DiagnosticsPanel({ result }: { result: SpinVideoGenerationResult }) {
  const [open, setOpen] = useState(false);
  const d = result.diagnostics;
  const fmtMs = (ms?: number) => (ms == null ? "—" : ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`);
  const ok: "ok" | "fail" = result.status === "completed" ? "ok" : "fail";

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
          <DiagRow label="Provider" value={d.provider} ok="ok" />
          {d.modelUsed && <DiagRow label="Model" value={d.modelUsed} ok="ok" />}
          <DiagRow label="Duration" value={fmtMs(d.durationMs)} ok="ok" />
          <DiagRow label="Front photo" value={d.frontPhotoPresent ? "✓ provided" : "— missing"} ok={d.frontPhotoPresent ? "ok" : "fail"} />
          <DiagRow label="Status" value={result.status.toUpperCase()} ok={ok} />
          {result.videoUrl && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-fw-darkGray">Video URL</div>
              <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-[11px] leading-relaxed break-all">{result.videoUrl}</pre>
            </div>
          )}
          {result.errorMessage && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-fw-darkGray">Error</div>
              <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-destructive/10 p-3 text-[11px] leading-relaxed text-destructive">{result.errorMessage}</pre>
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
