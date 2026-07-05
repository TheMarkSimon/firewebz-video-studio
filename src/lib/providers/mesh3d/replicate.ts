// Replicate provider — Microsoft TRELLIS via firtoz/trellis. Kept as a
// fallback / A-B option; the primary provider is fal.ai's Hunyuan3D v2 MV.
// Docs: https://replicate.com/firtoz/trellis

import type { Mesh3dInput, Mesh3dProvider, Mesh3dResult } from "./types";

const TRELLIS_MODEL = "firtoz/trellis";
const TRELLIS_VERSION = "e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c";

export const replicateTrellis: Mesh3dProvider = {
  name: "trellis",
  isConfigured: () => Boolean(process.env.REPLICATE_API_TOKEN),
  async generate(input) {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return { status: "failed", errorMessage: "REPLICATE_API_TOKEN is not set" };
    }
    if (!input.frontImageDataUrl) {
      return { status: "failed", errorMessage: "At least a front image is required." };
    }

    const started = Date.now();
    const modelDescriptor = `${TRELLIS_MODEL}:${TRELLIS_VERSION}`;

    // Assemble multi-view image array. Front is required; the rest are
    // additive. TRELLIS uses these as separate observations to reconstruct
    // the geometry without hallucinating unseen sides.
    const images: string[] = [input.frontImageDataUrl];
    if (input.backImageDataUrl) images.push(input.backImageDataUrl);
    if (input.leftImageDataUrl) images.push(input.leftImageDataUrl);
    if (input.rightImageDataUrl) images.push(input.rightImageDataUrl);

    try {
      const { default: Replicate } = await import("replicate");
      const replicate = new Replicate({ auth: token });

      // Critical inputs for what we want:
      //   generate_model: true    — actually export a GLB (default is false)
      //   generate_color: true    — textured (default true, explicit for safety)
      //   texture_size: 2048      — high-res textures (default 1024)
      //   mesh_simplify: 0.95     — good geometry quality
      const replicateInput: Record<string, unknown> = {
        images,
        generate_model: true,
        generate_color: true,
        texture_size: 2048,
        mesh_simplify: 0.95,
        ss_sampling_steps: 12,
        slat_sampling_steps: 12,
        ss_guidance_strength: 7.5,
        slat_guidance_strength: 3,
        randomize_seed: true,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const output: any = await replicate.run(modelDescriptor as `${string}/${string}:${string}`, { input: replicateInput });

      // TRELLIS returns an object with named fields depending on which
      // generate_* flags are enabled. When generate_model=true there's a
      // `model_file` (GLB) plus optional preview videos.
      let glbUrl: string | undefined;
      let previewImageUrl: string | undefined;

      const asUrl = (v: unknown): string | undefined => {
        if (!v) return undefined;
        if (typeof v === "string") return v;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyV = v as any;
        if (typeof anyV.url === "function") {
          const u = anyV.url();
          return typeof u === "string" ? u : u?.href;
        }
        return undefined;
      };

      if (output && typeof output === "object") {
        glbUrl =
          asUrl(output.model_file) ??
          asUrl(output.glb) ??
          asUrl(output.output) ??
          asUrl(output.mesh);
        previewImageUrl =
          asUrl(output.color_video) ??
          asUrl(output.preview) ??
          asUrl(output.image);
      }
      if (!glbUrl && Array.isArray(output)) {
        // Fallback: some deployments return arrays
        for (const v of output) {
          const u = asUrl(v);
          if (u && /\.glb(\?|$)/i.test(u)) { glbUrl = u; break; }
        }
      }

      if (!glbUrl) {
        return {
          status: "failed",
          modelUsed: modelDescriptor,
          errorMessage: `TRELLIS returned no GLB URL. Output: ${JSON.stringify(output).slice(0, 500)}`,
          durationMs: Date.now() - started,
        };
      }

      return {
        status: "completed",
        glbUrl,
        previewImageUrl,
        modelUsed: modelDescriptor,
        durationMs: Date.now() - started,
        rawInput: {
          model: modelDescriptor,
          imageCount: images.length,
          textureSize: 2048,
          hasFront: true,
          hasBack: !!input.backImageDataUrl,
          hasLeft: !!input.leftImageDataUrl,
          hasRight: !!input.rightImageDataUrl,
        },
      };
    } catch (err) {
      const e = err as { message?: string; status?: number; cause?: unknown };
      const status = e?.status ?? "";
      const msg = e?.message ?? String(err);
      const cause = e?.cause ? ` | cause: ${JSON.stringify(e.cause).slice(0, 300)}` : "";
      return {
        status: "failed",
        modelUsed: modelDescriptor,
        errorMessage: `${status ? `[${status}] ` : ""}${msg}${cause}`,
        durationMs: Date.now() - started,
      };
    }
  },
};

