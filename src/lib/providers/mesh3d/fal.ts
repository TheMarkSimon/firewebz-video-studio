// fal.ai provider — Hunyuan3D v2 Multi-View, single-pass textured GLB.
// Docs: https://fal.ai/models/fal-ai/hunyuan3d/v2/multi-view/api
//
// Input schema (verified via probing the endpoint):
//   front_image_url  (required) — URL to the front photo
//   back_image_url   (required) — URL to the back photo
//   left_image_url   (required) — URL to the left photo
//   right_image_url  (optional) — URL to the right photo (accuracy booster)
//   textured_mesh    (optional) — return textured GLB (default true on this endpoint)
//   seed             (optional)
//
// fal.ai wants URLs, not base64. The SDK uploads blobs to fal.ai storage
// and swaps them for signed URLs automatically before calling the model.

import type { Mesh3dInput, Mesh3dProvider, Mesh3dResult } from "./types";

const MODEL_ID = "fal-ai/hunyuan3d/v2/multi-view";

// Convert a data URL to a Blob so the fal SDK's storage.upload can send it.
function dataUrlToBlob(dataUrl: string): Blob {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("Expected a data URL with base64 payload");
  const mime = m[1];
  const bytes = Buffer.from(m[2], "base64");
  return new Blob([bytes], { type: mime });
}

export const falHunyuan3dMultiView: Mesh3dProvider = {
  name: "fal-hunyuan3d-v2-mv",
  isConfigured: () => Boolean(process.env.FAL_KEY ?? process.env.FAL_API_TOKEN),
  async generate(input: Mesh3dInput): Promise<Mesh3dResult> {
    // Accept either name — FAL_KEY is what the @fal-ai/client SDK expects
    // by default, FAL_API_TOKEN is a common alternative name used by many
    // deployments. Try both so operators aren't tripped up by the mismatch.
    const key = process.env.FAL_KEY ?? process.env.FAL_API_TOKEN;
    if (!key) {
      return { status: "failed", errorMessage: "Neither FAL_KEY nor FAL_API_TOKEN is set" };
    }
    if (!input.frontImageDataUrl || !input.backImageDataUrl || !input.leftImageDataUrl) {
      return {
        status: "failed",
        errorMessage: "fal.ai Hunyuan3D-2 Multi-View requires front, back, and left images.",
      };
    }

    const started = Date.now();

    try {
      const { fal } = await import("@fal-ai/client");
      fal.config({ credentials: key });

      // Upload each photo to fal.ai storage first, get signed URLs back.
      // We do these serially to keep memory low; parallel is a minor speedup
      // but risks hitting fal.ai upload rate limits on a burst.
      const frontUrl = await fal.storage.upload(dataUrlToBlob(input.frontImageDataUrl));
      const backUrl = await fal.storage.upload(dataUrlToBlob(input.backImageDataUrl));
      const leftUrl = await fal.storage.upload(dataUrlToBlob(input.leftImageDataUrl));
      const rightUrl = input.rightImageDataUrl
        ? await fal.storage.upload(dataUrlToBlob(input.rightImageDataUrl))
        : undefined;

      const payload = {
        front_image_url: frontUrl,
        back_image_url: backUrl,
        left_image_url: leftUrl,
        ...(rightUrl ? { right_image_url: rightUrl } : {}),
        textured_mesh: true,
      };

      // fal.subscribe polls the queue until done and returns the final result.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await fal.subscribe(MODEL_ID, {
        input: payload,
        logs: false,
      });

      // Output shape (from fal.ai docs and confirmed on similar models):
      //   { data: { model_mesh: { url: string, content_type: string } , seed: number } }
      // Different endpoints may key the mesh field differently; we probe a few.
      const data = result?.data ?? result;
      const glbUrl: string | undefined =
        data?.model_mesh?.url ??
        data?.mesh?.url ??
        data?.output?.url ??
        (typeof data?.model_mesh === "string" ? data.model_mesh : undefined) ??
        (typeof data?.mesh === "string" ? data.mesh : undefined) ??
        (typeof data?.output === "string" ? data.output : undefined);

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
        modelUsed: MODEL_ID,
        providerJobId: result?.requestId,
        durationMs: Date.now() - started,
        rawInput: {
          model: MODEL_ID,
          hasFront: true,
          hasBack: true,
          hasLeft: true,
          hasRight: !!rightUrl,
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
