"use server";

import { prisma } from "@/lib/db";
import { parseJsonArray } from "@/lib/utils";
import path from "node:path";
import { buildEnrichedBrief } from "@/lib/enrichment";
import { buildVideoPrompt, type VideoPromptPackage } from "@/lib/enrichment/prompt-builder";

export interface PreviewResult {
  preview: VideoPromptPackage;
  productImageUrl: string | null;
  cached: boolean;
}

// In-memory cache so the same (productId + style) doesn't repeatedly hit Gemini.
// Resets on server restart — fine for an MVP.
const cache = new Map<string, { ts: number; pkg: VideoPromptPackage }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

export async function buildPreviewForProduct(productId: string, videoStyle = "Product spotlight", durationSeconds = 5): Promise<PreviewResult> {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: { business: true },
  });

  const key = `${productId}|${videoStyle}|${durationSeconds}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return {
      preview: cached.pkg,
      productImageUrl: firstImageUrl(parseJsonArray(product.imagePaths)),
      cached: true,
    };
  }

  const imagePaths = parseJsonArray(product.imagePaths);
  const firstImageAbs = imagePaths[0]
    ? (imagePaths[0].startsWith("data:") ? imagePaths[0] : path.resolve(process.cwd(), imagePaths[0]))
    : undefined;

  const brief = await buildEnrichedBrief({
    businessName: product.business.name,
    category: product.business.category,
    brandTone: parseJsonArray(product.business.brandTone),
    websiteUrl: product.business.websiteUrl ?? undefined,
    instagramUrl: product.business.instagramHandle ?? undefined,
    tiktokUrl: product.business.tiktokHandle ?? undefined,
    productImagePath: firstImageAbs,
  });

  const pkg = await buildVideoPrompt(brief, videoStyle, durationSeconds);
  cache.set(key, { ts: Date.now(), pkg });

  return {
    preview: pkg,
    productImageUrl: firstImageUrl(imagePaths),
    cached: false,
  };
}

function firstImageUrl(paths: string[]): string | null {
  if (!paths[0]) return null;
  if (paths[0].startsWith("data:") || paths[0].startsWith("http")) return paths[0];
  return `/api/files/${paths[0].replace(/^\.\//, "")}`;
}
