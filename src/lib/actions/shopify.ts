"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { removeBackgroundFromUrl } from "@/lib/actions/remove-bg";
import { fetchProduct, setSpinMetafield } from "@/lib/shopify";

// Remove the store connection. Note: this only forgets the token on our
// side — merchants can also uninstall the app from their Shopify admin,
// which revokes the token at the source.
export async function disconnectShopify(shop: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) throw new Error("Please sign in.");
  await prisma.shopifyConnection.deleteMany({ where: { shop, userId } });
  revalidatePath("/studio");
}

// Catalog import: turn a Shopify product into a Spin draft. Pulls up to 4
// product photos (merchant's order: 1st→front, 2nd→back, 3rd→left,
// 4th→right — editable afterwards), removes their backgrounds, and creates
// the Spin linked to the product for later push-back. Idempotent per
// product: re-importing returns the existing spin instead of duplicating.
// Costs pennies (bg removal only) — the $0.5 generation stays behind the
// user's explicit click on /generate.
export async function importShopifyProduct(productGid: string): Promise<string> {
  const userId = await getUserId();
  if (!userId) throw new Error("Please sign in.");

  const connection = await prisma.shopifyConnection.findFirst({ where: { userId } });
  if (!connection) throw new Error("No Shopify store connected.");

  const existing = await prisma.spin.findFirst({
    where: { userId, shopifyProductGid: productGid },
  });
  if (existing) return existing.id;

  const product = await fetchProduct(connection.shop, connection.accessToken, productGid);
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
  revalidatePath("/studio");
  revalidatePath("/studio/products");
  return spin.id;
}

// One-click embed push: write this spin's id onto its Shopify product as
// the custom.spinr_id metafield — the field the storefront block reads.
export async function pushSpinToShopify(
  spinId: string,
): Promise<{ ok: boolean; error?: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Please sign in." };

  const spin = await prisma.spin.findUnique({ where: { id: spinId } });
  if (!spin || spin.userId !== userId) return { ok: false, error: "Spin not found." };
  if (spin.status !== "ready") return { ok: false, error: "Generate the spin before pushing it." };
  if (!spin.shopifyProductGid) {
    return { ok: false, error: "This spin isn't linked to a Shopify product (import it from your catalog to link it)." };
  }

  const connection = await prisma.shopifyConnection.findFirst({ where: { userId } });
  if (!connection) return { ok: false, error: "No Shopify store connected." };

  try {
    await setSpinMetafield(connection.shop, connection.accessToken, spin.shopifyProductGid, spin.id);
  } catch (err) {
    console.error("[shopify] metafield push failed:", err);
    return { ok: false, error: "Shopify rejected the update — try reconnecting your store." };
  }

  await prisma.spin.update({
    where: { id: spin.id },
    data: { pushedToShopifyAt: new Date() },
  });
  revalidatePath("/studio/products");
  return { ok: true };
}
