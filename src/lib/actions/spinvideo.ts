"use server";

import { getSession } from "@/lib/session-store";
import { getSpinVideoProvider } from "@/lib/providers/spinvideo";
import type { SpinVideoResult } from "@/lib/providers/spinvideo/types";

export interface SpinVideoGenerationResult extends SpinVideoResult {
  diagnostics: {
    provider: string;
    modelUsed?: string;
    durationMs?: number;
    frontPhotoPresent: boolean;
  };
}

export async function generateSpinVideoFromSession(sessionId: string): Promise<SpinVideoGenerationResult> {
  const session = await getSession(sessionId);
  const provider = getSpinVideoProvider();

  if (!session) {
    return {
      status: "failed",
      errorMessage: "Session not found or expired.",
      diagnostics: { provider: provider.name, frontPhotoPresent: false },
    };
  }

  const frontPhoto = session.productPhotos?.front;
  if (!frontPhoto) {
    return {
      status: "failed",
      errorMessage: "No front photo in session.",
      diagnostics: { provider: provider.name, frontPhotoPresent: false },
    };
  }

  const result = await provider.generate({ imageUrl: frontPhoto, durationSeconds: 10 });

  return {
    ...result,
    diagnostics: {
      provider: provider.name,
      modelUsed: result.modelUsed,
      durationMs: result.durationMs,
      frontPhotoPresent: true,
    },
  };
}
