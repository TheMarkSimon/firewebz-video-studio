"use server";

import { putSession } from "@/lib/session-store";

// One-photo onboarding: stashes the (bg-removed) front photo URL under a
// fresh session id and hands the id back to the client for redirect.
export async function submitOnboarding(formData: FormData): Promise<string> {
  const frontVal = formData.get("photo_front");
  const front = typeof frontVal === "string" && (frontVal.startsWith("data:") || frontVal.startsWith("http"))
    ? frontVal
    : undefined;

  return await putSession({
    businessName: "Product",
    category: "",
    brandTone: [],
    productPhotos: { front },
  });
}
