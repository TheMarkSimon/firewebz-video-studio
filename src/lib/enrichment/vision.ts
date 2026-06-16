import fs from "node:fs/promises";
import path from "node:path";

export interface VisionDescription {
  description: string;
  productGuess?: string;
  dominantColors?: string;
  setting?: string;
  error?: string;
}

const VISION_PROMPT = `Describe this product photo in 3 short, factual sentences:
1. What the product is (be specific — type, material, style).
2. The dominant colors, finish, and notable visual features.
3. The current setting/background in the photo.
Do NOT speculate about the brand. Do NOT invent details. Keep it grounded and concrete.
Return JSON: { "description": string, "productGuess": string, "dominantColors": string, "setting": string }`;

export async function describeImageWithVision(imageRef: string): Promise<VisionDescription | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    let base64: string;
    let mimeType: string;

    if (imageRef.startsWith("data:")) {
      // data:image/jpeg;base64,XXXX — parse inline
      const m = imageRef.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) return { description: "", error: "Invalid data URL" };
      mimeType = m[1];
      base64 = m[2];
    } else {
      const bytes = await fs.readFile(imageRef);
      const ext = path.extname(imageRef).toLowerCase();
      mimeType =
        ext === ".png" ? "image/png" :
        ext === ".webp" ? "image/webp" :
        ext === ".gif" ? "image/gif" :
        "image/jpeg";
      base64 = bytes.toString("base64");
    }

    const { GoogleGenAI } = await import("@google/genai");
    const { withGeminiRetry } = await import("@/lib/providers/llm/retry");
    const ai = new GoogleGenAI({ apiKey });

    const response = await withGeminiRetry(
      () => ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
          role: "user",
          parts: [
            { text: VISION_PROMPT },
            { inlineData: { data: base64, mimeType } },
          ],
        }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      }),
      { label: "vision" },
    );

    const text = response.text ?? "";
    const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(cleaned) as VisionDescription;
    return parsed;
  } catch (err) {
    return {
      description: "",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
