// ByteDance Seedance 1.0 Lite reference-to-video provider (fal.ai).
//
// Why this exists next to Kling: Seedance's reference mode accepts MULTIPLE
// images of the same product, so the model grounds the back/sides in real
// photos instead of hallucinating them. It also has a native camera_fixed
// flag — the thing we fought Kling's prompt for.
//
// Endpoint verified live via fal's openapi (2026-07):
//   fal-ai/bytedance/seedance/v1/lite/reference-to-video
//   input: { prompt*, reference_image_urls*: string[], duration, resolution,
//            aspect_ratio, camera_fixed, seed, enable_safety_checker }
// Note: only the LITE tier has reference-to-video; there is no pro variant
// and no "Seedance 2.0" on fal despite what other tools may claim.
//
// Two execution modes:
//   generate()          — blocking fal.subscribe (legacy sync path, kept for
//                         providers/local flows without queue support).
//   submit()/fetchQueueResult() — fal queue + webhook (Phase 3 async path).

import type {
  SpinVideoInput,
  SpinVideoProvider,
  SpinVideoResult,
  SpinVideoSubmission,
} from "./types";
import { extractFramesFromVideo } from "./extract-frames";
import { flattenToWhite } from "./flatten";

const MODEL_ID = "fal-ai/bytedance/seedance/v1/lite/reference-to-video";

// Prompt notes, learned the hard way:
//   - Never say "turntable"/"stage"/"platform" — the model renders one, and a
//     different one every run. Say the product rotates in place instead.
//   - Never say "suspended"/"hanging"/"floating on a string" — the model
//     renders a literal suspension wire from the top of the frame.
//   - Catalog photos often show a pair (e.g. both shoes); explicitly ask for
//     exactly ONE item or the video renders the whole pair.
const PROMPT =
  "A single product rotating smoothly in place against a pure seamless white " +
  "background, completing exactly one full 360 degree revolution at constant " +
  "angular velocity. The reference images show the same product from " +
  "different angles — front, back, and sides; rotate smoothly through all of " +
  "them in order. Render exactly one item: if the reference photos show a " +
  "pair or multiple copies of the product, show only a single one. Nothing " +
  "else in frame — no stand, no pedestal, no platform, no turntable, no " +
  "stage, no floor, no surface, no shadow, no string, no wire, no thread, no " +
  "hanging mount, no rig. No acceleration, no deceleration. High-end " +
  "commercial product photography lighting, crisp sharp textures, product " +
  "perfectly centered and locked in place for the entire rotation.";

function dataUrlToBlob(dataUrl: string): Blob {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("Expected a data URL with base64 payload");
  return new Blob([Buffer.from(m[2], "base64")], { type: m[1] });
}

function getKey(): string | undefined {
  return process.env.FAL_KEY ?? process.env.FAL_API_TOKEN;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getFal(key: string): Promise<any> {
  const { fal } = await import("@fal-ai/client");
  fal.config({ credentials: key });
  return fal;
}

// Upload any data-URL photos to fal storage; pass URLs through. Front first,
// then the extra angles in the order given — the prompt tells the model to
// rotate through them in order. Every reference is then FLATTENED onto
// opaque white: transparent PNG pixels make the model hallucinate patterned
// backdrops mid-spin (see flatten.ts). Flattening failure falls back to the
// original rather than blocking the run.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildReferenceUrls(fal: any, input: SpinVideoInput, key: string): Promise<string[]> {
  const toUrl = async (u: string) =>
    u.startsWith("data:") ? fal.storage.upload(dataUrlToBlob(u)) : u;
  const urls: string[] = await Promise.all(
    [input.imageUrl, ...(input.extraImageUrls ?? [])].map(toUrl),
  );
  return Promise.all(urls.map(async (u) => (await flattenToWhite(u, key)) ?? u));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPayload(referenceImageUrls: string[], input: SpinVideoInput): any {
  return {
    prompt: PROMPT,
    reference_image_urls: referenceImageUrls,
    duration: String(input.durationSeconds ?? 10),
    resolution: "720p",
    aspect_ratio: "16:9",
    camera_fixed: true,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseVideoUrl(result: any): string | undefined {
  const data = result?.data ?? result;
  return (
    data?.video?.url ??
    (typeof data?.video === "string" ? data.video : undefined) ??
    data?.url
  );
}

function describeError(err: unknown): string {
  const e = err as { message?: string; status?: number; body?: unknown };
  const status = e?.status ?? "";
  const msg = e?.message ?? String(err);
  let body = "";
  if (e?.body != null) {
    try { body = ` | body: ${JSON.stringify(e.body).slice(0, 200)}`; }
    catch { body = ` | body: ${String(e.body).slice(0, 200)}`; }
  }
  return `${status ? `[${status}] ` : ""}${msg}${body}`.slice(0, 500);
}

export const falSeedance: SpinVideoProvider = {
  name: "fal-seedance-v1-lite-ref",
  isConfigured: () => Boolean(getKey()),

  async generate(input: SpinVideoInput): Promise<SpinVideoResult> {
    const key = getKey();
    if (!key) return { status: "failed", errorMessage: "FAL_KEY is not set" };
    if (!input.imageUrl) return { status: "failed", errorMessage: "imageUrl is required" };

    const started = Date.now();
    try {
      const fal = await getFal(key);
      const referenceImageUrls = await buildReferenceUrls(fal, input, key);
      const payload = buildPayload(referenceImageUrls, input);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await fal.subscribe(MODEL_ID, { input: payload, logs: false });
      const videoUrl = parseVideoUrl(result);

      if (!videoUrl) {
        return {
          status: "failed",
          modelUsed: MODEL_ID,
          errorMessage: `No video URL in result: ${JSON.stringify(result).slice(0, 400)}`,
          durationMs: Date.now() - started,
        };
      }

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
          referenceImageCount: referenceImageUrls.length,
          duration: input.durationSeconds ?? 10,
          cameraFixed: true,
          resolution: "720p",
          frameCount: frames?.frameCount ?? 0,
        },
      };
    } catch (err) {
      return {
        status: "failed",
        modelUsed: MODEL_ID,
        errorMessage: describeError(err),
        durationMs: Date.now() - started,
      };
    }
  },

  // Enqueue the generation and return immediately. fal calls webhookUrl when
  // the job finishes; getSpinGenerationStatus also reconciles by polling, so
  // localhost (unreachable by webhooks) still completes.
  async submit(input: SpinVideoInput, opts?: { webhookUrl?: string }): Promise<SpinVideoSubmission> {
    const key = getKey();
    if (!key) return { errorMessage: "FAL_KEY is not set" };
    if (!input.imageUrl) return { errorMessage: "imageUrl is required" };

    try {
      const fal = await getFal(key);
      const referenceImageUrls = await buildReferenceUrls(fal, input, key);
      const payload = buildPayload(referenceImageUrls, input);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const submitted: any = await fal.queue.submit(MODEL_ID, {
        input: payload,
        ...(opts?.webhookUrl ? { webhookUrl: opts.webhookUrl } : {}),
      });
      const requestId: string | undefined = submitted?.request_id ?? submitted?.requestId;
      if (!requestId) {
        return { errorMessage: `No request_id in submit response: ${JSON.stringify(submitted).slice(0, 300)}` };
      }
      return { requestId };
    } catch (err) {
      return { errorMessage: describeError(err) };
    }
  },

  // null → still running. Terminal results only when fal says so; transient
  // errors are rethrown so the caller retries on the next poll/webhook.
  async fetchQueueResult(requestId: string): Promise<SpinVideoResult | null> {
    const key = getKey();
    if (!key) return { status: "failed", errorMessage: "FAL_KEY is not set" };

    const started = Date.now();
    const fal = await getFal(key);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let queueStatus: any;
    try {
      queueStatus = await fal.queue.status(MODEL_ID, { requestId, logs: false });
    } catch (err) {
      const status = (err as { status?: number })?.status;
      // Unknown/expired request id is terminal — nothing will ever arrive.
      if (status === 404) {
        return {
          status: "failed",
          modelUsed: MODEL_ID,
          errorMessage: `fal queue request ${requestId} not found (expired or invalid).`,
        };
      }
      throw err;
    }

    const state: string = queueStatus?.status ?? "";
    if (state === "IN_QUEUE" || state === "IN_PROGRESS") return null;

    // COMPLETED covers both success and failure — the result call surfaces
    // generation errors as an ApiError (422 etc.), which IS terminal.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any;
    try {
      result = await fal.queue.result(MODEL_ID, { requestId });
    } catch (err) {
      return {
        status: "failed",
        modelUsed: MODEL_ID,
        providerJobId: requestId,
        errorMessage: describeError(err),
        durationMs: Date.now() - started,
      };
    }

    const videoUrl = parseVideoUrl(result);
    if (!videoUrl) {
      return {
        status: "failed",
        modelUsed: MODEL_ID,
        providerJobId: requestId,
        errorMessage: `No video URL in queue result: ${JSON.stringify(result).slice(0, 400)}`,
        durationMs: Date.now() - started,
      };
    }

    // Frame extraction failure is non-fatal — client falls back to <video>.
    const frames = await extractFramesFromVideo(videoUrl, key);

    return {
      status: "completed",
      videoUrl,
      frameUrls: frames?.frameUrls,
      modelUsed: MODEL_ID,
      providerJobId: requestId,
      durationMs: Date.now() - started,
      rawInput: {
        model: MODEL_ID,
        cameraFixed: true,
        resolution: "720p",
        frameCount: frames?.frameCount ?? 0,
      },
    };
  },
};
