import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { parseJsonArray } from "@/lib/utils";
import { CreateClient } from "@/components/create-client";
import { notFound } from "next/navigation";

type SP = Record<string, string | string[] | undefined>;

export default async function CreatePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const businessId = typeof sp.businessId === "string" ? sp.businessId : undefined;
  const productId = typeof sp.productId === "string" ? sp.productId : undefined;
  if (!businessId || !productId) return notFound();

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!business || !product) return notFound();

  // Most recent concept + video for this product (if any)
  const concept = await prisma.videoConcept.findFirst({
    where: { productId },
    include: { videos: { orderBy: { createdAt: "desc" }, take: 1, include: { feedback: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell>
      <CreateClient
        business={{
          id: business.id,
          name: business.name,
          category: business.category,
          brandTone: parseJsonArray(business.brandTone),
        }}
        product={{
          id: product.id,
          name: product.name,
          imagePaths: parseJsonArray(product.imagePaths),
        }}
        existingConcept={concept ? {
          id: concept.id,
          hook: concept.hook,
          caption: concept.caption,
          hashtags: parseJsonArray(concept.hashtags),
          cta: concept.cta,
          platform: concept.platform,
          videoStyle: concept.videoStyle,
          video: concept.videos[0] ? {
            id: concept.videos[0].id,
            status: concept.videos[0].status,
            filePath: concept.videos[0].filePath,
            provider: concept.videos[0].provider,
            errorMessage: concept.videos[0].errorMessage,
            hasFeedback: concept.videos[0].feedback.length > 0,
          } : null,
        } : null}
      />
    </AppShell>
  );
}
