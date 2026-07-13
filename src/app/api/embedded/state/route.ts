// Embedded app state: everything the admin UI renders in one payload —
// shop, plan, and the product catalog joined with spin statuses. Also the
// poll target while generations run (it reconciles in-flight spins, which
// keeps the embedded app correct even if the fal webhook misses).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { EmbeddedAuthError, requireShopContext } from "@/lib/embedded-auth";
import { fetchProducts, getShopToken, overagePriceUsd, proIncludedSpins, proPriceUsd, quotaEnforced } from "@/lib/shopify";
import { getPlanState } from "@/lib/billing";
import { reconcileSpinGeneration } from "@/lib/spin-completion";
import { getAppOrigin } from "@/lib/app-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A poll can land right at completion and run frame extraction.
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  try {
    const { shop, userId, connection } = await requireShopContext(req);

    // Reconcile any in-flight generations before reporting state.
    const generating = await prisma.spin.findMany({
      where: { userId, status: "generating", falRequestId: { not: null } },
      select: { id: true },
    });
    for (const s of generating) {
      try {
        await reconcileSpinGeneration(s.id);
      } catch {
        /* transient — next poll retries */
      }
    }

    const [products, spins, unlinkedSpins, plan] = await Promise.all([
      fetchProducts(shop, await getShopToken(connection), 50),
      prisma.spin.findMany({
        where: { userId, shopifyProductGid: { not: null } },
        select: {
          id: true,
          status: true,
          shopifyProductGid: true,
          pushedToShopifyAt: true,
          errorMessage: true,
        },
      }),
      // Spins created in the web studio (photo upload — no product link).
      // Shown in their own section so merchants can attach them to products.
      prisma.spin.findMany({
        where: { userId, shopifyProductGid: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, status: true },
      }),
      getPlanState(userId),
    ]);
    const spinByGid = new Map(spins.map((s) => [s.shopifyProductGid as string, s]));

    return NextResponse.json({
      shop,
      shopName: connection.shopName ?? shop,
      origin: getAppOrigin(),
      plan: {
        name: connection.subscriptionStatus === "ACTIVE" ? "pro" : "free",
        test: connection.subscriptionTest,
        enforced: quotaEnforced(),
        remaining: plan.remaining,
        priceUsd: proPriceUsd(),
        includedSpins: proIncludedSpins(),
        overageUsd: overagePriceUsd(),
      },
      unlinkedSpins,
      products: products.map((p) => {
        const spin = spinByGid.get(p.gid);
        return {
          gid: p.gid,
          title: p.title,
          handle: p.handle,
          imageUrl: p.imageUrls[0] ?? null,
          photoCount: p.imageUrls.length,
          spin: spin
            ? {
                id: spin.id,
                status: spin.status,
                pushed: Boolean(spin.pushedToShopifyAt),
                error: spin.status === "failed" ? (spin.errorMessage ?? null) : null,
              }
            : null,
        };
      }),
    });
  } catch (err) {
    if (err instanceof EmbeddedAuthError) {
      console.error("[embedded] auth refused:", err.message);
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[embedded/state]", err);
    return NextResponse.json({ error: "Something went wrong loading your store." }, { status: 500 });
  }
}
