"use client";

import { useEffect, useRef, useState } from "react";

// Horizontal drag-to-spin widget.
//
// Preferred mode: canvas flipbook over N pre-decoded WebP frames. This is
// what makes it feel instant on mobile Safari — no video decoding on the
// interaction path, just Image → canvas blit.
//
// Fallback mode: HTML5 <video> currentTime scrubbing. Used when frame
// extraction failed server-side. Laggy on iOS, acceptable on desktop.
//
// Vertical drag is intentionally ignored (rotation only). Auto-rotates
// slowly when idle. Same props whichever mode ends up active.

interface SpinScrubberProps {
  frameUrls?: string[];          // preferred: WebP frame sequence
  videoUrl?: string;             // fallback: MP4 for currentTime scrubbing
  className?: string;
  pixelsPerRevolution?: number;  // default = container width
  autoRotate?: boolean;
  autoRotateSpeed?: number;      // revolutions per second when idle
}

export function SpinScrubber(props: SpinScrubberProps) {
  if (props.frameUrls && props.frameUrls.length > 1) {
    return <CanvasFlipbook {...props} frameUrls={props.frameUrls} />;
  }
  if (props.videoUrl) {
    return <VideoScrubber {...props} videoUrl={props.videoUrl} />;
  }
  return <div className={`flex items-center justify-center bg-fw-disabled ${props.className ?? ""}`}>No spin available</div>;
}

// -----------------------------------------------------------------------------
// Canvas flipbook (preferred)
// -----------------------------------------------------------------------------

function CanvasFlipbook({
  frameUrls,
  className = "",
  pixelsPerRevolution,
  autoRotate = true,
  autoRotateSpeed = 0.1,
}: Required<Pick<SpinScrubberProps, "frameUrls">> & SpinScrubberProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const currentFrameRef = useRef<number>(0);
  const dragStateRef = useRef<{ startX: number; startFrame: number; widgetWidth: number } | null>(null);
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
    const canvas = canvasRef.current;
    const img = imagesRef.current[index];
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Size the canvas to match the image (once). Redraw everything.
    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    currentFrameRef.current = index;
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
      // revolutionsPerSec × dt = fraction of a revolution to advance.
      // fraction × frameCount = frames to advance.
      const advance = autoRotateSpeed * dt * frameUrls.length;
      const next = (currentFrameRef.current + advance) % frameUrls.length;
      drawFrame(Math.floor(next < 0 ? next + frameUrls.length : next));
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
        startFrame: currentFrameRef.current,
        widgetWidth: el.clientWidth,
      };
      setIsDragging(true);
    };
    const onMove = (e: PointerEvent) => {
      const s = dragStateRef.current;
      if (!s) return;
      const revolutionPx = pixelsPerRevolution ?? s.widgetWidth;
      const delta = e.clientX - s.startX;
      // Advance one full frameUrls.length per revolutionPx of drag.
      const framesDelta = (delta / revolutionPx) * frameUrls.length;
      let next = s.startFrame + framesDelta;
      next = ((next % frameUrls.length) + frameUrls.length) % frameUrls.length;
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
      let t = s.startTime + (delta / revolutionPx) * v.duration;
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
