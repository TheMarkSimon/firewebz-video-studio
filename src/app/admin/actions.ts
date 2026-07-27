"use server";

// Admin-only server actions. Same gate as the admin page: emails listed in
// ADMIN_EMAILS. Credit grants are the support lever ("generation looked
// bad", "goodwill after refund") — always logged; negative deltas claw
// back credits after an external refund.

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "marksimanduyev@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

async function requireAdmin(): Promise<string> {
  const user = await getSessionUser();
  const dbUser = user
    ? await prisma.user.findUnique({ where: { id: user.id }, select: { email: true } })
    : null;
  const email = dbUser?.email?.toLowerCase();
  if (!user || !email || !ADMIN_EMAILS.includes(email)) throw new Error("Not authorized");
  return email;
}

export async function grantCredits(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const delta = parseInt(String(formData.get("delta") ?? ""), 10);
  if (!userId || !Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 100) return;

  await prisma.user.update({
    where: { id: userId },
    data: { extraCredits: { increment: delta } },
  });
  console.error(`[admin] ${admin} granted ${delta} credits to user ${userId}`);
  revalidatePath("/admin");
}
