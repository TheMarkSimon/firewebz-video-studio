import { prisma } from "@/lib/db";
import { SpinScrubber } from "@/components/spin-scrubber";

// Embeddable widget for merchant storefronts. Iframe target: /embed/<spinId>
// Public, read-only, serves ONLY pre-generated spins from the DB — never
// triggers a paid generation, never expires (unlike the old session store).
// iframe-friendly headers for /embed/* are set in next.config.mjs.

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { robots: { index: false, follow: false } };
}

export default async function EmbedPage({ params }: { params: Promise<{ spinId: string }> }) {
  const { spinId } = await params;
  const spin = await prisma.spin.findUnique({ where: { id: spinId } });

  if (!spin || spin.status !== "ready" || !spin.videoUrl) {
    return <EmbedError message="Spin not found." />;
  }

  // Embeds serve media DIRECTLY from the CDN — never through /api/proxy.
  // The proxy exists for the founder's corporate network viewing the app UI;
  // routing shopper traffic through it would bill every storefront view to
  // our Vercel bandwidth. Direct CDN = per-view cost ~$0, which is the
  // pricing promise ("we charge for creation, never for your traffic").
  const frames = (spin.frameUrls as string[] | null) ?? undefined;

  return (
    <div className="h-screen w-screen bg-transparent">
      <SpinScrubber frameUrls={frames} videoUrl={spin.videoUrl} className="h-full w-full" />
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
