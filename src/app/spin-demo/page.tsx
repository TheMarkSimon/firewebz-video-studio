import { AppShell } from "@/components/app-shell";
import { SpinScrubber } from "@/components/spin-scrubber";

// Local test harness for the SpinScrubber widget. Uses the probe MP4 from
// scripts/probe-kling.mjs so you can iterate on the drag behavior without
// burning fal.ai credits. Not linked from anywhere in the app.
const DEMO_VIDEO_URL = "https://v3b.fal.media/files/b/0aa11072/BRRQEH4QnEFQ0APQ62uwg_output.mp4";

export default function SpinDemoPage() {
  const proxiedUrl = `/api/proxy?url=${encodeURIComponent(DEMO_VIDEO_URL)}`;
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl pt-8">
        <h1 className="text-[22px] font-bold text-fw-text">Spin scrubber demo</h1>
        <p className="mt-1 text-[13px] text-fw-darkGray">
          Drag left/right to spin. Vertical drag is ignored. Idle auto-rotates slowly.
        </p>
        <div className="mt-6 overflow-hidden rounded-2xl border border-fw-border bg-white">
          <SpinScrubber
            videoUrl={proxiedUrl}
            className="aspect-video w-full bg-[#f8f7ff]"
          />
        </div>
      </div>
    </AppShell>
  );
}
