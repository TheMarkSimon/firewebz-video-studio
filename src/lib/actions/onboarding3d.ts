"use server";

import { putSession } from "@/lib/session-store";

// New 3-step 3D onboarding action.
// Photos are already background-removed and encoded as data URLs on the client
// (see @imgly/background-removal in the wizard). We just stash them in the
// session store keyed by a fresh ID.
export async function submitOnboarding3d(formData: FormData): Promise<string> {
  const businessName = (formData.get("businessName") as string) ?? "";
  const websiteUrl = (formData.get("websiteUrl") as string) || undefined;
  const instagramUrl = (formData.get("instagramUrl") as string) || undefined;
  const tiktokUrl = (formData.get("tiktokUrl") as string) || undefined;
  const category = (formData.get("category") as string) ?? "";

  const productPhotos: { front?: string; back?: string; left?: string; right?: string } = {};
  for (const angle of ["front", "back", "left", "right"] as const) {
    const val = formData.get(`photo_${angle}`);
    // Accept fal.media URLs (bg-removed images now come back as URLs) or
    // data URLs (legacy path). Reject anything else to keep junk out of
    // the session.
    if (typeof val === "string" && (val.startsWith("data:") || val.startsWith("http"))) {
      productPhotos[angle] = val;
    }
  }

  return await putSession({
    businessName,
    category,
    brandTone: [],
    websiteUrl,
    instagramUrl,
    tiktokUrl,
    productPhotos,
  });
}
