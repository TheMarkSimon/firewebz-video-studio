"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { generateMesh3dFromSession, type Mesh3dGenerationResult } from "@/lib/actions/mesh3d";
import { Loader2, Sparkles, Download, RotateCw, ChevronDown, ChevronUp, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Load Google's model-viewer as a client-side side effect (registers the
// <model-viewer> custom element). Bail silently on the server.
if (typeof window !== "undefined") {
  import("@google/model-viewer").catch(() => {});
}

// Ambient type so TSX accepts <model-viewer /> tags
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          "auto-rotate"?: boolean;
          "camera-controls"?: boolean;
          "shadow-intensity"?: string | number;
          exposure?: string | number;
          "environment-image"?: string;
          poster?: string;
          "auto-rotate-delay"?: string | number;
          "camera-orbit"?: string;
          "min-camera-orbit"?: string;
          "max-camera-orbit"?: string;
          "interaction-prompt"?: string;
          "disable-zoom"?: boolean;
          "disable-pan"?: boolean;
        },
        HTMLElement
      >;
    }
  }
}

type Photos = { front: string | null; back: string | null; left: string | null; right: string | null };

export function GenerateClient({
  sessionId,
  businessName,
  category,
  photos,
}: {
  sessionId: string;
  businessName: string;
  category: string;
  photos: Photos;
}) {
  const [phase, setPhase] = useState<"preview" | "generating" | "result">("preview");
  const [result, setResult] = useState<Mesh3dGenerationResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function generate() {
    setError(null);
    setPhase("generating");
    startTransition(async () => {
      try {
        const res = await generateMesh3dFromSession(sessionId);
        setResult(res);
        setPhase("result");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setPhase("preview");
      }
    });
  }

  const photoCount = [photos.front, photos.back, photos.left, photos.right].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-4xl pt-4 lg:pt-6">
      {phase === "preview" && (
        <PreviewPhase
          businessName={businessName}
          category={category}
          photos={photos}
          photoCount={photoCount}
          onGenerate={generate}
          isPending={isPending}
          error={error}
        />
      )}

      {phase === "generating" && <GeneratingPhase photoCount={photoCount} />}

      {phase === "result" && result && (
        <ResultPhase
          businessName={businessName}
          category={category}
          photos={photos}
          result={result}
          onRegenerate={generate}
          isPending={isPending}
        />
      )}
    </div>
  );
}

function PreviewPhase({
  businessName, category, photos, photoCount, onGenerate, isPending, error,
}: {
  businessName: string;
  category: string;
  photos: Photos;
  photoCount: number;
  onGenerate: () => void;
  isPending: boolean;
  error: string | null;
}) {
  return (
    <div>
      <h1 className="mb-2 text-[22px] font-bold text-fw-text">Ready to build your 3D view</h1>
      <p className="mb-6 text-[15px] text-fw-darkGray">
        {businessName} · {category} · {photoCount} photo{photoCount === 1 ? "" : "s"}
      </p>

      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-fw-darkGray">Photos we'll use</p>
        <div className="mt-3 grid grid-cols-4 gap-3">
          {(["front", "back", "left", "right"] as const).map((k) => {
            const url = photos[k];
            return (
              <div key={k} className="flex flex-col gap-1.5">
                <div className="aspect-[3/4] overflow-hidden rounded-lg border border-fw-border bg-fw-disabled">
                  {url ? (
                    <img src={url} alt={k} className="h-full w-full object-contain p-2" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-fw-lightGray">Not provided</div>
                  )}
                </div>
                <span className="text-center text-[11px] capitalize text-fw-darkGray">{k}</span>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-[13px] text-destructive">{error}</div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <Button onClick={onGenerate} disabled={isPending} className="h-11 px-8">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Build 3D view
        </Button>
        <span className="text-[12px] text-fw-lightGray">Usually 30-90 seconds.</span>
      </div>
    </div>
  );
}

function GeneratingPhase({ photoCount }: { photoCount: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-fw-purpleSoft" />
        <Loader2 className="h-10 w-10 animate-spin text-fw-purple" />
      </div>
      <p className="mt-6 text-[16px] font-semibold text-fw-text">Building your 3D view…</p>
      <p className="mt-1 text-[13px] text-fw-darkGray">Reconstructing geometry from {photoCount} photos.</p>
      <p className="mt-1 text-[12px] text-fw-lightGray">Usually 30-90 seconds. Larger objects can take longer.</p>
    </div>
  );
}

function ResultPhase({
  businessName, category, photos, result, onRegenerate, isPending,
}: {
  businessName: string;
  category: string;
  photos: Photos;
  result: Mesh3dGenerationResult;
  onRegenerate: () => void;
  isPending: boolean;
}) {
  const viewerRef = useRef<HTMLElement | null>(null);
  const succeeded = result.status === "completed" && !!result.glbUrl;

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-fw-text">
            {succeeded ? "Your 3D view is ready" : "Generation failed"}
          </h1>
          <p className="text-[14px] text-fw-darkGray">{businessName} · {category}</p>
        </div>
        <Button variant="outline" onClick={onRegenerate} disabled={isPending} className="h-10 px-5 text-[13px]">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
          Regenerate
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Left: 3D viewer */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
          {succeeded && result.glbUrl ? (
            <>
              {/*
                Camera setup:
                  - camera-orbit "theta phi radius" — initial view: rotated 0deg, tilted 15deg down (phi=75deg), auto-fit radius
                  - Locking vertical rotation: min-camera-orbit and max-camera-orbit both pin phi at 75deg, so the user can't
                    flip the product upside down or look underneath it. Horizontal (theta) is left fully free with 'auto'
                    on the min/max so 360deg spin works both ways.
                  - Disable pan and zoom to keep the interaction to a pure product spin.
              */}
              <model-viewer
                ref={(el) => { viewerRef.current = el; }}
                src={result.glbUrl}
                alt={`3D view of ${businessName} product`}
                camera-controls
                auto-rotate
                disable-pan
                disable-zoom
                camera-orbit="0deg 75deg auto"
                min-camera-orbit="auto 75deg auto"
                max-camera-orbit="auto 75deg auto"
                interaction-prompt="none"
                shadow-intensity="1"
                exposure="1"
                style={{ width: "100%", height: "520px", background: "#f8f7ff", borderRadius: "12px" }}
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button asChild variant="outline" className="h-9 px-4 text-[13px]">
                  <a href={result.glbUrl} download={`firewebz-${businessName.replace(/\s+/g, "-")}.glb`}>
                    <Download className="h-4 w-4" /> Download GLB
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
                {result.errorMessage ?? "The 3D provider didn't return a model. See diagnostics below for details."}
              </p>
            </div>
          )}
        </div>

        {/* Right: source photos */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-fw-darkGray">Source photos</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {(["front", "back", "left", "right"] as const).map((k) => {
              const url = photos[k];
              return (
                <div key={k} className="flex flex-col gap-1.5">
                  <div className="aspect-[3/4] overflow-hidden rounded-lg border border-fw-border bg-fw-disabled">
                    {url ? (
                      <img src={url} alt={k} className="h-full w-full object-contain p-2" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-fw-lightGray">—</div>
                    )}
                  </div>
                  <span className="text-center text-[10px] capitalize text-fw-darkGray">{k}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <DiagnosticsPanel result={result} />
    </div>
  );
}

function DiagnosticsPanel({ result }: { result: Mesh3dGenerationResult }) {
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
          <DiagRow label="Photos sent" value={`${d.photoCount} (front:${d.photosUsed.front ? "✓" : "—"} back:${d.photosUsed.back ? "✓" : "—"} left:${d.photosUsed.left ? "✓" : "—"} right:${d.photosUsed.right ? "✓" : "—"})`} ok="ok" />
          <DiagRow label="Status" value={result.status.toUpperCase()} ok={ok} />
          {result.glbUrl && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-fw-darkGray">GLB URL</div>
              <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-[11px] leading-relaxed break-all">{result.glbUrl}</pre>
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

// Suppress unused import warning
export const _unused = useEffect;
