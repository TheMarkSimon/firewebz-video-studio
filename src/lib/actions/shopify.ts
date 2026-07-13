"use server";

// Thin Google-auth wrappers around lib/shopify-ops.ts (the shared core,
// also used by the embedded admin app's session-token routes).

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";
import { getAppOrigin } from "@/lib/app-origin";
import {
  cancelSubscriptionCore,
  importProductCore,
  pushSpinCore,
  subscribeCore,
} from "@/lib/shopify-ops";

// Remove the store connection. Note: this only forgets the token on our
// side — merchants can also uninstall the app from their Shopify admin,
// which revokes the token at the source.
export async function disconnectShopify(shop: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) throw new Error("Please sign in.");
  await prisma.shopifyConnection.deleteMany({ where: { shop, userId } });
  revalidatePath("/studio");
}

export async function startShopifySubscription(): Promise<
  { ok: true; confirmationUrl: string } | { ok: false; error: string }
> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Please sign in." };

  const connection = await prisma.shopifyConnection.findFirst({ where: { userId } });
  if (!connection) return { ok: false, error: "No Shopify store connected." };

  const origin = getAppOrigin();
  if (!origin) return { ok: false, error: "Server origin not configured." };

  return subscribeCore(connection, `${origin}/api/shopify/billing/callback`);
}

export async function cancelShopifySubscription(): Promise<{ ok: boolean; error?: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Please sign in." };

  const connection = await prisma.shopifyConnection.findFirst({ where: { userId } });
  if (!connection) return { ok: false, error: "No subscription to cancel." };

  const result = await cancelSubscriptionCore(connection);
  if (result.ok) revalidatePath("/studio");
  return result;
}

export async function importShopifyProduct(productGid: string): Promise<string> {
  const userId = await getUserId();
  if (!userId) throw new Error("Please sign in.");

  const connection = await prisma.shopifyConnection.findFirst({ where: { userId } });
  if (!connection) throw new Error("No Shopify store connected.");

  const spinId = await importProductCore(userId, connection, productGid);
  revalidatePath("/studio");
  revalidatePath("/studio/products");
  return spinId;
}

export async function pushSpinToShopify(
  spinId: string,
): Promise<{ ok: boolean; error?: string }> {
  const userId = await getUserId();
  if (!userId) return { ok: false, error: "Please sign in." };

  const result = await pushSpinCore(userId, spinId);
  if (result.ok) revalidatePath("/studio/products");
  return result;
}
