// Async-generation completion, shared by BOTH finish paths:
//   1. the fal webhook (POST /api/webhooks/fal) — fires even if the merchant
//      closed the tab;
//   2. getSpinGenerationStatus polling — covers localhost (webhooks can't
//      reach it) and any webhook that never arrives.
// The two race; the updateMany guard below makes settlement idempotent so
// exactly one path persists the result and sends the email.
//
// SECURITY NOTE: we never trust webhook payloads. The webhook is only a
// trigger — the actual result is fetched from fal with our credentials.

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSpinVideoProvider } from "@/lib/providers/spinvideo";
import { sendSpinReadyEmail, sendSpinFailedEmail } from "@/lib/email";
import { getAppOrigin } from "@/lib/app-origin";
import { billOverageIfNeeded, refundSpinUsage } from "@/lib/billing";

// Seedance runs take 2-3 minutes; past this we assume the job is lost and
// fail the spin so the merchant isn't stuck on an eternal progress bar.
export const GENERATION_TIMEOUT_MS = 30 * 60 * 1000;

export type ReconcileOutcome =
  | "pending" // job still running at fal
  | "ready"
  | "failed"
  | "already-settled" // another path (webhook vs poll) finished first
  | "not-applicable"; // not generating / no request id / provider lacks queue

// Check fal for the outcome of a spin's queued generation and, if terminal,
// persist it and notify the owner. Throws on transient errors (network blips)
// so callers retry on the next poll/webhook delivery instead of failing the spin.
export async function reconcileSpinGeneration(spinId: string): Promise<ReconcileOutcome> {
  const spin = await prisma.spin.findUnique({
    where: { id: spinId },
    include: { user: { select: { email: true } } },
  });
  if (!spin || spin.status !== "generating" || !spin.falRequestId) return "not-applicable";

  const provider = getSpinVideoProvider();
  if (!provider.fetchQueueResult) return "not-applicable";

  const result = await provider.fetchQueueResult(spin.falRequestId);

  if (result === null) {
    const ageMs = spin.generateStartedAt
      ? Date.now() - spin.generateStartedAt.getTime()
      : 0;
    if (ageMs <= GENERATION_TIMEOUT_MS) return "pending";
    const settled = await settle(spin.id, spin.falRequestId, {
      status: "failed",
      errorMessage: "Generation timed out after 30 minutes. Please try again.",
    });
    if (settled) {
      await refundSpinUsage(spin.id);
      await notify(spin, false);
    }
    return settled ? "failed" : "already-settled";
  }

  const ok = result.status === "completed" && !!result.videoUrl;
  const settled = await settle(spin.id, spin.falRequestId, ok
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
      });
  if (!settled) return "already-settled";

  // Billing follows the outcome: success bills any overage, failure refunds
  // the reserved credit — merchants never pay for a failed run.
  if (ok) await billOverageIfNeeded(spin.id);
  else await refundSpinUsage(spin.id);

  await notify(spin, ok);
  return ok ? "ready" : "failed";
}

// Guarded terminal write: matches only while the row is still generating this
// exact fal request, so concurrent webhook + poll settle it exactly once.
async function settle(
  spinId: string,
  falRequestId: string,
  data: Prisma.SpinUpdateManyMutationInput,
): Promise<boolean> {
  const { count } = await prisma.spin.updateMany({
    where: { id: spinId, status: "generating", falRequestId },
    data,
  });
  return count === 1;
}

async function notify(
  spin: { id: string; title: string; user: { email: string } | null },
  ok: boolean,
): Promise<void> {
  const email = spin.user?.email;
  const origin = getAppOrigin();
  if (!email || !origin) return;
  const spinUrl = `${origin}/generate?spin=${spin.id}`;
  try {
    if (ok) {
      await sendSpinReadyEmail({ to: email, spinTitle: spin.title, spinUrl });
    } else {
      await sendSpinFailedEmail({ to: email, spinTitle: spin.title, retryUrl: spinUrl });
    }
  } catch (err) {
    // Email must never fail a settled generation.
    console.error("[spin-completion] notify failed:", err);
  }
}
