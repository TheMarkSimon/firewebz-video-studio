"use client";

import { useEffect, useRef, useState } from "react";

// Horizontal drag-to-spin widget.
//
// Preferred mode: HYBRID — the raw MP4 plays on loop while idle (native
// 24-30fps smoothness, the same file fal renders), and the instant the
// shopper grabs it we swap to a canvas flipbook over the pre-decoded frames
// at the matching angle (instant scrubbing, no video decode on the
// interaction path). On release the video resumes from that same angle.
// Kill switch: NEXT_PUBLIC_DISABLE_HYBRID=1 (build-time env) reverts to the
// frames-only flipbook without a code change.
//
// Degradations, in order: video missing/fails → frames-only flipbook;
// frames missing → <video> currentTime scrubbing (laggy on iOS, acceptable
// on desktop); neither → placeholder.
//
// Vertical drag is intentionally ignored (rotation only). Same props
// whichever mode ends up active.

interface SpinScrubberProps {
  frameUrls?: string[];          // JPEG frame sequence (drag surface)
  videoUrl?: string;             // MP4 (idle surface / scrub fallback)
  className?: string;
  pixelsPerRevolution?: number;  // default = container width
  autoRotate?: boolean;
  autoRotateSpeed?: number;      // revolutions per second when idle
}

export function SpinScrubber(props: SpinScrubberProps) {
  const hybridDisabled = process.env.NEXT_PUBLIC_DISABLE_HYBRID === "1";
  const hasFrames = Boolean(props.frameUrls && props.frameUrls.length > 1);
  if (hasFrames && props.videoUrl && !hybridDisabled) {
    return <HybridSpin {...props} frameUrls={props.frameUrls!} videoUrl={props.videoUrl} />;
  }
  if (hasFrames) {
    return <CanvasFlipbook {...props} frameUrls={props.frameUrls!} />;
  }
  if (props.videoUrl) {
    return <VideoScrubber {...props} videoUrl={props.videoUrl} />;
  }
  return <div className={`flex items-center justify-center bg-fw-disabled ${props.className ?? ""}`}>No spin available</div>;
}

// -----------------------------------------------------------------------------
// Hybrid: video while idle, frames while dragging
// -----------------------------------------------------------------------------

function HybridSpin({
  frameUrls,
  videoUrl,
  className = "",
  pixelsPerRevolution,
  autoRotate = true,
}: Required<Pick<SpinScrubberProps, "frameUrls" | "videoUrl">> & SpinScrubberProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const frameFloatRef = useRef<number>(0);
  const drawnFrameRef = useRef<number>(-1);
  const dragStateRef = useRef<{ startX: number; startFloat: number; widgetWidth: number } | null>(null);
  const pendingSeekCleanupRef = useRef<(() => void) | null>(null);

  const [loadedCount, setLoadedCount] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // Which layer is visible. Video by default; canvas while dragging.
  const [surface, setSurface] = useState<"video" | "canvas">("video");

  const N = frameUrls.length;
  const allLoaded = loadedCount === N;

  // Preload frames in the background — the video covers the experience
  // meanwhile; dragging arms itself once every frame is decoded.
  useEffect(() => {
    setLoadedCount(0);
    imagesRef.current = [];
    let cancelled = false;
    let loaded = 0;
    frameUrls.forEach((url, i) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      const done = () => {
        if (cancelled) return;
        loaded++;
        setLoadedCount(loaded);
      };
      img.onload = () => {
        if (cancelled) return;
        imagesRef.current[i] = img;
        done();
      };
      img.onerror = done;
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameUrls]);

  // Video wiring: autoplay (muted+inline is allowed everywhere) + failure
  // detection. A failed video demotes the whole widget to frames-only.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onCanPlay = () => {
      setVideoReady(true);
      if (autoRotate) v.play().catch(() => { /* poster frame is fine */ });
    };
    const onError = () => setVideoFailed(true);
    if (v.readyState >= 3) onCanPlay();
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("error", onError);
    return () => {
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("error", onError);
    };
  }, [videoUrl, autoRotate]);

  function drawFrame(index: number) {
    if (drawnFrameRef.current === index) return;
    const canvas = canvasRef.current;
    const img = imagesRef.current[index];
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    drawnFrameRef.current = index;
  }

  // Pointer events: grab → freeze video at its current angle and hand the
  // same angle to the flipbook; release → seek the video back to the final
  // angle and resume, swapping surfaces only after the seek completes so
  // there is no visible jump.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onDown = (e: PointerEvent) => {
      if (!allLoaded) return; // drag arms once frames are decoded
      const v = videoRef.current;
      pendingSeekCleanupRef.current?.();
      el.setPointerCapture(e.pointerId);
      let startFloat = frameFloatRef.current;
      if (v && v.duration && !videoFailed) {
        v.pause();
        startFloat = ((v.currentTime / v.duration) * N) % N;
      }
      frameFloatRef.current = startFloat;
      drawnFrameRef.current = -1; // force a fresh paint at the grab angle
      drawFrame(Math.floor(startFloat));
      setSurface("canvas");
      dragStateRef.current = { startX: e.clientX, startFloat, widgetWidth: el.clientWidth };
      setIsDragging(true);
    };
    const onMove = (e: PointerEvent) => {
      const s = dragStateRef.current;
      if (!s) return;
      const revolutionPx = pixelsPerRevolution ?? s.widgetWidth;
      const delta = e.clientX - s.startX;
      // Negate so a right-drag pushes the near edge in the drag direction.
      const framesDelta = -(delta / revolutionPx) * N;
      let next = s.startFloat + framesDelta;
      next = ((next % N) + N) % N;
      frameFloatRef.current = next;
      drawFrame(Math.floor(next));
    };
    const onUp = (e: PointerEvent) => {
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      if (!dragStateRef.current) return;
      dragStateRef.current = null;
      setIsDragging(false);

      const v = videoRef.current;
      if (!v || !v.duration || videoFailed) return; // stay on canvas
      const t = (frameFloatRef.current / N) * v.duration;
      const swapBack = () => {
        pendingSeekCleanupRef.current?.();
        setSurface("video");
        if (autoRotate) v.play().catch(() => {});
      };
      const onSeeked = () => swapBack();
      v.addEventListener("seeked", onSeeked, { once: true });
      // Safety: if `seeked` never fires (some in-app browsers), swap anyway.
      const timer = setTimeout(swapBack, 250);
      pendingSeekCleanupRef.current = () => {
        v.removeEventListener("seeked", onSeeked);
        clearTimeout(timer);
        pendingSeekCleanupRef.current = null;
      };
      v.currentTime = t;
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLoaded, pixelsPerRevolution, N, videoFailed, autoRotate]);

  // Video hard-failed → the plain flipbook IS the experience.
  if (videoFailed) {
    return <CanvasFlipbook frameUrls={frameUrls} className={className} pixelsPerRevolution={pixelsPerRevolution} autoRotate={autoRotate} />;
  }

  const showCanvas = surface === "canvas";

  return (
    <div
      ref={containerRef}
      className={`relative select-none touch-none ${allLoaded ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"} ${className}`}
      style={{ touchAction: "none" }}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        preload="auto"
        muted
        loop
        playsInline
        autoPlay={autoRotate}
        className={`h-full w-full object-contain pointer-events-none ${showCanvas ? "invisible" : ""}`}
      />
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full object-contain pointer-events-none ${showCanvas ? "" : "invisible"}`}
      />
      {!videoReady && !allLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-[13px] text-fw-darkGray">
          Loading spin…
        </div>
      )}
    </div>
  );
}

// Tiny badge you can drop next to the scrubber to see which mode is active
// while debugging. Not exported through the public API.
export function SpinModeBadge({ frameUrls, videoUrl }: SpinScrubberProps) {
  const mode = frameUrls && frameUrls.length > 1 ? `canvas (${frameUrls.length}f)` : videoUrl ? "video" : "none";
  const color = mode.startsWith("canvas") ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}>{mode}</span>;
}

// -----------------------------------------------------------------------------
// Canvas flipbook (preferred)
// -----------------------------------------------------------------------------

function CanvasFlipbook({
  frameUrls,
  className = "",
  pixelsPerRevolution,
  autoRotate = true,
  autoRotateSpeed = 0.15,
}: Required<Pick<SpinScrubberProps, "frameUrls">> & SpinScrubberProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  // Fractional frame position — keeping it as a float means auto-rotate
  // accumulates sub-frame progress instead of getting floored to 0 each tick.
  const frameFloatRef = useRef<number>(0);
  const drawnFrameRef = useRef<number>(-1);
  const dragStateRef = useRef<{ startX: number; startFloat: number; widgetWidth: number } | null>(null);
  const idleAnimRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Preload all frames.
  useEffect(() => {
    setLoadedCount(0);
    imagesRef.current = [];
    let cancelled = false;
    let loaded = 0;
    frameUrls.forEach((url, i) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = url;
      img.onload = () => {
        if (cancelled) return;
        imagesRef.current[i] = img;
        loaded++;
        setLoadedCount(loaded);
        if (i === 0) drawFrame(0); // as soon as frame 0 is ready, paint it
      };
      img.onerror = () => {
        if (cancelled) return;
        loaded++;
        setLoadedCount(loaded);
      };
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameUrls]);

  function drawFrame(index: number) {
    if (drawnFrameRef.current === index) return; // skip redundant redraws
    const canvas = canvasRef.current;
    const img = imagesRef.current[index];
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    drawnFrameRef.current = index;
  }

  // Idle auto-rotate: only when not dragging and all frames loaded.
  const allLoaded = loadedCount === frameUrls.length;
  useEffect(() => {
    if (!autoRotate || !allLoaded || isDragging) {
      if (idleAnimRef.current) cancelAnimationFrame(idleAnimRef.current);
      lastFrameTimeRef.current = 0;
      return;
    }
    const tick = (t: number) => {
      if (lastFrameTimeRef.current === 0) lastFrameTimeRef.current = t;
      const dt = (t - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = t;
      // Advance the FRACTIONAL position (not the drawn frame index) so
      // slow motion accumulates properly across ticks.
      const advance = autoRotateSpeed * dt * frameUrls.length;
      let next = frameFloatRef.current + advance;
      next = ((next % frameUrls.length) + frameUrls.length) % frameUrls.length;
      frameFloatRef.current = next;
      drawFrame(Math.floor(next));
      idleAnimRef.current = requestAnimationFrame(tick);
    };
    idleAnimRef.current = requestAnimationFrame(tick);
    return () => {
      if (idleAnimRef.current) cancelAnimationFrame(idleAnimRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRotate, autoRotateSpeed, allLoaded, isDragging, frameUrls.length]);

  // Pointer events (mouse + touch).
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !allLoaded) return;

    const onDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      dragStateRef.current = {
        startX: e.clientX,
        startFloat: frameFloatRef.current,
        widgetWidth: el.clientWidth,
      };
      setIsDragging(true);
    };
    const onMove = (e: PointerEvent) => {
      const s = dragStateRef.current;
      if (!s) return;
      const revolutionPx = pixelsPerRevolution ?? s.widgetWidth;
      const delta = e.clientX - s.startX;
      // Negate so a right-drag advances the video forward (the generated
      // turntable renders as the product rotating right-to-left, i.e.,
      // the shopper "grabs" the near edge and pushes it in the drag direction).
      const framesDelta = -(delta / revolutionPx) * frameUrls.length;
      let next = s.startFloat + framesDelta;
      next = ((next % frameUrls.length) + frameUrls.length) % frameUrls.length;
      frameFloatRef.current = next;
      drawFrame(Math.floor(next));
    };
    const onUp = (e: PointerEvent) => {
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      dragStateRef.current = null;
      setIsDragging(false);
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [allLoaded, pixelsPerRevolution, frameUrls.length]);

  const loadPct = Math.round((loadedCount / frameUrls.length) * 100);

  return (
    <div
      ref={containerRef}
      className={`relative select-none touch-none ${isDragging ? "cursor-grabbing" : "cursor-grab"} ${className}`}
      style={{ touchAction: "none" }}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full object-contain pointer-events-none"
      />
      {!allLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 text-[13px] text-fw-darkGray">
          <div>Loading spin… {loadPct}%</div>
          <div className="mt-2 h-1 w-32 overflow-hidden rounded-full bg-fw-lighterGray/60">
            <div className="h-full bg-fw-purple transition-all" style={{ width: `${loadPct}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Video scrubber (fallback when frame extraction failed)
// -----------------------------------------------------------------------------

function VideoScrubber({
  videoUrl,
  className = "",
  pixelsPerRevolution,
  autoRotate = true,
  autoRotateSpeed = 0.1,
}: Required<Pick<SpinScrubberProps, "videoUrl">> & SpinScrubberProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{ startX: number; startTime: number; widgetWidth: number } | null>(null);
  const idleAnimRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onReady = () => setIsReady(true);
    if (v.readyState >= 4) onReady();
    v.addEventListener("canplaythrough", onReady);
    return () => v.removeEventListener("canplaythrough", onReady);
  }, [videoUrl]);

  useEffect(() => {
    if (!autoRotate || !isReady || isDragging) {
      if (idleAnimRef.current) cancelAnimationFrame(idleAnimRef.current);
      return;
    }
    const tick = (t: number) => {
      const v = videoRef.current;
      if (!v || !v.duration || isNaN(v.duration)) {
        idleAnimRef.current = requestAnimationFrame(tick);
        return;
      }
      if (lastFrameTimeRef.current === 0) lastFrameTimeRef.current = t;
      const dt = (t - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = t;
      const newTime = (v.currentTime + dt * v.duration * autoRotateSpeed) % v.duration;
      v.currentTime = newTime < 0 ? newTime + v.duration : newTime;
      idleAnimRef.current = requestAnimationFrame(tick);
    };
    idleAnimRef.current = requestAnimationFrame(tick);
    return () => {
      if (idleAnimRef.current) cancelAnimationFrame(idleAnimRef.current);
      lastFrameTimeRef.current = 0;
    };
  }, [autoRotate, autoRotateSpeed, isReady, isDragging]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isReady) return;
    const onDown = (e: PointerEvent) => {
      const v = videoRef.current;
      if (!v || !v.duration) return;
      el.setPointerCapture(e.pointerId);
      dragStateRef.current = { startX: e.clientX, startTime: v.currentTime, widgetWidth: el.clientWidth };
      setIsDragging(true);
    };
    const onMove = (e: PointerEvent) => {
      const s = dragStateRef.current;
      const v = videoRef.current;
      if (!s || !v || !v.duration) return;
      const revolutionPx = pixelsPerRevolution ?? s.widgetWidth;
      const delta = e.clientX - s.startX;
      let t = s.startTime - (delta / revolutionPx) * v.duration;
      t = ((t % v.duration) + v.duration) % v.duration;
      v.currentTime = t;
    };
    const onUp = (e: PointerEvent) => {
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      dragStateRef.current = null;
      setIsDragging(false);
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [isReady, pixelsPerRevolution]);

  return (
    <div
      ref={containerRef}
      className={`relative select-none touch-none ${isDragging ? "cursor-grabbing" : "cursor-grab"} ${className}`}
      style={{ touchAction: "none" }}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        preload="auto"
        muted
        playsInline
        className="w-full h-full object-contain pointer-events-none"
      />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-[13px] text-fw-darkGray">
          Loading spin…
        </div>
      )}
    </div>
  );
}
