// fal.ai provider — Hunyuan3D v3.1 Pro Image-to-3D (Multi-Angle).
// Endpoint: fal-ai/hunyuan-3d/v3.1/pro/image-to-3d
//
// Verified via direct API probe (Nov 2026):
//   - `input_image_url` (required) — single image URL or data URI
//   - Endpoint accepts data URIs directly, so no fal storage upload needed
//   - Extra fields (image_urls, enable_pbr, polygon_count, prompt) accepted
//     without validation errors — the model uses them if applicable
//
// Note: fal.ai v2 had a strict multi-view endpoint (v2/multi-view) with
// separate front_image_url/back_image_url fields. v3.1 Pro is documented as
// "Multi-Angle" but the schema uses input_image_url + image_urls array.
// We send both so the model has the front as the primary and the array
// as supplementary angles.

import type { Mesh3dInput, Mesh3dProvider, Mesh3dResult } from "./types";

const MODEL_ID = "fal-ai/hunyuan-3d/v3.1/pro/image-to-3d";

// Convert a data URL to a Blob so the fal SDK's storage.upload can send it.
function dataUrlToBlob(dataUrl: string): Blob {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("Expected a data URL with base64 payload");
  const mime = m[1];
  const bytes = Buffer.from(m[2], "base64");
  return new Blob([bytes], { type: mime });
}

export const falHunyuan3dMultiView: Mesh3dProvider = {
  name: "fal-hunyuan-3d-v3.1-pro",
  isConfigured: () => Boolean(process.env.FAL_KEY ?? process.env.FAL_API_TOKEN),
  async generate(input: Mesh3dInput): Promise<Mesh3dResult> {
    const key = process.env.FAL_KEY ?? process.env.FAL_API_TOKEN;
    if (!key) {
      return { status: "failed", errorMessage: "Neither FAL_KEY nor FAL_API_TOKEN is set" };
    }
    if (!input.frontImageDataUrl) {
      return {
        status: "failed",
        errorMessage: "Front image is required.",
      };
    }

    const started = Date.now();

    try {
      const { fal } = await import("@fal-ai/client");
      fal.config({ credentials: key });

      // Upload all provided photos to fal.ai storage so we can pass URLs.
      // The endpoint accepts data URIs too, but uploading first keeps request
      // sizes small and lets fal.ai cache/optimize server-side.
      const frontUrl = await fal.storage.upload(dataUrlToBlob(input.frontImageDataUrl));
      const backUrl = input.backImageDataUrl
        ? await fal.storage.upload(dataUrlToBlob(input.backImageDataUrl))
        : undefined;
      const leftUrl = input.leftImageDataUrl
        ? await fal.storage.upload(dataUrlToBlob(input.leftImageDataUrl))
        : undefined;
      const rightUrl = input.rightImageDataUrl
        ? await fal.storage.upload(dataUrlToBlob(input.rightImageDataUrl))
        : undefined;

      // Assemble the multi-angle URL array (front first, then any extras).
      const imageUrls = [frontUrl, backUrl, leftUrl, rightUrl].filter(
        (u): u is string => typeof u === "string",
      );

      // Build a specific prompt from the caption if provided, else default.
      const prompt =
        input.caption?.trim() ||
        "A detailed product asset for e-commerce, studio lighting, PBR materials, clean topology.";

      const payload = {
        input_image_url: frontUrl,   // required — primary view
        image_urls: imageUrls,        // multi-angle supplement (front/back/left/right)
        enable_pbr: true,             // PBR-mapped textures
        polygon_count: 50000,         // decent geometry density for e-commerce
        prompt,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await fal.subscribe(MODEL_ID, {
        input: payload,
        logs: false,
      });

      // v3.1 Pro Image-to-3D output shape (verified via direct probe):
      //   { data: { model_glb: { url, content_type, file_size, file_name },
      //             thumbnail: { url, content_type, ... },
      //             model_urls: { glb: {...} } } }
      // Older/other shapes handled defensively.
      const data = result?.data ?? result;
      const glbUrl: string | undefined =
        data?.model_glb?.url ??
        data?.model_urls?.glb?.url ??
        data?.model_mesh?.url ??
        data?.mesh?.url ??
        data?.output?.url ??
        (typeof data?.model_glb === "string" ? data.model_glb : undefined) ??
        (typeof data?.model_mesh === "string" ? data.model_mesh : undefined) ??
        (typeof data?.mesh === "string" ? data.mesh : undefined) ??
        (typeof data?.output === "string" ? data.output : undefined);
      const previewImageUrl: string | undefined =
        data?.thumbnail?.url ??
        data?.preview?.url ??
        (typeof data?.thumbnail === "string" ? data.thumbnail : undefined);

      if (!glbUrl) {
        return {
          status: "failed",
          modelUsed: MODEL_ID,
          errorMessage: `fal.ai returned no GLB URL. Result shape: ${JSON.stringify(result).slice(0, 500)}`,
          durationMs: Date.now() - started,
        };
      }

      return {
        status: "completed",
        glbUrl,
        previewImageUrl,
        modelUsed: MODEL_ID,
        providerJobId: result?.requestId,
        durationMs: Date.now() - started,
        rawInput: {
          model: MODEL_ID,
          imageCount: imageUrls.length,
          hasFront: true,
          hasBack: !!backUrl,
          hasLeft: !!leftUrl,
          hasRight: !!rightUrl,
          polygonCount: 50000,
          enablePbr: true,
        },
      };
    } catch (err) {
      const e = err as { message?: string; status?: number; body?: unknown; cause?: unknown };
      const status = e?.status ?? "";
      const msg = e?.message ?? String(err);
      const body = e?.body ? ` | body: ${JSON.stringify(e.body).slice(0, 300)}` : "";
      return {
        status: "failed",
        modelUsed: MODEL_ID,
        errorMessage: `${status ? `[${status}] ` : ""}${msg}${body}`,
        durationMs: Date.now() - started,
      };
    }
  },
};
