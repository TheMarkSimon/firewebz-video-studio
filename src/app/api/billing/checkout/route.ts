// Create a Lemon Squeezy checkout for the signed-in web user.
// POST { product: "pack" | "pro" | "topup" } → { url }
// The ONLY door to LS checkout (storefront display is off on all
// products) so every purchase carries custom.user_id for the webhook.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getAppOrigin } from "@/lib/app-origin";
import { createCheckout, lsConfigured, lsStatusIsActive, lsVariantIds } from "@/lib/lemonsqueezy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    if (!lsConfigured()) {
      return NextResponse.json({ error: "Purchases aren't available yet." }, { status: 503 });
    }

    const body = (await req.json().catch(() => ({}))) as { product?: string };
    const variants = lsVariantIds();
    const product = body.product;
    if (product !== "pack" && product !== "pro" && product !== "topup") {
      return NextResponse.json({ error: "Unknown product." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, email: true, lsSubscriptionStatus: true },
    });
    if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

    // Top-ups are the discounted subscriber rate — Pro members only.
    if (product === "topup" && !lsStatusIsActive(user.lsSubscriptionStatus)) {
      return NextResponse.json(
        { error: "Top-ups are for Spinr Pro members — upgrade first, or grab the 10-spin pack." },
        { status: 403 },
      );
    }
    if (product === "pro" && lsStatusIsActive(user.lsSubscriptionStatus)) {
      return NextResponse.json({ error: "You're already on Spinr Pro." }, { status: 409 });
    }

    const origin = getAppOrigin() ?? req.nextUrl.origin;
    const url = await createCheckout({
      variantId: variants[product],
      userId: user.id,
      email: user.email,
      redirectUrl: `${origin}/studio?purchase=success`,
    });
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[billing/checkout]", err);
    return NextResponse.json({ error: "Couldn't start the checkout — try again." }, { status: 500 });
  }
}
