"use server";

import { prisma } from "@/lib/db";
import { toJsonArray } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import fs from "node:fs/promises";
import path from "node:path";

export interface CreateBusinessInput {
  name: string;
  websiteUrl?: string;
  instagramHandle?: string;
  tiktokHandle?: string;
  category: string;
  description: string;
  location?: string;
  targetAudience: string;
  brandTone: string[];
  goals: string[];
  platforms: string[];
}

export async function createBusiness(input: CreateBusinessInput) {
  const business = await prisma.business.create({
    data: {
      ...input,
      websiteUrl: input.websiteUrl || null,
      brandTone: toJsonArray(input.brandTone),
      goals: toJsonArray(input.goals),
      platforms: toJsonArray(input.platforms),
    },
  });
  return business.id;
}

export async function createProductWithImages(formData: FormData) {
  const businessId = formData.get("businessId") as string;
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || undefined;
  const category = (formData.get("category") as string) || undefined;
  const price = (formData.get("price") as string) || undefined;
  const productUrl = (formData.get("productUrl") as string) || undefined;
  const keyBenefit = (formData.get("keyBenefit") as string) || undefined;
  const promotion = (formData.get("promotion") as string) || undefined;

  // On serverless (Vercel) the local filesystem is read-only across requests,
  // so store image bytes as data URLs inline in the DB row. Locally we keep
  // writing to ./storage/uploads for easier debugging.
  const isServerless = Boolean(process.env.VERCEL);
  const uploadDir = process.env.UPLOAD_DIR ?? "./storage/uploads";
  if (!isServerless) await fs.mkdir(uploadDir, { recursive: true });

  const files = formData.getAll("images") as File[];
  const savedPaths: string[] = [];
  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue;
    const buf = Buffer.from(await file.arrayBuffer());

    if (isServerless) {
      // Cap at 1.5MB raw / ~2MB base64 to stay under SQLite row limits + URL routing
      if (buf.byteLength > 1_500_000) continue;
      const mime = file.type || "image/jpeg";
      savedPaths.push(`data:${mime};base64,${buf.toString("base64")}`);
    } else {
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const abs = path.resolve(uploadDir, safeName);
      await fs.writeFile(abs, buf);
      savedPaths.push(path.relative(process.cwd(), abs));
    }
  }

  const product = await prisma.product.create({
    data: {
      businessId,
      name,
      description,
      category,
      price,
      productUrl,
      keyBenefit,
      promotion,
      imagePaths: toJsonArray(savedPaths),
    },
  });

  revalidatePath("/dashboard");
  return product.id;
}

export async function finishOnboarding(businessId: string, productId: string) {
  redirect(`/concepts?businessId=${businessId}&productId=${productId}&fresh=1`);
}
