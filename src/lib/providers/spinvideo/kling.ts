// Kling v3 Pro image-to-video provider (fal.ai).
// Prompt/params verified via scripts/probe-kling.mjs — the constant-velocity
// wording + locked-off camera negative_prompt consistently produced a full
// 360° rotation with acceptable end-of-clip stability.

import type { SpinVideoInput, SpinVideoProvider, SpinVideoResult } from "./types";
import { extractFramesFromVideo } from "./extract-frames";

const MODEL_ID = "fal-ai/kling-video/v3/pro/image-to-video";

// "Turntable" was removed from the prompt on purpose: the model renders a
// literal pedestal when you mention one, and a different-sized one every run.
const PROMPT =
  "A single product rotating smoothly in place, suspended against a pure " +
  "solid white cyclorama background, at constant angular velocity, 36 degrees " +
  "per second, no acceleration, no deceleration, exactly one full 360 degree " +
  "revolution over 10 seconds. Render exactly one item: if the source photo " +
  "shows a pair or multiple copies of the product, show only a single one. " +
  "Nothing else in frame — no stand, no pedestal, no platform, no stage, no " +
  "floor, no surface. Camera on tripod, locked-off shot, static camera, no " +
  "camera movement, no zoom, no pan. High-end commercial studio product " +
  "photography lighting, crisp textures, item stays perfectly locked in the " +
  "center of the frame throughout the entire rotation.";

const NEGATIVE_PROMPT =
  "pedestal, podium, stage, platform, stand, turntable, floor, table surface, " +
  "multiple products, duplicate product, pair shown together, " +
  "acceleration, deceleration, speed change, camera zoom, camera pan, " +
  "camera dolly, camera handheld, camera shake, product moving off center, " +
  "product drifting, product scaling, deformation, warping, morphing, " +
  "blurry, low quality, floor shadow, real environment, watermark, text overlay";

function dataUrlToBlob(dataUrl: string): Blob {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("Expected a data URL with base64 payload");
  return new Blob([Buffer.from(m[2], "base64")], { type: m[1] });
}

export const falKling: SpinVideoProvider = {
  name: "fal-kling-v3-pro",
  isConfigured: () => Boolean(process.env.FAL_KEY ?? process.env.FAL_API_TOKEN),
  async generate(input: SpinVideoInput): Promise<SpinVideoResult> {
    const key = process.env.FAL_KEY ?? process.env.FAL_API_TOKEN;
    if (!key) return { status: "failed", errorMessage: "FAL_KEY is not set" };
    if (!input.imageUrl) return { status: "failed", errorMessage: "imageUrl is required" };

    const started = Date.now();
    try {
      const { fal } = await import("@fal-ai/client");
      fal.config({ credentials: key });

      // Accept either a fal.media URL (default post-birefnet path) or a
      // data URL (dev/testing path). Upload data URLs first.
      const imageUrl = input.imageUrl.startsWith("data:")
        ? await fal.storage.upload(dataUrlToBlob(input.imageUrl))
        : input.imageUrl;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        prompt: PROMPT,
        image_url: imageUrl,
        duration: String(input.durationSeconds ?? 10),
        negative_prompt: NEGATIVE_PROMPT,
        cfg_scale: 0.5,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await fal.subscribe(MODEL_ID, { input: payload, logs: false });

      const data = result?.data ?? result;
      const videoUrl: string | undefined =
        data?.video?.url ??
        (typeof data?.video === "string" ? data.video : undefined) ??
        data?.url;

      if (!videoUrl) {
        return {
          status: "failed",
          modelUsed: MODEL_ID,
          errorMessage: `No video URL in result: ${JSON.stringify(result).slice(0, 400)}`,
          durationMs: Date.now() - started,
        };
      }

      // Extract WebP frames from the MP4 so the client can flipbook-scrub
      // them on canvas. Falls back to null on any ffmpeg failure — the
      // UI degrades gracefully to video scrubbing.
      const frames = await extractFramesFromVideo(videoUrl, key);

      return {
        status: "completed",
        videoUrl,
        frameUrls: frames?.frameUrls,
        modelUsed: MODEL_ID,
        providerJobId: result?.requestId,
        durationMs: Date.now() - started,
        rawInput: {
          model: MODEL_ID,
          duration: input.durationSeconds ?? 10,
          cfgScale: 0.5,
          frameCount: frames?.frameCount ?? 0,
          extractionMs: frames?.durationMs ?? 0,
        },
      };
    } catch (err) {
      const e = err as { message?: string; status?: number; body?: unknown };
      const status = e?.status ?? "";
      const msg = e?.message ?? String(err);
      let body = "";
      if (e?.body != null) {
        try { body = ` | body: ${JSON.stringify(e.body).slice(0, 200)}`; }
        catch { body = ` | body: ${String(e.body).slice(0, 200)}`; }
      }
      return {
        status: "failed",
        modelUsed: MODEL_ID,
        errorMessage: `${status ? `[${status}] ` : ""}${msg}${body}`.slice(0, 500),
        durationMs: Date.now() - started,
      };
    }
  },
};
