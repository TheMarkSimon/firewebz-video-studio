import { NextResponse } from "next/server";
import { getLlmProvider } from "@/lib/providers/llm";

export async function POST() {
  const provider = getLlmProvider();
  try {
    const draft = await provider.generateConcept({
      businessName: "Sample Bakery",
      businessCategory: "Bakery",
      brandTone: ["Friendly", "Local/community"],
      targetAudience: "local families",
      goals: ["Drive store visits"],
      productName: "Chocolate Croissant",
      productDescription: "Flaky, buttery, filled with chocolate.",
      keyBenefit: "Baked fresh every morning",
      platform: "instagram_reels",
      videoStyle: "Product spotlight",
      durationSeconds: 10,
      ctaPreference: "Visit us",
    });
    return NextResponse.json({ ok: true, provider: provider.name, draft });
  } catch (e) {
    return NextResponse.json({ ok: false, provider: provider.name, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
