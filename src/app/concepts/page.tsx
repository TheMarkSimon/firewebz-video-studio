import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { parseJsonArray } from "@/lib/utils";
import { ConceptsClient } from "@/components/concepts-client";

type SP = Record<string, string | string[] | undefined>;

export default async function ConceptsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const businessId = typeof sp.businessId === "string" ? sp.businessId : undefined;
  const productId = typeof sp.productId === "string" ? sp.productId : undefined;
  const fresh = sp.fresh === "1";
  const conceptCount = typeof sp.count === "string" ? Number(sp.count) : 3;
  const stylesParam = typeof sp.styles === "string" ? sp.styles : undefined;
  const platformsParam = typeof sp.platforms === "string" ? sp.platforms : undefined;
  const ctaParam = typeof sp.cta === "string" ? sp.cta : "Shop now";

  const businesses = await prisma.business.findMany({
    include: { products: true },
    orderBy: { createdAt: "desc" },
  });

  const activeBusinessId = businessId ?? businesses[0]?.id;
  const activeBusiness = businesses.find((b) => b.id === activeBusinessId);

  const concepts = activeBusiness
    ? await prisma.videoConcept.findMany({
        where: { businessId: activeBusiness.id, ...(productId ? { productId } : {}) },
        include: {
          product: true,
          videos: { include: { feedback: true }, orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const serialized = concepts.map((c) => ({
    id: c.id,
    title: c.title,
    platform: c.platform,
    videoStyle: c.videoStyle,
    hook: c.hook,
    storyboard: parseJsonArray(c.storyboard),
    onScreenText: parseJsonArray(c.onScreenText),
    voiceoverScript: c.voiceoverScript,
    caption: c.caption,
    hashtags: parseJsonArray(c.hashtags),
    cta: c.cta,
    performanceHypothesis: c.performanceHypothesis,
    status: c.status,
    productName: c.product.name,
    productImagePaths: parseJsonArray(c.product.imagePaths),
    videos: c.videos.map((v) => ({
      id: v.id,
      provider: v.provider,
      status: v.status,
      filePath: v.filePath,
      errorMessage: v.errorMessage,
      durationSeconds: v.durationSeconds,
      feedback: v.feedback.map((f) => ({ rating: f.rating, wouldPost: f.wouldPost })),
    })),
  }));

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl pt-6 lg:pt-10">
      <div className="mb-10">
        <h1 className="font-display text-[40px] leading-[1.1] text-fw-text md:text-[48px]">Concepts</h1>
        <p className="mt-2 text-[17px] text-fw-darkGray">Review, edit, approve, and generate videos.</p>
      </div>
      <ConceptsClient
        businesses={businesses.map((b) => ({
          id: b.id,
          name: b.name,
          products: b.products.map((p) => ({ id: p.id, name: p.name })),
        }))}
        activeBusinessId={activeBusinessId}
        activeProductId={productId}
        concepts={serialized}
        autoGenerate={fresh}
        autoGenerateConfig={{
          count: conceptCount,
          styles: stylesParam ? stylesParam.split(",") : ["Product spotlight"],
          platforms: platformsParam ? platformsParam.split(",") : ["instagram_reels"],
          cta: ctaParam,
        }}
      />
      </div>
    </AppShell>
  );
}
