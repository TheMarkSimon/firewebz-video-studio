import type { EnrichedBrief } from ".";
import { briefToContextString } from ".";
import { getStyleDef, type VideoStyleKey } from "@/lib/video-styles";

export interface VideoPromptPackage {
  // The prompt sent to Runway (technical, dense, all visual cues)
  runwayPrompt: string;
  // A human-readable description shown to the SMB before they click Generate
  sceneDescription: {
    title: string;       // e.g. "10-second cinematic spotlight of your sneakers"
    paragraph: string;   // 2-3 sentences of what they'll see, written for the SMB
    mood: string;        // "Effortlessly cool, urban, premium"
    bestFor: string;     // "Instagram Reels and TikTok product launches"
  };
  enrichmentSummary: string;
  fellBackToTemplate: boolean;
}

const SYSTEM_PROMPT = `You are an expert short-form video director writing prompts for Runway Gen-4 Turbo, an IMAGE-TO-VIDEO model.

CRITICAL CONSTRAINTS — read carefully. The model does NOT generate new scenes from scratch. It animates the user's uploaded product photo. So:

✓ YOU CAN describe: camera motion, lighting changes, depth of field, lens choice, subtle ambient motion (steam, particles, light shifts), surface highlights, fabric movement.

✗ YOU CANNOT describe: people the photo doesn't already show, new locations (e.g., "stadium", "city street"), new objects, products morphing into something else, dialogue, on-screen text, action sequences ("athlete running"), the brand's logo being added.

If the source photo is a sneaker on a white studio background, the video will be a sneaker on a white studio background with motion — NOT a sneaker on a runner's foot in a stadium.

Your job: write a prompt that maximizes what Runway CAN do (gorgeous camera + lighting) within those limits, AND a user-facing description that HONESTLY reflects that.

Output TWO things in strict JSON:

1. "runwayPrompt" — single dense paragraph, 200-500 chars, optimized for Runway:
   - Lead with the camera motion (specified by the user's chosen style)
   - Concrete lighting (golden hour, soft window light, rim light + key, etc.)
   - Depth of field / lens cue (shallow DOF, 50mm, etc.)
   - Mood adjectives from the brand tone
   - End with: "Vertical 9:16, ~{N} seconds, cinematic depth of field, product centered and identifiable, no text overlays, no people added, no scene changes"

2. "sceneDescription" — 4 fields the SMB sees BEFORE generating. CRUCIAL: this must match what Runway will actually produce. Do NOT promise athletes, stadiums, models, or new settings. If you describe something here, the video must contain it.
   - "title": e.g. "10-second product spotlight of your {what you can see in the photo, e.g. sneakers}"
   - "paragraph": 2-3 sentences in plain English. Describe ONLY camera move + lighting + mood. Like: "Slow orbit around your sneakers. Soft natural light catches the leather as the camera moves. Ends on a clean hero shot."
   - "mood": 2-4 evocative adjectives
   - "bestFor": one line, which platforms/use cases

Tone: confident, warm, no jargon. Output ONLY valid JSON. No markdown fences.`;

function buildUserPrompt(brief: EnrichedBrief, styleKey: VideoStyleKey, durationSeconds: number): string {
  const style = getStyleDef(styleKey);
  return `Brief:
${briefToContextString(brief)}

User's chosen video style: ${style.label}
Style directive (the camera/motion approach to use): ${style.promptDirective}
User-facing description hint: ${style.userDescription}

Target duration: ${durationSeconds} seconds
Aspect ratio: 9:16 vertical (for Instagram Reels / TikTok)

Remember: Runway can ONLY animate the photo the user uploaded. Do not invent humans, locations, or new objects.

Generate the JSON now.`;
}

export async function buildVideoPrompt(
  brief: EnrichedBrief,
  videoStyle: VideoStyleKey | string,
  durationSeconds: number,
): Promise<VideoPromptPackage> {
  const styleKey: VideoStyleKey = (getStyleDef(videoStyle).key);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return templateFallback(brief, styleKey, durationSeconds);
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const { withGeminiRetry } = await import("@/lib/providers/llm/retry");
    const ai = new GoogleGenAI({ apiKey });

    const response = await withGeminiRetry(
      () => ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: buildUserPrompt(brief, styleKey, durationSeconds) }] }],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          temperature: 0.7, // tighter than before — we want fidelity, not creativity
        },
      }),
      { label: "prompt-builder" },
    );

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
    return templateFallback(brief, styleKey, durationSeconds);
  }
}

function templateFallback(brief: EnrichedBrief, styleKey: VideoStyleKey, durationSeconds: number): VideoPromptPackage {
  const style = getStyleDef(styleKey);
  const business = brief.business.name;
  const tone = brief.business.brandTone.join(", ") || "friendly, bold";
  const productHint = brief.vision?.productGuess ?? "your product";

  const runwayPrompt = [
    style.promptDirective,
    `${tone} mood, aesthetic appropriate for ${brief.business.category.toLowerCase()}.`,
    `Vertical 9:16, ~${durationSeconds} seconds, cinematic depth of field, product centered and identifiable, no text overlays, no people added, no scene changes.`,
  ].join(" ");

  return {
    runwayPrompt,
    sceneDescription: {
      title: `${durationSeconds}-second ${style.label.toLowerCase()} of your ${productHint}`,
      paragraph: style.userDescription,
      mood: tone,
      bestFor: "Instagram Reels and TikTok product posts",
    },
    enrichmentSummary: briefToContextString(brief),
    fellBackToTemplate: true,
  };
}
