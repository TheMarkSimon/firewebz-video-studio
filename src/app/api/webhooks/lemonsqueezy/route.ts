// Lemon Squeezy webhook — drives web-billing state (subscriptions +
// credit packs). Signature-verified against the raw body; idempotent on
// orders via the LsOrder table (LS retries deliveries).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { creditsForVariant, verifyLsSignature } from "@/lib/lemonsqueezy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LsWebhook {
  meta?: { event_name?: string; custom_data?: { user_id?: string } };
  data?: {
    id?: string;
    attributes?: {
      status?: string;
      renews_at?: string | null;
      customer_id?: number;
      user_email?: string;
      first_order_item?: { variant_id?: number };
    };
  };
}

// custom_data survives checkout → order → subscription; email is the
// fallback for anything created outside our checkout links.
async function resolveUserId(payload: LsWebhook): Promise<string | null> {
  const direct = payload.meta?.custom_data?.user_id;
  if (direct) {
    const u = await prisma.user.findUnique({ where: { id: direct }, select: { id: true } });
    if (u) return u.id;
  }
  const email = payload.data?.attributes?.user_email?.toLowerCase();
  if (email) {
    const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (u) return u.id;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyLsSignature(raw, req.headers.get("x-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: LsWebhook;
  try {
    payload = JSON.parse(raw) as LsWebhook;
  } catch {
    return NextResponse.json({ error: "unreadable payload" }, { status: 400 });
  }

  const event = payload.meta?.event_name ?? "";
  const attrs = payload.data?.attributes;

  try {
    const userId = await resolveUserId(payload);
    if (!userId) {
      // Paid but unattributable (e.g. checkout outside our app with an
      // unknown email). Log loudly — this is a manual-support case.
      console.error(`[ls-webhook] ${event}: NO MATCHING USER`, {
        email: attrs?.user_email,
        orderId: payload.data?.id,
      });
      return NextResponse.json({ ok: true, unmatched: true });
    }

    if (event === "order_created") {
      const orderId = payload.data?.id ?? "";
      const variantId = String(attrs?.first_order_item?.variant_id ?? "");
      const credits = creditsForVariant(variantId);
      if (orderId && credits > 0) {
        // Idempotent grant: the LsOrder row and the credit increment land
        // in one transaction; a retried delivery hits the unique PK.
        try {
          await prisma.$transaction([
            prisma.lsOrder.create({ data: { id: orderId, userId, variantId, credits } }),
            prisma.user.update({ where: { id: userId }, data: { extraCredits: { increment: credits } } }),
          ]);
          console.error(`[ls-webhook] +${credits} credits for user ${userId} (order ${orderId})`);
        } catch {
          console.error(`[ls-webhook] order ${orderId} already processed — skipping`);
        }
      }
      // Subscription orders grant no credits (allowance is ledger-computed).
      return NextResponse.json({ ok: true });
    }

    if (event.startsWith("subscription_")) {
      // All subscription lifecycle events carry current status — store it.
      await prisma.user.update({
        where: { id: userId },
        data: {
          lsSubscriptionId: payload.data?.id ?? undefined,
          lsSubscriptionStatus: attrs?.status ?? undefined,
          lsCustomerId: attrs?.customer_id ? String(attrs.customer_id) : undefined,
          lsRenewsAt: attrs?.renews_at ? new Date(attrs.renews_at) : undefined,
        },
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true, ignored: event });
  } catch (err) {
    console.error("[ls-webhook] failed:", err);
    // 500 → LS retries later; safe because all handlers are idempotent.
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
