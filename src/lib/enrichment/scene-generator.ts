// Stage 1 of the two-stage video pipeline: generate a lifestyle scene image
// containing the user's product, to be used as the starting frame for Runway.
//
// We try multiple image-generation models in order until one returns an image.
// All errors are surfaced (not swallowed) so the diagnostics panel can show
// what actually failed.

import type { EnrichedBrief } from ".";
import { briefToContextString } from ".";
import { getStyleDef, type VideoStyleKey } from "@/lib/video-styles";

export interface GeneratedScene {
  imageDataUrl: string;          // data:image/png;base64,... — the lifestyle photo
  imagePrompt: string;            // the prompt we used
  sceneDescription: string;       // 1-2 sentence human-readable description for the UI
  modelUsed?: string;             // which model actually produced the image
  attempts?: Array<{ model: string; error: string }>;
  error?: string;
}

const STYLE_SCENE_DIRECTIVES: Record<VideoStyleKey, string> = {
  product_spotlight:
    "A cinematic product hero shot. Place the product in a beautiful but minimal setting (clean surface, dramatic light). The product is the focal point. NO people unless the product is something a person clearly wears or holds.",
  spin_360:
    "A clean studio shot for a 360-degree spin. Place the product centered on a neutral seamless background with soft, even lighting. NO people. NO complex environment. This is for a turntable rotation.",
  cinematic_closeup:
    "A dramatic editorial close-up. Place the product in an evocative scene appropriate for the brand — e.g. shoes on a leather chair near a window with morning light, a watch on a marble surface with reflections. NO people. Premium magazine aesthetic.",
  lifestyle_motion:
    "A real-world lifestyle scene in use. If the product is wearable or handheld, INCLUDE a person interacting with it naturally (model wearing the shoes mid-stride, hand reaching for the coffee cup, person applying the skincare). If the product is decor/static, place it in a styled real-world environment (cafe table, kitchen counter, living room). This is the scene Runway will animate.",
};

const SCENE_SYSTEM_PROMPT = `You write image-generation prompts that create compelling marketing scenes for small business products.

INPUT: business context + a product photo + the chosen video style.
OUTPUT: a single prompt that creates a lifestyle/scene photo containing the product.

Rules:
- The product must appear in the generated image, recognizable as the same product class.
- The scene/composition matches the chosen video style directive.
- Match the brand tone in lighting, mood, environment, model styling.
- Be specific and concrete: name the setting, the lighting (golden hour, soft window light), the camera angle (wide shot, close-up, low angle), the mood (energetic, refined, playful).
- If a person is included, describe them in a way that matches the brand's target audience. Do NOT name real people. Do NOT use ethnicity terms — describe clothing/styling only.
- Composition: vertical 9:16, suitable as the FIRST FRAME of a video.
- Photorealistic, high quality. No text, no logos, no watermarks.

Output strict JSON:
{
  "imagePrompt": "the full image-generation prompt, 80-300 chars",
  "sceneDescription": "one-sentence human-readable description for the user"
}`;

function buildSceneUserPrompt(brief: EnrichedBrief, styleKey: VideoStyleKey): string {
  const style = getStyleDef(styleKey);
  return `Business context:
${briefToContextString(brief)}

Chosen video style: ${style.label}
Scene directive: ${STYLE_SCENE_DIRECTIVES[styleKey]}

Generate the JSON now.`;
}

async function writeImagePrompt(brief: EnrichedBrief, styleKey: VideoStyleKey): Promise<{
  imagePrompt: string;
  sceneDescription: string;
} | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const { withGeminiRetry } = await import("@/lib/providers/llm/retry");
    const ai = new GoogleGenAI({ apiKey });

    const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
      { text: buildSceneUserPrompt(brief, styleKey) },
    ];
    if (brief.productImagePath?.startsWith("data:")) {
      const m = brief.productImagePath.match(/^data:([^;]+);base64,(.+)$/);
      if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
    }

    const response = await withGeminiRetry(
      () => ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction: SCENE_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          temperature: 0.85,
        },
      }),
      { label: "scene-prompt" },
    );
    const text = response.text ?? "";
    const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("[scene-generator] writeImagePrompt failed:", err);
    return null;
  }
}

// Try each image model in order, returning the first one that produces bytes.
// Each error is captured into `attempts` so the diagnostics panel can show
// exactly what went wrong with each.
async function tryImagenModels(prompt: string): Promise<{
  imageDataUrl: string | null;
  modelUsed?: string;
  attempts: Array<{ model: string; error: string }>;
}> {
  const attempts: Array<{ model: string; error: string }> = [];
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { imageDataUrl: null, attempts: [{ model: "n/a", error: "GEMINI_API_KEY not set" }] };
  }

  // Order matters: try the most common/cheap option first.
  const models = [
    "imagen-3.0-generate-002",
    "imagen-3.0-fast-generate-001",
    "imagen-4.0-generate-001",
    "imagen-4.0-generate-preview-06-06",
  ];

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey });

  for (const model of models) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response: any = await (ai.models as any).generateImages({
        model,
        prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: "9:16",
          personGeneration: "allow_adult",
        },
      });
      const imageB64 = response?.generatedImages?.[0]?.image?.imageBytes;
      if (imageB64) {
        return {
          imageDataUrl: `data:image/png;base64,${imageB64}`,
          modelUsed: model,
          attempts,
        };
      }
      // Imagen returned a response but no image — usually a safety filter
      const rai =
        response?.generatedImages?.[0]?.raiFilteredReason ??
        response?.raiFilteredReason ??
        "Empty response (likely safety filter)";
      attempts.push({ model, error: String(rai) });
    } catch (err) {
      // Capture the full error including HTTP status if present
      const e = err as { message?: string; status?: number; code?: number; cause?: unknown };
      const status = e?.status ?? e?.code ?? "";
      const msg = e?.message ?? String(err);
      const causeStr = e?.cause ? ` | cause: ${JSON.stringify(e.cause).slice(0, 200)}` : "";
      attempts.push({ model, error: `${status ? `[${status}] ` : ""}${msg}${causeStr}`.slice(0, 500) });
    }
  }

  // Last resort: try Gemini 2.5 Flash Image (the new multimodal image gen),
  // which uses a totally different endpoint. Often available when Imagen isn't.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await (ai.models as any).generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseModalities: ["IMAGE"] },
    });
    const parts = response?.candidates?.[0]?.content?.parts ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imagePart = parts.find((p: any) => p.inlineData?.data);
    if (imagePart) {
      const mimeType = imagePart.inlineData.mimeType ?? "image/png";
      return {
        imageDataUrl: `data:${mimeType};base64,${imagePart.inlineData.data}`,
        modelUsed: "gemini-2.5-flash-image",
        attempts,
      };
    }
    attempts.push({ model: "gemini-2.5-flash-image", error: "No image part in response" });
  } catch (err) {
    const e = err as { message?: string; status?: number; code?: number; cause?: unknown };
    const status = e?.status ?? e?.code ?? "";
    const msg = e?.message ?? String(err);
    attempts.push({ model: "gemini-2.5-flash-image", error: `${status ? `[${status}] ` : ""}${msg}`.slice(0, 500) });
  }

  return { imageDataUrl: null, attempts };
}

export async function generateLifestyleScene(
  brief: EnrichedBrief,
  styleKey: VideoStyleKey,
): Promise<GeneratedScene | null> {
  const promptInfo = await writeImagePrompt(brief, styleKey);
  if (!promptInfo) return null;

  const result = await tryImagenModels(promptInfo.imagePrompt);

  if (!result.imageDataUrl) {
    const summary = result.attempts.map((a) => `  • ${a.model}: ${a.error}`).join("\n");
    return {
      imageDataUrl: "",
      imagePrompt: promptInfo.imagePrompt,
      sceneDescription: promptInfo.sceneDescription,
      attempts: result.attempts,
      error: `All image models failed:\n${summary}`,
    };
  }

  return {
    imageDataUrl: result.imageDataUrl,
    imagePrompt: promptInfo.imagePrompt,
    sceneDescription: promptInfo.sceneDescription,
    modelUsed: result.modelUsed,
    attempts: result.attempts,
  };
}
