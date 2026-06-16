"use server";

import { prisma } from "@/lib/db";
import { getLlmProvider } from "@/lib/providers/llm";
import { toJsonArray, parseJsonArray } from "@/lib/utils";
import type { Platform, VideoStyle } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function generateConcepts(params: {
  businessId: string;
  productId: string;
  platforms: Platform[];
  videoStyles: VideoStyle[];
  count: number;
  ctaPreference?: string;
  durationSeconds?: number;
}) {
  const business = await prisma.business.findUniqueOrThrow({ where: { id: params.businessId } });
  const product = await prisma.product.findUniqueOrThrow({ where: { id: params.productId } });
  const llm = getLlmProvider();

  const created: string[] = [];
  for (let i = 0; i < params.count; i++) {
    const platform = params.platforms[i % params.platforms.length];
    const videoStyle = params.videoStyles[i % params.videoStyles.length];

    const draft = await llm.generateConcept({
      businessName: business.name,
      businessCategory: business.category,
      brandTone: parseJsonArray(business.brandTone),
      targetAudience: business.targetAudience,
      goals: parseJsonArray(business.goals),
      productName: product.name,
      productDescription: product.description ?? undefined,
      keyBenefit: product.keyBenefit ?? undefined,
      promotion: product.promotion ?? undefined,
      price: product.price ?? undefined,
      platform,
      videoStyle,
      durationSeconds: params.durationSeconds ?? 10,
      ctaPreference: params.ctaPreference,
    });

    const concept = await prisma.videoConcept.create({
      data: {
        businessId: business.id,
        productId: product.id,
        platform,
        videoStyle,
        title: draft.title,
        hook: draft.hook,
        storyboard: toJsonArray(draft.storyboard),
        onScreenText: toJsonArray(draft.onScreenText),
        voiceoverScript: draft.voiceoverScript,
        caption: draft.caption,
        hashtags: toJsonArray(draft.hashtags),
        cta: draft.cta,
        performanceHypothesis: draft.performanceHypothesis,
        status: "draft",
      },
    });
    created.push(concept.id);
  }
  revalidatePath("/concepts");
  return created;
}

export async function updateConceptStatus(conceptId: string, status: "approved" | "rejected" | "draft") {
  await prisma.videoConcept.update({ where: { id: conceptId }, data: { status } });
  revalidatePath("/concepts");
}

export async function updateConceptFields(conceptId: string, fields: { caption?: string; cta?: string; hook?: string; title?: string; hashtags?: string[] }) {
  const data: Record<string, unknown> = {};
  if (fields.caption !== undefined) data.caption = fields.caption;
  if (fields.cta !== undefined) data.cta = fields.cta;
  if (fields.hook !== undefined) data.hook = fields.hook;
  if (fields.title !== undefined) data.title = fields.title;
  if (fields.hashtags !== undefined) data.hashtags = toJsonArray(fields.hashtags);
  await prisma.videoConcept.update({ where: { id: conceptId }, data });
  revalidatePath("/concepts");
}

export async function deleteConcept(conceptId: string) {
  await prisma.videoConcept.delete({ where: { id: conceptId } });
  revalidatePath("/concepts");
}
