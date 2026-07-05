// fal.ai provider — Hyper3D Rodin.
// Endpoint: fal-ai/hyper3d/rodin
//
// Rodin's texturing pipeline projects source photo pixels onto the mesh and
// bakes PBR maps (Albedo / Roughness / Metallic), which is dramatically closer
// to a retail-grade product asset than Hunyuan's geometry-first output.
//
// Verified live via direct API probe:
//   - input_image_urls (array, required) — multi-view input, model treats them
//     as different angles of the same object when condition_mode="concat"
//   - condition_mode: "concat"
//   - geometry_file_format: "glb" | (others)
//   - material: "PBR"
//   - quality: "high" | (others)
//   - generation_adds_on: ["HighPack"] — bakes 4K textures, ~$1.20/run vs $0.40 base
//   - Accepts data URIs directly, but we upload to fal storage first to keep
//     request bodies small
//
// Output (verified from a real completed run):
//   { model_mesh: { url, content_type, file_name, file_size },
//     seed: number,
//     textures: [] }
//
// Rodin typically takes 60-90 seconds even at "high" quality; the fal SDK's
// subscribe() polls until done.

import type { Mesh3dInput, Mesh3dProvider, Mesh3dResult } from "./types";

const MODEL_ID = "fal-ai/hyper3d/rodin";

function dataUrlToBlob(dataUrl: string): Blob {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) throw new Error("Expected a data URL with base64 payload");
  return new Blob([Buffer.from(m[2], "base64")], { type: m[1] });
}

// Accepts either a data URL (legacy path) or a plain http(s) URL — bg removal
// now returns fal.media URLs directly to keep session payloads under Redis'
// request-size limit. When given a URL we just forward it to Rodin; when
// given a data URL we upload to fal storage first.
async function toFalUrl(
  fal: { storage: { upload: (blob: Blob) => Promise<string> } },
  input: string,
): Promise<string> {
  if (input.startsWith("data:")) {
    return fal.storage.upload(dataUrlToBlob(input));
  }
  return input;
}

export const falRodin: Mesh3dProvider = {
  name: "fal-hyper3d-rodin",
  isConfigured: () => Boolean(process.env.FAL_KEY ?? process.env.FAL_API_TOKEN),
  async generate(input: Mesh3dInput): Promise<Mesh3dResult> {
    const key = process.env.FAL_KEY ?? process.env.FAL_API_TOKEN;
    if (!key) {
      return { status: "failed", errorMessage: "Neither FAL_KEY nor FAL_API_TOKEN is set" };
    }
    if (!input.frontImageDataUrl) {
      return { status: "failed", errorMessage: "Front image is required." };
    }

    const started = Date.now();

    try {
      const { fal } = await import("@fal-ai/client");
      fal.config({ credentials: key });

      // Upload every provided angle. Rodin's condition_mode="concat" treats
      // all URLs in input_image_urls as different views of the same object,
      // which is exactly the multi-view fidelity guarantee our pivot needs.
      // toFalUrl accepts either a data URL (upload to fal storage) or an
      // http(s) URL (pass through) — bg removal returns fal.media URLs now.
      const uploads: Array<Promise<string>> = [];
      uploads.push(toFalUrl(fal, input.frontImageDataUrl));
      if (input.backImageDataUrl) uploads.push(toFalUrl(fal, input.backImageDataUrl));
      if (input.leftImageDataUrl) uploads.push(toFalUrl(fal, input.leftImageDataUrl));
      if (input.rightImageDataUrl) uploads.push(toFalUrl(fal, input.rightImageDataUrl));
      const inputImageUrls = await Promise.all(uploads);

      // HighPack is off by default in the schema; USE_HIGH_PACK=1 turns it on
      // (roughly triples cost but bakes 4K PBR textures, which is the whole
      // point of using Rodin over Hunyuan).
      const useHighPack = process.env.USE_HIGH_PACK !== "0"; // default ON

      const payload: Record<string, unknown> = {
        input_image_urls: inputImageUrls,
        condition_mode: "concat",
        geometry_file_format: "glb",
        material: "PBR",
        quality: "high",
      };
      if (useHighPack) payload.generation_adds_on = ["HighPack"];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await fal.subscribe(MODEL_ID, {
        input: payload,
        logs: false,
      });

      // Output shape verified via direct API probe:
      //   data.model_mesh.url (primary)
      // Defensively check a few other shapes in case fal changes the response.
      const data = result?.data ?? result;
      const glbUrl: string | undefined =
        data?.model_mesh?.url ??
        data?.model_glb?.url ??
        data?.mesh?.url ??
        (typeof data?.model_mesh === "string" ? data.model_mesh : undefined);
      const previewImageUrl: string | undefined =
        data?.thumbnail?.url ??
        data?.preview?.url;

      if (!glbUrl) {
        return {
          status: "failed",
          modelUsed: MODEL_ID,
          errorMessage: `Rodin returned no GLB URL. Result shape: ${JSON.stringify(result).slice(0, 500)}`,
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
          imageCount: inputImageUrls.length,
          highPack: useHighPack,
          conditionMode: "concat",
          material: "PBR",
          quality: "high",
        },
      };
    } catch (err) {
      const e = err as { message?: string; status?: number; body?: unknown };
      const status = e?.status ?? "";
      const msg = e?.message ?? String(err);
      const body = e?.body ? ` | body: ${JSON.stringify(e.body).slice(0, 300)}` : "";
      return {
        status: "failed",
        modelUsed: MODEL_ID,
        errorMessage: `${status ? `[${status}] ` : ""}${msg}${body}`.slice(0, 500),
        durationMs: Date.now() - started,
      };
    }
  },
};
