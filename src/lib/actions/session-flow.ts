"use server";

import { getSession } from "@/lib/session-store";
import { buildEnrichedBrief } from "@/lib/enrichment";
import { buildVideoPrompt } from "@/lib/enrichment/prompt-builder";
import { getVideoProvider } from "@/lib/providers/video";
import { DEFAULT_VIDEO_STYLE, getStyleDef } from "@/lib/video-styles";

const VIDEO_DURATION_SECONDS = 10;

// Stateless preview / generate actions that work with the in-memory session
// store instead of the database. Used by /create on Vercel where Prisma can't
// persist between function invocations.

export interface SessionPreview {
  title: string;
  paragraph: string;
  mood: string;
  bestFor: string;
  runwayPrompt: string;
}

export async function previewFromSession(sessionId: string): Promise<SessionPreview> {
  const session = await getSession(sessionId);
  if (!session) throw new Error("Session expired. Please start a new post.");

  const brief = await buildEnrichedBrief({
    businessName: session.businessName,
    category: session.category,
    brandTone: session.brandTone,
    websiteUrl: session.websiteUrl,
    instagramUrl: session.instagramUrl,
    tiktokUrl: session.tiktokUrl,
    productImagePath: session.productImageDataUrl,
  });

  const styleKey = getStyleDef(session.videoStyle).key;
  const pkg = await buildVideoPrompt(brief, styleKey, VIDEO_DURATION_SECONDS);
  return {
    title: pkg.sceneDescription.title,
    paragraph: pkg.sceneDescription.paragraph,
    mood: pkg.sceneDescription.mood,
    bestFor: pkg.sceneDescription.bestFor,
    runwayPrompt: pkg.runwayPrompt,
  };
}

export interface SessionVideoResult {
  status: "completed" | "failed";
  videoUrl?: string;
  errorMessage?: string;
  provider: string;
  hook?: string;
  caption?: string;
  hashtags?: string[];
  cta?: string;
}

export async function generateVideoFromSession(sessionId: string): Promise<SessionVideoResult> {
  const session = await getSession(sessionId);
  if (!session) {
    return { status: "failed", provider: "unknown", errorMessage: "Session expired. Please start a new post." };
  }
  if (!session.productImageDataUrl) {
    return { status: "failed", provider: "unknown", errorMessage: "No product image uploaded." };
  }

  // Build the enriched brief + Runway prompt using the user's chosen style
  const brief = await buildEnrichedBrief({
    businessName: session.businessName,
    category: session.category,
    brandTone: session.brandTone,
    websiteUrl: session.websiteUrl,
    instagramUrl: session.instagramUrl,
    tiktokUrl: session.tiktokUrl,
    productImagePath: session.productImageDataUrl,
  });
  const styleKey = getStyleDef(session.videoStyle).key;
  const promptPackage = await buildVideoPrompt(brief, styleKey, VIDEO_DURATION_SECONDS);

  const provider = getVideoProvider();
  const result = await provider.generateVideo({
    businessName: session.businessName,
    businessCategory: session.category,
    brandTone: session.brandTone.join(", "),
    targetAudience: "",
    productName: `${session.businessName} product`,
    productImagePaths: [session.productImageDataUrl],
    platform: "instagram_reels",
    videoStyle: getStyleDef(styleKey).label,
    hook: "",
    storyboard: [],
    onScreenText: [],
    cta: "Shop now",
    durationSeconds: VIDEO_DURATION_SECONDS,
    aspectRatio: "9:16",
    overridePrompt: promptPackage.runwayPrompt,
  });

  // Also generate caption/hook/hashtags via the existing LLM provider — these
  // are cheap text generations that won't hit the DB.
  const { getLlmProvider } = await import("@/lib/providers/llm");
  let hook: string | undefined, caption: string | undefined, hashtags: string[] | undefined, cta: string | undefined;
  try {
    const draft = await getLlmProvider().generateConcept({
      businessName: session.businessName,
      businessCategory: session.category,
      brandTone: session.brandTone,
      targetAudience: "general SMB customers",
      goals: [],
      productName: `${session.businessName} product`,
      platform: "instagram_reels",
      videoStyle: "Product spotlight",
      durationSeconds: 5,
      ctaPreference: "Shop now",
    });
    hook = draft.hook;
    caption = draft.caption;
    hashtags = draft.hashtags;
    cta = draft.cta;
  } catch {
    // Caption generation is non-blocking; the video is the main artifact
  }

  if (result.status === "failed") {
    return {
      status: "failed",
      provider: provider.name,
      errorMessage: result.errorMessage,
    };
  }

  return {
    status: "completed",
    videoUrl: result.videoFilePath,
    provider: provider.name,
    hook,
    caption,
    hashtags,
    cta,
  };
}
