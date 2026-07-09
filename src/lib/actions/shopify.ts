"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/auth";

// Remove the store connection. Note: this only forgets the token on our
// side — merchants can also uninstall the app from their Shopify admin,
// which revokes the token at the source.
export async function disconnectShopify(shop: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) throw new Error("Please sign in.");
  await prisma.shopifyConnection.deleteMany({ where: { shop, userId } });
  revalidatePath("/studio");
}
