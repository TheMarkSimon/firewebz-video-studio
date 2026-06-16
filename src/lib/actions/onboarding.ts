"use server";

import { putSession } from "@/lib/session-store";

export async function submitOnboarding(formData: FormData): Promise<string> {
  const businessName = (formData.get("businessName") as string) ?? "";
  const websiteUrl = (formData.get("websiteUrl") as string) || undefined;
  const instagramUrl = (formData.get("instagramUrl") as string) || undefined;
  const tiktokUrl = (formData.get("tiktokUrl") as string) || undefined;
  const category = (formData.get("category") as string) ?? "";
  const brandToneRaw = (formData.get("brandTone") as string) ?? "[]";
  let brandTone: string[] = [];
  try { brandTone = JSON.parse(brandToneRaw); } catch { brandTone = []; }
  const videoStyle = (formData.get("videoStyle") as string) || undefined;

  // Convert first uploaded image to a data URL we can pass around
  let productImageDataUrl: string | undefined;
  const files = formData.getAll("images") as File[];
  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue;
    if (file.size > 1_500_000) continue; // cap at ~1.5MB
    const buf = Buffer.from(await file.arrayBuffer());
    const mime = file.type || "image/jpeg";
    productImageDataUrl = `data:${mime};base64,${buf.toString("base64")}`;
    break; // first usable image only
  }

  return await putSession({
    businessName,
    category,
    brandTone,
    videoStyle,
    websiteUrl,
    instagramUrl,
    tiktokUrl,
    productImageDataUrl,
  });
}
