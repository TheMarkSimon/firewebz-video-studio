// Redirect the signed-in user to their Lemon Squeezy customer portal
// (manage payment method, cancel, invoices). Portal URLs are short-lived,
// so we fetch a fresh one per visit.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getAppOrigin } from "@/lib/app-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = getAppOrigin() ?? req.nextUrl.origin;
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.redirect(new URL("/studio", origin));

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { lsSubscriptionId: true },
  });
  if (!user?.lsSubscriptionId) return NextResponse.redirect(new URL("/studio", origin));

  try {
    const res = await fetch(
      `https://api.lemonsqueezy.com/v1/subscriptions/${user.lsSubscriptionId}`,
      {
        headers: {
          Accept: "application/vnd.api+json",
          Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
        },
        cache: "no-store",
      },
    );
    const json = (await res.json()) as {
      data?: { attributes?: { urls?: { customer_portal?: string } } };
    };
    const portal = json.data?.attributes?.urls?.customer_portal;
    if (portal) return NextResponse.redirect(portal);
  } catch (err) {
    console.error("[billing/portal]", err);
  }
  return NextResponse.redirect(new URL("/studio?billing=error", origin));
}
