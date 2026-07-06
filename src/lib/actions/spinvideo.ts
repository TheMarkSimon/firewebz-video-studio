"use server";

import { getSession, updateSession } from "@/lib/session-store";
import { getSpinVideoProvider } from "@/lib/providers/spinvideo";
import type { SpinVideoResult } from "@/lib/providers/spinvideo/types";

export interface SpinVideoGenerationResult extends SpinVideoResult {
  cached?: boolean;
  diagnostics: {
    provider: string;
    modelUsed?: string;
    durationMs?: number;
    frontPhotoPresent: boolean;
    cached: boolean;
  };
}

// Generate (or return the cached result of) the 360° spin for this session.
// Kling costs real money — every generation is ~$3 — so we NEVER regenerate
// unless the caller passes { force: true }. This is what makes it safe for
// merchants to embed the widget on a real product page: 1,000 shopper page
// views = 1 generation, not 1,000.
export async function generateSpinVideoFromSession(
  sessionId: string,
  opts: { force?: boolean } = {},
): Promise<SpinVideoGenerationResult> {
  const session = await getSession(sessionId);
  const provider = getSpinVideoProvider();

  if (!session) {
    return {
      status: "failed",
      errorMessage: "Session not found or expired.",
      diagnostics: { provider: provider.name, frontPhotoPresent: false, cached: false },
    };
  }

  // Cache hit: return the previously-generated spin.
  if (!opts.force && session.spinResult?.videoUrl) {
    return {
      status: "completed",
      videoUrl: session.spinResult.videoUrl,
      frameUrls: session.spinResult.frameUrls,
      modelUsed: session.spinResult.modelUsed,
      durationMs: session.spinResult.durationMs,
      cached: true,
      diagnostics: {
        provider: provider.name,
        modelUsed: session.spinResult.modelUsed,
        durationMs: session.spinResult.durationMs,
        frontPhotoPresent: true,
        cached: true,
      },
    };
  }

  const frontPhoto = session.productPhotos?.front;
  if (!frontPhoto) {
    return {
      status: "failed",
      errorMessage: "No front photo in session.",
      diagnostics: { provider: provider.name, frontPhotoPresent: false, cached: false },
    };
  }

  // Extra angles ground the unseen sides for multi-image providers
  // (Seedance); single-image providers (Kling) ignore them.
  const extraImageUrls = [
    session.productPhotos?.back,
    session.productPhotos?.left,
    session.productPhotos?.right,
  ].filter((u): u is string => Boolean(u));

  const result = await provider.generate({ imageUrl: frontPhoto, extraImageUrls, durationSeconds: 10 });

  // Persist success into the session so re-views don't pay again.
  if (result.status === "completed" && result.videoUrl) {
    try {
      await updateSession(sessionId, {
        spinResult: {
          videoUrl: result.videoUrl,
          frameUrls: result.frameUrls,
          modelUsed: result.modelUsed,
          durationMs: result.durationMs,
          completedAt: Date.now(),
        },
      });
    } catch (err) {
      console.error("[spinvideo] failed to cache spinResult:", err);
      // Don't block returning the result — caching is opportunistic.
    }
  }

  return {
    ...result,
    cached: false,
    diagnostics: {
      provider: provider.name,
      modelUsed: result.modelUsed,
      durationMs: result.durationMs,
      frontPhotoPresent: true,
      cached: false,
    },
  };
}
