// Stage 1 of the two-stage video pipeline: generate a lifestyle scene image
// containing the user's product, to be used as the starting frame for Runway.
//
// We give Gemini the product photo + brand context + the chosen video style,
// and ask it to write an Imagen prompt that places the product in a scene
// matching the style (e.g. a model walking down a city street wearing the shoes).
// Then we call Imagen 3 to generate the actual lifestyle image.

import type { EnrichedBrief } from ".";
import { briefToContextString } from ".";
import { getStyleDef, type VideoStyleKey } from "@/lib/video-styles";

export interface GeneratedScene {
  imageDataUrl: string;          // data:image/png;base64,... — the lifestyle photo
  imagePrompt: string;            // the Imagen prompt we used (for debugging / display)
  sceneDescription: string;       // 1-2 sentence human-readable description for the UI
  error?: string;
}

// Style-specific guidance for what kind of lifestyle scene to create.
// These influence the Imagen prompt.
const STYLE_SCENE_DIRECTIVES: Record<VideoStyleKey, string> = {
  product_spotlight:
    "A cinematic product hero shot. Place the product in a beautiful but minimal setting (clean surface, dramatic light). The product is the focal point. NO people unless the product is something a person clearly wears or holds.",
  spin_360:
    "A clean studio shot for a 360-degree spin. Place the product centered on a neutral seamless background with soft, even lighting. NO people. NO complex environment. This is for a turntable rotation.",
  cinematic_closeup:
    "A dramatic editorial close-up. Place the product in an evocative scene appropriate for the brand — e.g. shoes on a leather chair near a window with morning light, a watch on a marble surface with reflections. NO people. Premium magazine aesthetic.",
  lifestyle_motion:
    "A real-world lifestyle scene in use. If the product is wearable or handheld, INCLUDE a person interacting with it naturally (model wearing the shoes mid-stride, hand reaching for the coffee cup, person applying the skincare). If the product is decor/static, place it in a styled real-world environment (cafe table, kitchen counter, living room). This is the scene Runway will animate, so include the action/motion the camera will capture.",
};

const SCENE_SYSTEM_PROMPT = `You write image-generation prompts for Imagen 3 that create compelling marketing scenes for small business products.

INPUT: business context + a product photo + the chosen video style.
OUTPUT: a single Imagen prompt that creates a lifestyle/scene photo containing the product.

Rules:
- The product must appear in the generated image, recognizable as the same product class (e.g. if input is a white sneaker, output shows a white sneaker — small details may vary).
- The scene/composition matches the chosen video style directive provided.
- Match the brand tone in lighting, mood, environment, model styling.
- Be specific and concrete: name the setting, the lighting (golden hour, soft window light, etc.), the camera angle (wide shot, close-up, low angle), the mood (energetic, refined, playful).
- If a person is included, describe them in a way that matches the brand's target audience.
- Composition: vertical 9:16, suitable as the FIRST FRAME of a video.
- Photorealistic, high quality. No text, no logos, no watermarks.

Output strict JSON:
{
  "imagePrompt": "the full Imagen prompt, 80-300 chars",
  "sceneDescription": "one-sentence human-readable description for the user, e.g. 'A model in athletic wear mid-stride on a Brooklyn sidewalk at golden hour, wearing your sneakers.'"
}`;

function buildSceneUserPrompt(brief: EnrichedBrief, styleKey: VideoStyleKey): string {
  const style = getStyleDef(styleKey);
  return `Business context:
${briefToContextString(brief)}

Chosen video style: ${style.label}
Scene directive: ${STYLE_SCENE_DIRECTIVES[styleKey]}

Generate the JSON now.`;
}

async function writeImagenPrompt(brief: EnrichedBrief, styleKey: VideoStyleKey): Promise<{
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

    // Attach the product photo so Gemini knows what the product looks like
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
    console.error("[scene-generator] writeImagenPrompt failed:", err);
    return null;
  }
}

async function callImagen(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const { withGeminiRetry } = await import("@/lib/providers/llm/retry");
    const ai = new GoogleGenAI({ apiKey });

    // Imagen 3 via the GenAI SDK
    const response = await withGeminiRetry(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => (ai.models as any).generateImages({
        model: "imagen-3.0-generate-002",
        prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: "9:16",
          personGeneration: "allow_adult",
        },
      }),
      { label: "imagen" },
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generated: any = response;
    const imageB64 = generated?.generatedImages?.[0]?.image?.imageBytes;
    if (!imageB64) {
      console.error("[scene-generator] Imagen returned no image bytes", JSON.stringify(generated).slice(0, 500));
      return null;
    }
    return `data:image/png;base64,${imageB64}`;
  } catch (err) {
    console.error("[scene-generator] callImagen failed:", err);
    return null;
  }
}

export async function generateLifestyleScene(
  brief: EnrichedBrief,
  styleKey: VideoStyleKey,
): Promise<GeneratedScene | null> {
  const promptInfo = await writeImagenPrompt(brief, styleKey);
  if (!promptInfo) return null;
  const imageDataUrl = await callImagen(promptInfo.imagePrompt);
  if (!imageDataUrl) {
    return {
      imageDataUrl: "",
      imagePrompt: promptInfo.imagePrompt,
      sceneDescription: promptInfo.sceneDescription,
      error: "Imagen did not return an image",
    };
  }
  return {
    imageDataUrl,
    imagePrompt: promptInfo.imagePrompt,
    sceneDescription: promptInfo.sceneDescription,
  };
}
