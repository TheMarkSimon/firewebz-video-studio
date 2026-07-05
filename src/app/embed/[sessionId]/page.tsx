import { getSession } from "@/lib/session-store";
import { SpinScrubber } from "@/components/spin-scrubber";
import { generateSpinVideoFromSession } from "@/lib/actions/spinvideo";

// Embeddable widget for merchant storefronts (Shopify, custom sites).
// Iframe target: /embed/<sessionId>
// - No app chrome, no navigation, no branding overhead. Just the widget.
// - CORS/frame headers set below allow embedding from any origin.
// - Renders the stored MP4 if the session already has one; otherwise falls
//   through to a "Generation pending" placeholder. Merchants only embed once
//   the spin is finalized in the dashboard, so the empty state is rare.

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  // No robots.txt from an iframe context, but be explicit for good measure.
  return { robots: { index: false, follow: false } };
}

// Note: iframe-friendly headers (CSP frame-ancestors, X-Frame-Options) are
// set in next.config.mjs for /embed/* routes — Next 14 doesn't support a
// per-page headers() export.

export default async function EmbedPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);
  if (!session) return <EmbedError message="Spin not found or expired." />;

  // Only serve pre-generated spins on the embed path. Merchants embed a
  // finalized spin after they've already generated it in the dashboard —
  // this route MUST NOT trigger a $3 Kling call on every shopper pageview.
  const cached = session.spinResult;
  if (!cached?.videoUrl) {
    return <EmbedError message="Spin is still being prepared." />;
  }

  const proxiedVideo = `/api/proxy?url=${encodeURIComponent(cached.videoUrl)}`;
  const proxiedFrames = cached.frameUrls?.map((u) => `/api/proxy?url=${encodeURIComponent(u)}`);

  return (
    <div className="h-screen w-screen bg-transparent">
      <SpinScrubber frameUrls={proxiedFrames} videoUrl={proxiedVideo} className="h-full w-full" />
    </div>
  );
}

function EmbedError({ message }: { message: string }) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-white text-center text-[13px] text-fw-darkGray">
      {message}
    </div>
  );
}
