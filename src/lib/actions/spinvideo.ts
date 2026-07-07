"use server";

import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
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

// Generate (or return the stored result of) the 360° spin for a DB spin row.
// Generations cost real money (~$0.5/run) so we NEVER regenerate unless the
// owner passes { force: true }. Results persist on the row — embeds and
// re-visits are free forever, no session expiry.
export async function generateSpinVideo(
  spinId: string,
  opts: { force?: boolean } = {},
): Promise<SpinVideoGenerationResult> {
  const provider = getSpinVideoProvider();
  const userId = await getUserId();
  if (!userId) {
    return {
      status: "failed",
      errorMessage: "Please sign in.",
      diagnostics: { provider: provider.name, frontPhotoPresent: false, cached: false },
    };
  }

  const spin = await prisma.spin.findUnique({ where: { id: spinId } });
  if (!spin || spin.userId !== userId) {
    return {
      status: "failed",
      errorMessage: "Spin not found.",
      diagnostics: { provider: provider.name, frontPhotoPresent: false, cached: false },
    };
  }

  if (!opts.force && spin.status === "ready" && spin.videoUrl) {
    return {
      status: "completed",
      videoUrl: spin.videoUrl,
      frameUrls: (spin.frameUrls as string[] | null) ?? undefined,
      modelUsed: spin.modelUsed ?? undefined,
      durationMs: spin.durationMs ?? undefined,
      cached: true,
      diagnostics: {
        provider: provider.name,
        modelUsed: spin.modelUsed ?? undefined,
        durationMs: spin.durationMs ?? undefined,
        frontPhotoPresent: true,
        cached: true,
      },
    };
  }

  if (!spin.photoFrontUrl) {
    return {
      status: "failed",
      errorMessage: "No front photo on this spin.",
      diagnostics: { provider: provider.name, frontPhotoPresent: false, cached: false },
    };
  }

  await prisma.spin.update({ where: { id: spinId }, data: { status: "generating", errorMessage: null } });

  const extraImageUrls = [spin.photoBackUrl, spin.photoLeftUrl, spin.photoRightUrl]
    .filter((u): u is string => Boolean(u));

  const result = await provider.generate({
    imageUrl: spin.photoFrontUrl,
    extraImageUrls,
    durationSeconds: 10,
  });

  await prisma.spin.update({
    where: { id: spinId },
    data: result.status === "completed" && result.videoUrl
      ? {
          status: "ready",
          videoUrl: result.videoUrl,
          frameUrls: result.frameUrls ?? undefined,
          modelUsed: result.modelUsed,
          durationMs: result.durationMs,
          errorMessage: null,
        }
      : {
          status: "failed",
          errorMessage: result.errorMessage ?? "Generation failed.",
        },
  });

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
