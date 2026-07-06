"use server";

import { putSession } from "@/lib/session-store";

// Multi-angle onboarding: front is required, back/left/right are optional.
// All values are bg-removed fal.media URLs (or data URLs on the legacy path).
export async function submitOnboarding(formData: FormData): Promise<string> {
  const read = (name: string): string | undefined => {
    const val = formData.get(name);
    return typeof val === "string" && (val.startsWith("data:") || val.startsWith("http"))
      ? val
      : undefined;
  };

  return await putSession({
    businessName: "Product",
    category: "",
    brandTone: [],
    productPhotos: {
      front: read("photo_front"),
      back: read("photo_back"),
      left: read("photo_left"),
      right: read("photo_right"),
    },
  });
}
