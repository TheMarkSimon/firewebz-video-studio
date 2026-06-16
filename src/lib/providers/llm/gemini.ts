import type { LlmProvider, ConceptInput } from ".";
import type { ConceptDraft } from "@/lib/types";
import { withGeminiRetry } from "./retry";

const SYSTEM_PROMPT = `You are an expert short-form video strategist for small businesses.
You write hooks, storyboards, captions, and CTAs that drive views and saves on Instagram Reels, TikTok, and YouTube Shorts.
Never invent product details that weren't given. Never invent discounts. Keep brand-safe.
Return ONLY valid JSON matching the requested schema.`;

function buildPrompt(input: ConceptInput): string {
  return `Create one short-form video concept.

Business: ${input.businessName}
Category: ${input.businessCategory}
Brand tone: ${input.brandTone.join(", ")}
Target audience: ${input.targetAudience}
Goals: ${input.goals.join(", ")}

Product: ${input.productName}
Description: ${input.productDescription ?? "n/a"}
Key benefit: ${input.keyBenefit ?? "n/a"}
Price: ${input.price ?? "n/a"}
Promotion: ${input.promotion ?? "none"}

Platform: ${input.platform}
Video style: ${input.videoStyle}
Duration target: ${input.durationSeconds}s
CTA preference: ${input.ctaPreference ?? "Shop now"}

Return JSON with this exact shape:
{
  "title": string,
  "hook": string,
  "storyboard": string[],     // 4-6 scene descriptions
  "onScreenText": string[],   // 3-5 short text overlays
  "voiceoverScript": string,
  "caption": string,
  "hashtags": string[],       // 4-6 hashtags including the # prefix
  "cta": string,
  "performanceHypothesis": string
}`;
}

export const geminiLlm: LlmProvider = {
  name: "gemini",
  isConfigured: () => Boolean(process.env.GEMINI_API_KEY),
  async generateConcept(input) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const response = await withGeminiRetry(
      () => ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          temperature: 0.9,
        },
      }),
      { label: "concept" },
    );

    const text = response.text ?? "";
    const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(cleaned) as ConceptDraft;
    return parsed;
  },
};
