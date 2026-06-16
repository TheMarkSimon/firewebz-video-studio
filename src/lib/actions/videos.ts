"use server";

import { prisma } from "@/lib/db";
import { getVideoProvider } from "@/lib/providers/video";
import { parseJsonArray } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import path from "node:path";
import { buildEnrichedBrief } from "@/lib/enrichment";
import { buildVideoPrompt } from "@/lib/enrichment/prompt-builder";

export async function generateVideoForConcept(conceptId: string) {
  const concept = await prisma.videoConcept.findUniqueOrThrow({
    where: { id: conceptId },
    include: { business: true, product: true },
  });

  const provider = getVideoProvider();
  // Data URLs pass through unchanged; relative file paths get resolved against cwd.
  const productImages = parseJsonArray(concept.product.imagePaths).map((p) =>
    p.startsWith("data:") ? p : path.resolve(process.cwd(), p)
  );

  // Build the enriched brief + Runway prompt up front so the provider has the
  // best possible instructions. This runs website scrape + image vision + LLM
  // prompt generation in parallel before we hit the video provider.
  const brief = await buildEnrichedBrief({
    businessName: concept.business.name,
    category: concept.business.category,
    brandTone: parseJsonArray(concept.business.brandTone),
    websiteUrl: concept.business.websiteUrl ?? undefined,
    instagramUrl: concept.business.instagramHandle ?? undefined,
    tiktokUrl: concept.business.tiktokHandle ?? undefined,
    productImagePath: productImages[0],
  });

  const promptPackage = await buildVideoPrompt(brief, concept.videoStyle, 5);

  const generation = await prisma.generatedVideo.create({
    data: {
      conceptId: concept.id,
      provider: provider.name,
      status: "processing",
    },
  });

  const result = await provider.generateVideo({
    businessName: concept.business.name,
    businessCategory: concept.business.category,
    brandTone: parseJsonArray(concept.business.brandTone).join(", "),
    targetAudience: concept.business.targetAudience,
    productName: concept.product.name,
    productDescription: concept.product.description ?? undefined,
    productImagePaths: productImages,
    platform: concept.platform as "instagram_reels" | "tiktok" | "youtube_shorts" | "facebook_reels",
    videoStyle: concept.videoStyle,
    hook: concept.hook,
    storyboard: parseJsonArray(concept.storyboard),
    onScreenText: parseJsonArray(concept.onScreenText),
    cta: concept.cta,
    durationSeconds: 5,
    aspectRatio: "9:16",
    // NEW: pass the LLM-built prompt to the provider
    overridePrompt: promptPackage.runwayPrompt,
  });

  await prisma.generatedVideo.update({
    where: { id: generation.id },
    data: {
      status: result.status,
      filePath: result.videoFilePath,
      providerJobId: result.providerJobId,
      durationSeconds: result.durationSeconds,
      aspectRatio: "9:16",
      errorMessage: result.errorMessage,
      rawProviderResponse: result.rawResponse
        ? JSON.stringify({ ...result.rawResponse as object, prompt: promptPackage.runwayPrompt }).slice(0, 6000)
        : JSON.stringify({ prompt: promptPackage.runwayPrompt }),
    },
  });

  revalidatePath("/concepts");
  revalidatePath("/dashboard");
  revalidatePath("/create");
  return generation.id;
}
