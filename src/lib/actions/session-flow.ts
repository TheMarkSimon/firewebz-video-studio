"use server";

import { getSession } from "@/lib/session-store";
import { buildEnrichedBrief } from "@/lib/enrichment";
import { buildVideoPrompt } from "@/lib/enrichment/prompt-builder";
import { generateLifestyleScene } from "@/lib/enrichment/scene-generator";
import { getVideoProvider } from "@/lib/providers/video";
import { DEFAULT_VIDEO_STYLE, getStyleDef, type VideoStyleKey } from "@/lib/video-styles";

const VIDEO_DURATION_SECONDS = 10;
const USE_TWO_STAGE = process.env.USE_TWO_STAGE_VIDEO === "1";

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
  // When two-stage generation runs, the AI-generated lifestyle scene shown
  // as the first frame. Useful for the result UI to display "the scene we
  // created from your photo".
  lifestyleSceneUrl?: string;
  lifestyleSceneDescription?: string;
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
  const styleKey: VideoStyleKey = getStyleDef(session.videoStyle).key;

  // Stage 1 (optional): generate a lifestyle scene image with Imagen.
  // When enabled, this image becomes the starting frame for Runway instead
  // of the user's raw product photo — dramatically more interesting output.
  let frameImageForRunway = session.productImageDataUrl;
  let lifestyleSceneUrl: string | undefined;
  let lifestyleSceneDescription: string | undefined;
  if (USE_TWO_STAGE) {
    try {
      const scene = await generateLifestyleScene(brief, styleKey);
      if (scene?.imageDataUrl) {
        frameImageForRunway = scene.imageDataUrl;
        lifestyleSceneUrl = scene.imageDataUrl;
        lifestyleSceneDescription = scene.sceneDescription;
      }
    } catch (err) {
      console.error("[session-flow] lifestyle scene generation failed, falling back to product photo:", err);
    }
  }

  // Build the runway prompt with the (possibly upgraded) frame in context
  const promptPackage = await buildVideoPrompt(brief, styleKey, VIDEO_DURATION_SECONDS);

  const provider = getVideoProvider();
  const result = await provider.generateVideo({
    businessName: session.businessName,
    businessCategory: session.category,
    brandTone: session.brandTone.join(", "),
    targetAudience: "",
    productName: `${session.businessName} product`,
    productImagePaths: [frameImageForRunway],
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
    lifestyleSceneUrl,
    lifestyleSceneDescription,
    provider: provider.name,
    hook,
    caption,
    hashtags,
    cta,
  };
}
