// Embedded: attach an existing (web-studio) spin to a catalog product, so
// it can be pushed to the product page like a catalog-created spin.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { EmbeddedAuthError, requireShopContext } from "@/lib/embedded-auth";
import { fetchProduct, getShopToken } from "@/lib/shopify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId, connection } = await requireShopContext(req);
    const body = (await req.json().catch(() => ({}))) as { spinId?: string; productGid?: string };
    if (!body.spinId || !body.productGid?.startsWith("gid://shopify/Product/")) {
      return NextResponse.json({ error: "spinId and productGid required" }, { status: 400 });
    }

    const spin = await prisma.spin.findUnique({ where: { id: body.spinId } });
    if (!spin || spin.userId !== userId) {
      return NextResponse.json({ error: "Spin not found." }, { status: 404 });
    }
    if (spin.shopifyProductGid) {
      return NextResponse.json({ error: "This spin is already attached to a product." }, { status: 422 });
    }
    const taken = await prisma.spin.findFirst({
      where: { userId, shopifyProductGid: body.productGid },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json({ error: "That product already has a spin." }, { status: 422 });
    }

    // Validates the product belongs to THIS store (fetch runs on the
    // store's own token) and captures the handle for storefront links.
    const product = await fetchProduct(connection.shop, await getShopToken(connection), body.productGid);
    if (!product) return NextResponse.json({ error: "Product not found on your store." }, { status: 404 });

    await prisma.spin.update({
      where: { id: spin.id },
      data: { shopifyProductGid: product.gid, shopifyProductHandle: product.handle },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof EmbeddedAuthError) {
      console.error("[embedded] auth refused:", err.message);
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[embedded/attach]", err);
    return NextResponse.json({ error: "Attach failed — try again." }, { status: 500 });
  }
}
