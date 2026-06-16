import type { VideoGenerationProvider } from ".";
import path from "node:path";
import fs from "node:fs/promises";

function buildPrompt(input: Parameters<VideoGenerationProvider["generateVideo"]>[0]): string {
  return [
    `Short-form ${input.aspectRatio} vertical video, ~${input.durationSeconds} seconds.`,
    `Style: ${input.videoStyle} for ${input.businessName} (${input.businessCategory}).`,
    `Product: ${input.productName}.${input.productDescription ? " " + input.productDescription : ""}`,
    `Target audience: ${input.targetAudience}. Brand tone: ${input.brandTone}.`,
    `Hook: ${input.hook}`,
    `Storyboard:`,
    ...input.storyboard.map((s, i) => `${i + 1}. ${s}`),
    `On-screen text cues: ${input.onScreenText.join(" | ")}`,
    `Call to action: ${input.cta}.`,
    `Constraints: keep product details accurate to the reference image. Brand-safe. No fake claims, no invented discounts, no fake logos.`,
  ].join("\n");
}

export const veoVideo: VideoGenerationProvider = {
  name: "gemini_veo",
  isConfigured: () => Boolean(process.env.GEMINI_API_KEY),
  async generateVideo(input) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { provider: "gemini_veo", status: "failed", errorMessage: "GEMINI_API_KEY is not set" };
    }
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      // Use first product image as the visual anchor if present
      let imagePart: { imageBytes: string; mimeType: string } | undefined;
      if (input.productImagePaths[0]) {
        try {
          const bytes = await fs.readFile(input.productImagePaths[0]);
          const ext = path.extname(input.productImagePaths[0]).toLowerCase();
          const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
          imagePart = { imageBytes: bytes.toString("base64"), mimeType };
        } catch {
          // continue without image
        }
      }

      // Start a long-running Veo operation. The exact model name may change with Veo availability.
      // Default to veo-3.0-generate-001; configurable via env if needed.
      const model = process.env.GEMINI_VEO_MODEL ?? "veo-3.0-generate-001";

      // generateVideos is a long-running operation on the GenAI SDK
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let op: any = await (ai.models as any).generateVideos({
        model,
        prompt: buildPrompt(input),
        image: imagePart,
        config: { aspectRatio: input.aspectRatio, durationSeconds: input.durationSeconds },
      });

      const start = Date.now();
      const maxMs = 5 * 60 * 1000;
      while (!op?.done) {
        if (Date.now() - start > maxMs) {
          return { provider: "gemini_veo", status: "failed", errorMessage: "Veo generation timed out after 5 minutes" };
        }
        await new Promise((r) => setTimeout(r, 5000));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        op = await (ai as any).operations.get(op);
      }

      const videoUri: string | undefined = op?.response?.generatedVideos?.[0]?.video?.uri;
      if (!videoUri) {
        return {
          provider: "gemini_veo",
          status: "failed",
          errorMessage: "Veo returned no video URI",
          rawResponse: op,
        };
      }

      const outDir = process.env.GENERATED_VIDEO_DIR ?? "./storage/generated-videos";
      await fs.mkdir(outDir, { recursive: true });
      const filename = `veo-${Date.now()}.mp4`;
      const absPath = path.resolve(outDir, filename);

      const res = await fetch(`${videoUri}&key=${apiKey}`);
      if (!res.ok) {
        return { provider: "gemini_veo", status: "failed", errorMessage: `Download failed: ${res.status}` };
      }
      const buf = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(absPath, buf);

      return {
        provider: "gemini_veo",
        status: "completed",
        videoFilePath: path.relative(process.cwd(), absPath),
        durationSeconds: input.durationSeconds,
      };
    } catch (err) {
      return {
        provider: "gemini_veo",
        status: "failed",
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
