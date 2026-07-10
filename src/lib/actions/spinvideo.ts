"use server";

import { revalidatePath } from "next/cache";
import type { Spin } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { getSpinVideoProvider } from "@/lib/providers/spinvideo";
import { reconcileSpinGeneration, GENERATION_TIMEOUT_MS } from "@/lib/spin-completion";
import { getAppOrigin, isPublicOrigin } from "@/lib/app-origin";
import { consumeSpinCredit, refundSpinUsage } from "@/lib/billing";

// What the generate page renders from — a snapshot of the spin's generation
// state. Terminal states carry the result; "generating" carries startedAtMs
// so a reopened tab resumes the progress bar at the right spot.
export interface SpinStatusPayload {
  status: "draft" | "generating" | "ready" | "failed";
  videoUrl?: string;
  frameUrls?: string[];
  modelUsed?: string;
  durationMs?: number;
  errorMessage?: string;
  startedAtMs?: number;
  provider: string;
  cached?: boolean;
  // True when the merchant can close the tab and expect an email (async
  // submit succeeded AND Resend is configured) — drives the waiting copy.
  emailNotify?: boolean;
  // Set when quota enforcement refused to start this run (free credits
  // exhausted / overage unavailable). Human-readable, shown in the preview.
  blocked?: string;
}

function toPayload(
  spin: Spin,
  provider: string,
  extra: Partial<SpinStatusPayload> = {},
): SpinStatusPayload {
  return {
    status: (spin.status as SpinStatusPayload["status"]) ?? "draft",
    videoUrl: spin.videoUrl ?? undefined,
    frameUrls: (spin.frameUrls as string[] | null) ?? undefined,
    modelUsed: spin.modelUsed ?? undefined,
    durationMs: spin.durationMs ?? undefined,
    errorMessage: spin.errorMessage ?? undefined,
    startedAtMs: spin.generateStartedAt?.getTime(),
    provider,
    ...extra,
  };
}

function failure(provider: string, message: string): SpinStatusPayload {
  return { status: "failed", errorMessage: message, provider };
}

// Kick off (or return the cached result of) the 360° spin generation.
// Generations cost real money (~$0.5/run) so we NEVER regenerate unless the
// owner passes { force: true }. Results persist on the row — embeds and
// re-visits are free forever.
//
// Async path (Seedance, the default): submit to fal's queue and return
// immediately with status "generating". Completion happens via the fal
// webhook and/or getSpinGenerationStatus polling — see lib/spin-completion.ts.
export async function startSpinGeneration(
  spinId: string,
  opts: { force?: boolean } = {},
): Promise<SpinStatusPayload> {
  const provider = getSpinVideoProvider();
  const userId = await getUserId();
  if (!userId) return failure(provider.name, "Please sign in.");

  const spin = await prisma.spin.findUnique({ where: { id: spinId } });
  if (!spin || spin.userId !== userId) return failure(provider.name, "Spin not found.");

  if (!opts.force && spin.status === "ready" && spin.videoUrl) {
    return toPayload(spin, provider.name, { cached: true });
  }
  // Already in flight (e.g. double-click, second tab) — don't pay twice.
  if (!opts.force && spin.status === "generating" && spin.falRequestId) {
    return toPayload(spin, provider.name, { emailNotify: emailConfigured() });
  }
  if (!spin.photoFrontUrl) return failure(provider.name, "No front photo on this spin.");

  // Quota gate: a "spin" = one generation run. Reserved here, refunded on
  // terminal failure, and (for overages) billed to Shopify only on success.
  const credit = await consumeSpinCredit(userId, spin.id);
  if (!credit.ok) {
    return toPayload(spin, provider.name, { blocked: credit.error });
  }

  const input = {
    imageUrl: spin.photoFrontUrl,
    extraImageUrls: [spin.photoBackUrl, spin.photoLeftUrl, spin.photoRightUrl]
      .filter((u): u is string => Boolean(u)),
    durationSeconds: 10 as const,
  };

  const submitted = await provider.submit(input, { webhookUrl: buildWebhookUrl() });
  if (!submitted.requestId) {
    await refundSpinUsage(spin.id);
    await prisma.spin.update({
      where: { id: spin.id },
      data: { status: "failed", errorMessage: submitted.errorMessage ?? "Could not start generation." },
    });
    revalidatePath("/studio");
    return failure(provider.name, submitted.errorMessage ?? "Could not start generation.");
  }

  const updated = await prisma.spin.update({
    where: { id: spin.id },
    data: {
      status: "generating",
      falRequestId: submitted.requestId,
      generateStartedAt: new Date(),
      errorMessage: null,
    },
  });
  revalidatePath("/studio");
  return toPayload(updated, provider.name, { emailNotify: emailConfigured() });
}

// Current state of a spin's generation, reconciling against fal's queue when
// one is in flight. This is the client's poll target — and the ONLY finish
// path on localhost, where fal's webhook can't reach us.
export async function getSpinGenerationStatus(spinId: string): Promise<SpinStatusPayload> {
  const provider = getSpinVideoProvider();
  const userId = await getUserId();
  if (!userId) return failure(provider.name, "Please sign in.");

  let spin = await prisma.spin.findUnique({ where: { id: spinId } });
  if (!spin || spin.userId !== userId) return failure(provider.name, "Spin not found.");

  // Watchdog for rows stuck in "generating" WITHOUT a queue request id —
  // a crashed sync run or a pre-async legacy row. Nothing will ever finish
  // these, so fail them instead of letting the client poll forever.
  if (spin.status === "generating" && !spin.falRequestId) {
    const ageMs = spin.generateStartedAt
      ? Date.now() - spin.generateStartedAt.getTime()
      : Number.POSITIVE_INFINITY;
    if (ageMs > GENERATION_TIMEOUT_MS) {
      spin = await prisma.spin.update({
        where: { id: spin.id },
        data: { status: "failed", errorMessage: "Generation was interrupted. Please try again." },
      });
      revalidatePath("/studio");
    }
  }

  if (spin.status === "generating" && spin.falRequestId) {
    try {
      const outcome = await reconcileSpinGeneration(spin.id);
      if (outcome !== "pending") {
        spin = (await prisma.spin.findUnique({ where: { id: spinId } })) ?? spin;
        if (outcome === "ready" || outcome === "failed") revalidatePath("/studio");
      }
    } catch (err) {
      // Transient (network blip etc.) — stay "generating", next poll retries.
      console.error("[spinvideo] reconcile failed, will retry:", err);
    }
  }

  return toPayload(spin, provider.name, {
    emailNotify: spin.status === "generating" ? emailConfigured() : undefined,
  });
}

function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

// fal calls this when the queued job finishes. Only attach it when fal can
// actually reach us (public https) and the shared secret exists — otherwise
// polling alone completes the spin.
function buildWebhookUrl(): string | undefined {
  const origin = getAppOrigin();
  const secret = process.env.FAL_WEBHOOK_SECRET;
  if (!isPublicOrigin(origin) || !secret) return undefined;
  return `${origin}/api/webhooks/fal?token=${encodeURIComponent(secret)}`;
}
