// Core Shopify operations (catalog import, embed push, subscriptions),
// shared by the web server actions and the embedded admin app routes.
// Auth-agnostic: callers supply the resolved userId/connection.

import type { ShopifyConnection } from "@prisma/client";
import { prisma } from "@/lib/db";
import { removeBackgroundFromUrl } from "@/lib/actions/remove-bg";
import {
  cancelAppSubscription,
  createAppSubscription,
  fetchProduct,
  getShopToken,
  setSpinMetafield,
} from "@/lib/shopify";

// Catalog import: turn a Shopify product into a Spin draft. Pulls up to 4
// product photos (merchant's order: 1st→front, 2nd→back, 3rd→left,
// 4th→right — editable afterwards), removes their backgrounds, and creates
// the Spin linked to the product for later push-back. Idempotent per
// product: re-importing returns the existing spin instead of duplicating.
// Costs pennies (bg removal only) — the paid generation stays behind an
// explicit start call.
export async function importProductCore(
  userId: string,
  connection: ShopifyConnection,
  productGid: string,
): Promise<string> {
  const existing = await prisma.spin.findFirst({
    where: { userId, shopifyProductGid: productGid },
  });
  if (existing) return existing.id;

  const product = await fetchProduct(connection.shop, await getShopToken(connection), productGid);
  if (!product) throw new Error("Product not found on your store.");
  if (product.imageUrls.length === 0) {
    throw new Error("This product has no photos on Shopify — add at least one photo there first.");
  }

  const cleaned = await Promise.all(
    product.imageUrls.slice(0, 4).map(async (url) => {
      const res = await removeBackgroundFromUrl(url);
      return res.status === "completed" ? (res.cleanedDataUrl ?? null) : null;
    }),
  );
  if (!cleaned[0]) {
    throw new Error("Background removal failed on the product's first photo — try again.");
  }

  const spin = await prisma.spin.create({
    data: {
      userId,
      title: product.title,
      photoFrontUrl: cleaned[0],
      photoBackUrl: cleaned[1] ?? undefined,
      photoLeftUrl: cleaned[2] ?? undefined,
      photoRightUrl: cleaned[3] ?? undefined,
      shopifyProductGid: product.gid,
      shopifyProductHandle: product.handle,
    },
  });
  return spin.id;
}

// One-click embed push: write this spin's id onto its Shopify product as
// the custom.spinr_id metafield — the field the storefront block reads.
export async function pushSpinCore(
  userId: string,
  spinId: string,
): Promise<{ ok: boolean; error?: string }> {
  const spin = await prisma.spin.findUnique({ where: { id: spinId } });
  if (!spin || spin.userId !== userId) return { ok: false, error: "Spin not found." };
  if (spin.status !== "ready") return { ok: false, error: "Generate the spin before pushing it." };
  if (!spin.shopifyProductGid) {
    return { ok: false, error: "This spin isn't linked to a Shopify product (import it from your catalog to link it)." };
  }

  const connection = await prisma.shopifyConnection.findFirst({ where: { userId } });
  if (!connection) return { ok: false, error: "No Shopify store connected." };

  try {
    await setSpinMetafield(
      connection.shop,
      await getShopToken(connection),
      spin.shopifyProductGid,
      spin.id,
    );
  } catch (err) {
    console.error("[shopify-ops] metafield push failed:", err);
    return { ok: false, error: "Shopify rejected the update — try reconnecting your store." };
  }

  await prisma.spin.update({
    where: { id: spin.id },
    data: { pushedToShopifyAt: new Date() },
  });
  return { ok: true };
}

// Start a Spinr Pro subscription. Returns the Shopify confirmation URL the
// merchant must approve on; the return URL records the outcome.
export async function subscribeCore(
  connection: ShopifyConnection,
  returnUrl: string,
): Promise<{ ok: true; confirmationUrl: string } | { ok: false; error: string }> {
  if (connection.subscriptionStatus === "ACTIVE") {
    return { ok: false, error: "You're already on Spinr Pro." };
  }
  try {
    const { confirmationUrl, subscriptionGid, usageLineItemGid } = await createAppSubscription(
      connection.shop,
      await getShopToken(connection),
      returnUrl,
    );
    await prisma.shopifyConnection.update({
      where: { id: connection.id },
      data: {
        subscriptionGid,
        usageLineItemGid,
        subscriptionStatus: "PENDING",
        subscriptionUpdatedAt: new Date(),
      },
    });
    return { ok: true, confirmationUrl };
  } catch (err) {
    console.error("[shopify-ops] subscription create failed:", err);
    return { ok: false, error: "Couldn't start the subscription — try again." };
  }
}

export async function cancelSubscriptionCore(
  connection: ShopifyConnection,
): Promise<{ ok: boolean; error?: string }> {
  if (!connection.subscriptionGid) return { ok: false, error: "No subscription to cancel." };
  try {
    await cancelAppSubscription(
      connection.shop,
      await getShopToken(connection),
      connection.subscriptionGid,
    );
  } catch (err) {
    console.error("[shopify-ops] subscription cancel failed:", err);
    return { ok: false, error: "Shopify rejected the cancellation — try again." };
  }
  await prisma.shopifyConnection.update({
    where: { id: connection.id },
    data: { subscriptionStatus: "CANCELLED", subscriptionUpdatedAt: new Date() },
  });
  return { ok: true };
}
