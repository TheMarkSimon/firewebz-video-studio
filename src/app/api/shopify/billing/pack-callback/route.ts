// Return URL for one-time Spin Pack purchases. Shopify appends
// ?charge_id=<numeric id>; we verify the purchase against the Admin API
// (status ACTIVE) and grant credits exactly once — the purchase gid is the
// idempotency key (reusing the LsOrder table as a cross-rail order ledger).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAppOrigin } from "@/lib/app-origin";
import { getAppPurchaseOneTime, getShopToken, packCredits } from "@/lib/shopify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = getAppOrigin() ?? req.nextUrl.origin;
  const sp = req.nextUrl.searchParams;
  const shop = sp.get("shop") ?? "";
  const chargeId = sp.get("charge_id") ?? "";

  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop) || !/^\d+$/.test(chargeId)) {
    return NextResponse.redirect(new URL("/studio", origin));
  }

  const backToAdmin = NextResponse.redirect(`https://${shop}/admin/apps`);
  const connection = await prisma.shopifyConnection.findUnique({ where: { shop } });
  if (!connection) return backToAdmin;

  try {
    const gid = `gid://shopify/AppPurchaseOneTime/${chargeId}`;
    const purchase = await getAppPurchaseOneTime(shop, await getShopToken(connection), gid);
    if (purchase?.status === "ACTIVE") {
      try {
        await prisma.$transaction([
          prisma.lsOrder.create({
            data: {
              id: gid,
              userId: connection.userId,
              variantId: "shopify-pack",
              credits: packCredits(),
            },
          }),
          prisma.user.update({
            where: { id: connection.userId },
            data: { extraCredits: { increment: packCredits() } },
          }),
        ]);
        console.error(`[pack-callback] +${packCredits()} credits for ${shop} (${gid})`);
      } catch {
        // Unique-PK hit: already granted (refresh/retry) — fine.
      }
    } else {
      console.error(`[pack-callback] ${shop} purchase ${gid} status=${purchase?.status ?? "not found"} — no grant`);
    }
  } catch (err) {
    console.error("[pack-callback] verification failed:", err);
  }
  return backToAdmin;
}
