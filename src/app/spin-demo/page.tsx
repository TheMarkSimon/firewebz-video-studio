import { AppShell } from "@/components/app-shell";
import { SpinScrubber, SpinModeBadge } from "@/components/spin-scrubber";
import { extractFramesFromVideo } from "@/lib/providers/spinvideo/extract-frames";

// Local test harness for the SpinScrubber. Uses the probe MP4 (no fal.ai
// generation cost) but does run ffmpeg on the server to produce frames
// exactly the way production will. Cache the result at build time so the
// dev loop is fast.
const DEMO_VIDEO_URL = "https://v3b.fal.media/files/b/0aa11072/BRRQEH4QnEFQ0APQ62uwg_output.mp4";

export const revalidate = 3600; // re-extract at most once an hour
// Force dynamic rendering so extraction runs on every request during dev,
// not at build time (which would silently fail if FAL_KEY isn't in the
// build env). Cheap: revalidate still caches the result in memory.
export const dynamic = "force-dynamic";

let debugError: string | null = null;

export default async function SpinDemoPage() {
  const key = process.env.FAL_KEY ?? process.env.FAL_API_TOKEN ?? "";
  console.log("[spin-demo] FAL_KEY present:", !!key, "len:", key.length);

  let frames: Awaited<ReturnType<typeof extractFramesFromVideo>> = null;
  debugError = null;
  if (!key) {
    debugError = "FAL_KEY not set in environment";
  } else {
    try {
      console.log("[spin-demo] starting frame extraction…");
      frames = await extractFramesFromVideo(DEMO_VIDEO_URL, key);
      console.log("[spin-demo] extraction result:", frames ? `${frames.frameCount} frames in ${frames.durationMs}ms` : "NULL");
      if (!frames) debugError = "extractFramesFromVideo returned null (see server console for ffmpeg stderr)";
    } catch (err) {
      debugError = err instanceof Error ? `${err.message}` : String(err);
      console.error("[spin-demo] extraction threw:", err);
    }
  }

  const proxiedVideo = `/api/proxy?url=${encodeURIComponent(DEMO_VIDEO_URL)}`;
  const proxiedFrames = frames?.frameUrls.map((u) => `/api/proxy?url=${encodeURIComponent(u)}`);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl pt-8">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-bold text-fw-text">Spin scrubber demo</h1>
          <SpinModeBadge frameUrls={proxiedFrames} videoUrl={proxiedVideo} />
        </div>
        <p className="mt-1 text-[13px] text-fw-darkGray">
          {frames
            ? `Canvas flipbook — ${frames.frameCount} JPEG frames extracted in ${(frames.durationMs / 1000).toFixed(1)}s. Drag to scrub.`
            : "Video scrubber fallback (frame extraction unavailable)."}
        </p>
        {debugError && (
          <pre className="mt-2 rounded-lg bg-destructive/10 p-3 text-[11px] text-destructive whitespace-pre-wrap break-words">
            Extraction error: {debugError}
          </pre>
        )}
        <div className="mt-6 overflow-hidden rounded-2xl border border-fw-border bg-white">
          <SpinScrubber
            frameUrls={proxiedFrames}
            videoUrl={proxiedVideo}
            className="aspect-video w-full bg-[#f8f7ff]"
          />
        </div>
      </div>
    </AppShell>
  );
}
