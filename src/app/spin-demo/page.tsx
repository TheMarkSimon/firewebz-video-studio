import { AppShell } from "@/components/app-shell";
import { SpinScrubber, SpinModeBadge } from "@/components/spin-scrubber";
import { extractFramesFromVideo } from "@/lib/providers/spinvideo/extract-frames";

// Local test harness for the SpinScrubber. Uses the probe MP4 (no fal.ai
// generation cost) but does run ffmpeg on the server to produce frames
// exactly the way production will. Cache the result at build time so the
// dev loop is fast.
const DEMO_VIDEO_URL = "https://v3b.fal.media/files/b/0aa11072/BRRQEH4QnEFQ0APQ62uwg_output.mp4";

export const revalidate = 3600; // re-extract at most once an hour

export default async function SpinDemoPage() {
  const key = process.env.FAL_KEY ?? process.env.FAL_API_TOKEN ?? "";
  const frames = key ? await extractFramesFromVideo(DEMO_VIDEO_URL, key) : null;

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
