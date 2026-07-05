"use client";

import { useEffect, useRef, useState } from "react";

// Horizontal drag-to-scrub 360° widget over an MP4.
// Vertical drag is intentionally ignored — this widget is a rotation, not a
// video player. No autoplay controls, no timeline UI. Loops seamlessly by
// wrapping currentTime around video.duration.
//
// Design notes:
//   - preload="auto" so the whole MP4 buffers before interaction. Kling clips
//     are ~14 MB → ~1-2s on typical broadband. Show "Loading…" until ready.
//   - Sensitivity: default 1 full rotation per widget-width of drag. Tunable
//     via `pixelsPerRevolution` prop for merchants who want stiffer/looser feel.
//   - Touch and mouse share the same math via pointer events.

interface SpinScrubberProps {
  videoUrl: string;
  className?: string;
  pixelsPerRevolution?: number; // default = clientWidth
  autoRotate?: boolean;         // slow idle rotation when not interacting
  autoRotateSpeed?: number;     // revolutions per second when idle
}

export function SpinScrubber({
  videoUrl,
  className = "",
  pixelsPerRevolution,
  autoRotate = true,
  autoRotateSpeed = 0.1,
}: SpinScrubberProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{ startX: number; startTime: number; widgetWidth: number } | null>(null);
  const idleAnimRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Load: fire once, mark ready when we have enough to scrub.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onReady = () => setIsReady(true);
    // readyState 4 = HAVE_ENOUGH_DATA — safe to scrub anywhere in the clip.
    if (v.readyState >= 4) onReady();
    v.addEventListener("canplaythrough", onReady);
    return () => v.removeEventListener("canplaythrough", onReady);
  }, [videoUrl]);

  // Idle auto-rotate: only when not dragging and video is ready.
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
      // autoRotateSpeed = revolutions per second → advance dt * duration * speed
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

  // Pointer events (unified for mouse + touch).
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isReady) return;

    const onPointerDown = (e: PointerEvent) => {
      const v = videoRef.current;
      if (!v || !v.duration) return;
      container.setPointerCapture(e.pointerId);
      dragStateRef.current = {
        startX: e.clientX,
        startTime: v.currentTime,
        widgetWidth: container.clientWidth,
      };
      setIsDragging(true);
    };

    const onPointerMove = (e: PointerEvent) => {
      const state = dragStateRef.current;
      const v = videoRef.current;
      if (!state || !v || !v.duration) return;
      const revolutionPx = pixelsPerRevolution ?? state.widgetWidth;
      const deltaX = e.clientX - state.startX;
      const revolutionFraction = deltaX / revolutionPx;
      // deltaTime = revolutionFraction * duration; positive drag = forward.
      let newTime = state.startTime + revolutionFraction * v.duration;
      // Wrap around: negative → +duration, > duration → mod.
      newTime = ((newTime % v.duration) + v.duration) % v.duration;
      v.currentTime = newTime;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (container.hasPointerCapture(e.pointerId)) container.releasePointerCapture(e.pointerId);
      dragStateRef.current = null;
      setIsDragging(false);
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointercancel", onPointerUp);
    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointercancel", onPointerUp);
    };
  }, [isReady, pixelsPerRevolution]);

  return (
    <div
      ref={containerRef}
      className={`relative select-none touch-none ${isDragging ? "cursor-grabbing" : "cursor-grab"} ${className}`}
      // touch-action:none tells the browser not to scroll/zoom on horizontal drag.
      style={{ touchAction: "none" }}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        preload="auto"
        muted
        playsInline
        // We control frames manually via currentTime; do NOT let the browser
        // auto-play or show controls.
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
