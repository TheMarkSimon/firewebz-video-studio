"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, X, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { removeBackgroundServerSide } from "@/lib/actions/remove-bg";

export type SlotKind = "front" | "back" | "left" | "right";

interface PhotoSlotProps {
  label: string;
  kind: SlotKind;
  required?: boolean;
  value: string | null;              // data URL of the CURRENT (background-removed) image
  rawValue: string | null;           // data URL of the raw uploaded image
  onChange: (raw: string | null, processed: string | null) => void;
  processing: boolean;
}

// A single upload slot with a dashed silhouette placeholder + background-removal.
export function PhotoSlot({ label, kind, required, value, rawValue, onChange, processing }: PhotoSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localProcessing, setLocalProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }
    if (file.size > 8_000_000) {
      setError("Please upload an image under 8 MB.");
      return;
    }

    // Read raw file to data URL
    const rawUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    // Immediately show the raw image, kick off background removal async
    onChange(rawUrl, rawUrl);
    setLocalProcessing(true);
    try {
      const res = await removeBackgroundServerSide(rawUrl);
      if (res.status === "completed" && res.cleanedDataUrl) {
        onChange(rawUrl, res.cleanedDataUrl);
      } else {
        console.warn("[photo-slot] background removal failed, using raw image:", res.errorMessage);
        setError("Background removal failed — using the original image.");
        onChange(rawUrl, rawUrl);
      }
    } catch (err) {
      console.error("[photo-slot] background removal failed:", err);
      setError("Background removal failed — using the original image.");
      onChange(rawUrl, rawUrl);
    } finally {
      setLocalProcessing(false);
    }
  }

  function clear() {
    setError(null);
    onChange(null, null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const showingImage = value || rawValue;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[13px]">
        <span className="font-semibold text-fw-text">{label}</span>
        {required ? (
          <span className="rounded-full bg-fw-purple/10 px-2 py-0.5 text-[10px] font-semibold text-fw-purple">Required</span>
        ) : (
          <span className="rounded-full bg-fw-lighterGray/30 px-2 py-0.5 text-[10px] font-semibold text-fw-darkGray">Optional</span>
        )}
      </div>

      <label
        className={cn(
          "relative flex aspect-[3/4] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all",
          showingImage ? "border-fw-purple bg-white" : "border-fw-lighterGray bg-fw-page hover:border-fw-purple/50 hover:bg-fw-purpleSoft/40",
          (processing || localProcessing) && "opacity-90"
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
            {/* Generic silhouette placeholder */}
            <SilhouettePlaceholder kind={kind} />
            <div className="mt-3 flex items-center gap-1.5 text-[12px] text-fw-darkGray">
              <Upload className="h-3.5 w-3.5" />
              Click to upload
            </div>
          </>
        )}

        {showingImage && (
          <img
            src={value ?? rawValue ?? ""}
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

        {(processing || localProcessing) && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-fw-purple" />
              <span className="text-[11px] text-fw-darkGray">Removing background…</span>
            </div>
          </div>
        )}
      </label>

      {showingImage && !localProcessing && (
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

      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

// Very simple generic silhouettes — a rounded rectangle with a directional
// arrow / label to indicate which angle goes here. Not category-specific yet.
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
