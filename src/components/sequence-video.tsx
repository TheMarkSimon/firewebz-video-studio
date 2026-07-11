"use client";

import { useEffect, useRef, useState } from "react";

// Muted autoplay video that plays a LIST of clips back-to-back and loops the
// whole sequence (single-item lists just loop natively). Used on the
// marketing homepage — hero reel cycles main → handbag → furniture.
export function SequenceVideo({
  sources,
  className = "",
}: {
  sources: string[];
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // Source swapped — (re)start playback. Muted+inline autoplay is allowed
    // everywhere; a rejected play() just leaves a poster frame.
    videoRef.current?.play().catch(() => {});
  }, [index]);

  return (
    <video
      ref={videoRef}
      key={sources[index]}
      src={sources[index]}
      autoPlay
      muted
      playsInline
      preload="auto"
      loop={sources.length === 1}
      onEnded={() => setIndex((i) => (i + 1) % sources.length)}
      className={className}
    />
  );
}
