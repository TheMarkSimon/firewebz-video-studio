"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, X, RotateCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { removeBackgroundServerSide } from "@/lib/actions/remove-bg";

export type SlotKind = "front" | "back" | "left" | "right";

export type PhotoSlotStatus =
  | "empty"
  | "processing"
  | "ready"       // background removed successfully
  | "failed";     // background removal errored — user must retry

interface PhotoSlotProps {
  label: string;
  kind: SlotKind;
  required?: boolean;
  value: string | null;              // data URL of the cleaned image (only set when status="ready")
  rawValue: string | null;           // data URL of the raw uploaded image (for preview during processing)
  status: PhotoSlotStatus;
  errorMessage: string | null;
  onChange: (raw: string | null, processed: string | null, status: PhotoSlotStatus, errorMessage: string | null) => void;
}

// A single upload slot with a dashed silhouette placeholder + fail-loudly background removal.
// The processed data URL is only set when bg removal *succeeds*. On failure we surface a
// clear error and the parent form is expected to gate submission on status="ready".
export function PhotoSlot({ label, kind, required, value, rawValue, status, errorMessage, onChange }: PhotoSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploadError(null);
    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file.");
      return;
    }
    if (file.size > 8_000_000) {
      setUploadError("Please upload an image under 8 MB.");
      return;
    }

    const rawUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Show the raw immediately, mark processing, then attempt bg removal.
    onChange(rawUrl, null, "processing", null);
    try {
      const res = await removeBackgroundServerSide(rawUrl);
      if (res.status === "completed" && res.cleanedDataUrl) {
        onChange(rawUrl, res.cleanedDataUrl, "ready", null);
      } else {
        // Fail loudly — do NOT set processed. Parent gates Generate on status="ready".
        onChange(rawUrl, null, "failed", res.errorMessage ?? "Background removal failed. Try a different photo.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Background removal failed. Try a different photo.";
      onChange(rawUrl, null, "failed", msg);
    }
  }

  function clear() {
    setUploadError(null);
    onChange(null, null, "empty", null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const previewSrc = value ?? rawValue;
  const showingImage = Boolean(previewSrc);
  const isProcessing = status === "processing";
  const isFailed = status === "failed";
  const isReady = status === "ready";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[13px]">
        <span className="font-semibold text-fw-text">{label}</span>
        {required ? (
          <span className="rounded-full bg-fw-purple/10 px-2 py-0.5 text-[10px] font-semibold text-fw-purple">Required</span>
        ) : (
          <span className="rounded-full bg-fw-lighterGray/30 px-2 py-0.5 text-[10px] font-semibold text-fw-darkGray">Optional</span>
        )}
        {isReady && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
            <CheckCircle2 className="h-3 w-3" /> Clean
          </span>
        )}
        {isFailed && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-destructive">
            <AlertCircle className="h-3 w-3" /> Retry
          </span>
        )}
      </div>

      <label
        className={cn(
          "relative flex aspect-[3/4] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all",
          !showingImage && "border-fw-lighterGray bg-fw-page hover:border-fw-purple/50 hover:bg-fw-purpleSoft/40",
          isProcessing && "border-fw-purple bg-white opacity-90",
          isReady && "border-emerald-400 bg-white",
          isFailed && "border-destructive bg-white",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />

        {!showingImage && (
          <>
            <SilhouettePlaceholder kind={kind} />
            <div className="mt-3 flex items-center gap-1.5 text-[12px] text-fw-darkGray">
              <Upload className="h-3.5 w-3.5" />
              Click to upload
            </div>
          </>
        )}

        {showingImage && (
          <img
            src={previewSrc ?? ""}
            alt={label}
            className="h-full w-full object-contain p-4"
            style={{
              backgroundImage:
                "linear-gradient(45deg, #f5f5f7 25%, transparent 25%), linear-gradient(-45deg, #f5f5f7 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f5f5f7 75%), linear-gradient(-45deg, transparent 75%, #f5f5f7 75%)",
              backgroundSize: "16px 16px",
              backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
            }}
          />
        )}

        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-fw-purple" />
              <span className="text-[11px] text-fw-darkGray">Removing background…</span>
            </div>
          </div>
        )}
      </label>

      {showingImage && !isProcessing && (
        <div className="flex items-center justify-between text-[11px]">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1 text-fw-darkGray hover:text-fw-purple"
          >
            <RotateCw className="h-3 w-3" /> Replace
          </button>
          <button
            type="button"
            onClick={clear}
            className="flex items-center gap-1 text-fw-darkGray hover:text-destructive"
          >
            <X className="h-3 w-3" /> Remove
          </button>
        </div>
      )}

      {uploadError && <p className="text-[11px] text-destructive">{uploadError}</p>}
      {isFailed && errorMessage && (
        <p className="text-[11px] text-destructive leading-snug">
          <strong>Background removal failed.</strong> {errorMessage} Try a different photo — ideally with a plain, well-lit background.
        </p>
      )}
    </div>
  );
}

function SilhouettePlaceholder({ kind }: { kind: SlotKind }) {
  const arrow = { front: "↑", back: "↓", left: "→", right: "←" }[kind];
  return (
    <div className="flex flex-col items-center gap-2 opacity-40">
      <svg viewBox="0 0 80 100" className="h-16 w-14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="12" y="12" width="56" height="76" rx="8" stroke="#8B8DA0" strokeWidth="1.5" strokeDasharray="4 4" />
        <text x="40" y="58" textAnchor="middle" fontSize="24" fill="#8B8DA0" fontWeight="600">
          {arrow}
        </text>
      </svg>
    </div>
  );
}
