// The merchant lands here after Shopify's subscription confirmation screen
// (approve OR decline). We never trust the query string — we re-read the
// store's active subscriptions from the Admin API and record what Shopify
// says, then bounce to Studio with the outcome.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { getAppOrigin } from "@/lib/app-origin";
import { getActiveSubscription, getShopToken } from "@/lib/shopify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function studioRedirect(origin: string, params: Record<string, string>): NextResponse {
  const url = new URL("/studio", origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const origin = getAppOrigin() ?? req.nextUrl.origin;

  const userId = await getUserId();
  if (!userId) return studioRedirect(origin, { billing: "error" });

  const connection = await prisma.shopifyConnection.findFirst({ where: { userId } });
  if (!connection) return studioRedirect(origin, { billing: "error" });

  try {
    const sub = await getActiveSubscription(connection.shop, await getShopToken(connection));
    await prisma.shopifyConnection.update({
      where: { id: connection.id },
      data: sub
        ? {
            subscriptionGid: sub.gid,
            subscriptionStatus: sub.status,
            subscriptionName: sub.name,
            subscriptionTest: sub.test,
            subscriptionUpdatedAt: new Date(),
          }
        : {
            // Approval declined/abandoned — no active subscription exists.
            subscriptionStatus: null,
            subscriptionUpdatedAt: new Date(),
          },
    });
    return studioRedirect(origin, {
      billing: sub?.status === "ACTIVE" ? "active" : "incomplete",
    });
  } catch (err) {
    console.error("[shopify/billing] reconcile failed:", err);
    return studioRedirect(origin, { billing: "error" });
  }
}
