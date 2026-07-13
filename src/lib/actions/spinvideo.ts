"use server";

// Thin Google-auth wrappers around lib/generation.ts (the shared core, also
// used by the embedded admin app's session-token routes).

import { getUserId } from "@/lib/auth";
import { startGeneration, getGenerationStatus } from "@/lib/generation";
import type { SpinStatusPayload } from "@/lib/generation";

export type { SpinStatusPayload };

export async function startSpinGeneration(
  spinId: string,
  opts: { force?: boolean } = {},
): Promise<SpinStatusPayload> {
  const userId = await getUserId();
  if (!userId) return { status: "failed", errorMessage: "Please sign in.", provider: "" };
  return startGeneration(userId, spinId, opts);
}

export async function getSpinGenerationStatus(spinId: string): Promise<SpinStatusPayload> {
  const userId = await getUserId();
  if (!userId) return { status: "failed", errorMessage: "Please sign in.", provider: "" };
  return getGenerationStatus(userId, spinId);
}
