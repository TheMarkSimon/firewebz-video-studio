// fal.ai queue webhook — fires when an async generation finishes, even if
// the merchant closed the tab. This is a TRIGGER, not a data source: we
// authenticate it with a shared secret in the URL and then fetch the real
// result from fal with our credentials (see lib/spin-completion.ts), so a
// forged call can never inject a video URL or flip a spin to ready.
//
// fal retries non-2xx deliveries, which we lean on twice:
//   - 404 when the request_id isn't in the DB yet (submit → DB write race);
//   - 500 when reconciliation hits a transient error.
// Polling via getSpinGenerationStatus is the belt-and-suspenders finish path.

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import { reconcileSpinGeneration } from "@/lib/spin-completion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Completion runs ffmpeg frame extraction + 60 frame uploads here.
export const maxDuration = 300;

function tokenMatches(token: string | null, secret: string): boolean {
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const secret = process.env.FAL_WEBHOOK_SECRET;
  if (!secret) {
    // Misconfigured deploy — refuse rather than process unauthenticated.
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }
  if (!tokenMatches(req.nextUrl.searchParams.get("token"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let requestId: string | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: any = await req.json();
    requestId = body?.request_id ?? body?.requestId;
  } catch {
    // fall through to the 400 below
  }
  if (!requestId || typeof requestId !== "string") {
    return NextResponse.json({ error: "Missing request_id" }, { status: 400 });
  }

  const spin = await prisma.spin.findFirst({
    where: { falRequestId: requestId },
    select: { id: true },
  });
  if (!spin) {
    // Unknown (or not yet persisted) request id — let fal retry.
    return NextResponse.json({ error: "Unknown request_id" }, { status: 404 });
  }

  try {
    const outcome = await reconcileSpinGeneration(spin.id);
    return NextResponse.json({ ok: true, outcome });
  } catch (err) {
    console.error("[webhooks/fal] reconcile failed:", err);
    return NextResponse.json({ error: "Reconcile failed, retry" }, { status: 500 });
  }
}
