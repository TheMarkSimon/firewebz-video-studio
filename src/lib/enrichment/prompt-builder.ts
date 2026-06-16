import type { EnrichedBrief } from ".";
import { briefToContextString } from ".";

export interface VideoPromptPackage {
  // The prompt sent to Runway (technical, dense, all visual cues)
  runwayPrompt: string;
  // A human-readable description shown to the SMB before they click Generate
  sceneDescription: {
    title: string;       // "5-second cinematic spotlight of your Urban Walk Sneaker"
    paragraph: string;   // 2-3 sentence story of what they'll see
    mood: string;        // "Effortlessly cool, urban, premium"
    bestFor: string;     // "Instagram Reels and TikTok product launches"
  };
  // What was used (for debugging / future "show prompt" toggle)
  enrichmentSummary: string;
  fellBackToTemplate: boolean;
}

const SYSTEM_PROMPT = `You are an expert short-form video director for small-business product ads.
You write image-to-video prompts that produce cinematic, post-ready Instagram Reels and TikTok content.

You will receive a structured brief about a business and a product. You must output TWO things in JSON:

1. "runwayPrompt": A single dense paragraph (250-700 chars) optimized for Runway Gen-4 image-to-video.
   Rules:
   - Lead with the camera motion and shot type
   - Describe lighting concretely (golden hour, soft window light, studio key + rim, etc.)
   - Describe the setting/scene that complements the product (NOT the product itself — Runway sees the photo)
   - Describe motion: dolly, pan, parallax, rack focus — pick ONE primary motion, keep it smooth
   - Mood adjectives from the brand tone
   - End with technical specs: "Vertical 9:16, ~5 seconds, cinematic depth of field"
   - NEVER: include text overlays, "the brand X", fake logos, dialogue, watermarks
   - NEVER: invent product details not in the brief
   - Keep product identity stable (no morphing, no color change)

2. "sceneDescription": A 4-field object the SMB sees BEFORE generating.
   - "title": Short, e.g. "5-second cinematic spotlight of your {product}"
   - "paragraph": 2-3 sentences in plain English describing what the SMB will see (the scene + motion + mood). NO prompt language. NO mention of "AI" or "model" or "Runway".
   - "mood": 2-4 evocative adjectives separated by commas
   - "bestFor": One short line about which platforms this is best for

Tone: confident, clear, no jargon. Write FOR a small business owner, not for an AI engineer.

Output ONLY valid JSON. No markdown fences. No commentary.`;

function buildUserPrompt(brief: EnrichedBrief, videoStyle: string, durationSeconds: number): string {
  return `Brief:
${briefToContextString(brief)}

Requested video style: ${videoStyle}
Target duration: ${durationSeconds} seconds
Aspect ratio: 9:16 vertical (for Instagram Reels / TikTok)

Generate the JSON now.`;
}

export async function buildVideoPrompt(
  brief: EnrichedBrief,
  videoStyle: string,
  durationSeconds: number,
): Promise<VideoPromptPackage> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return templateFallback(brief, videoStyle, durationSeconds);
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: buildUserPrompt(brief, videoStyle, durationSeconds) }] }],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        temperature: 0.8,
      },
    });

    const text = response.text ?? "";
    const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      runwayPrompt: string;
      sceneDescription: VideoPromptPackage["sceneDescription"];
    };

    return {
      runwayPrompt: parsed.runwayPrompt,
      sceneDescription: parsed.sceneDescription,
      enrichmentSummary: briefToContextString(brief),
      fellBackToTemplate: false,
    };
  } catch {
    return templateFallback(brief, videoStyle, durationSeconds);
  }
}

function templateFallback(brief: EnrichedBrief, videoStyle: string, durationSeconds: number): VideoPromptPackage {
  const business = brief.business.name;
  const tone = brief.business.brandTone.join(", ") || "friendly, bold";
  const productHint = brief.vision?.productGuess ?? "the product";
  const setting = brief.vision?.setting ?? "a clean, well-lit setting";

  const runwayPrompt = [
    `Smooth slow dolly around ${productHint} on ${setting}.`,
    `Soft natural lighting with gentle highlights catching key surfaces.`,
    `Subtle parallax to reveal texture and craftsmanship.`,
    `${tone} mood, ${brief.business.category.toLowerCase()} brand aesthetic.`,
    `Vertical 9:16, ~${durationSeconds} seconds, cinematic depth of field, no text overlays.`,
  ].join(" ");

  return {
    runwayPrompt,
    sceneDescription: {
      title: `${durationSeconds}-second ${videoStyle.toLowerCase()} for ${business}`,
      paragraph: `The camera slowly orbits around your product in ${setting.toLowerCase()}. Soft, natural light catches the surfaces as the lens reveals texture and detail. Ends on a clean hero shot, ready to post.`,
      mood: tone,
      bestFor: "Instagram Reels and TikTok product launches",
    },
    enrichmentSummary: briefToContextString(brief),
    fellBackToTemplate: true,
  };
}
