// Replicate provider for Hunyuan3D image-to-3D generation.
// Docs: https://replicate.com/ndreca/hunyuan3d-2

export interface Mesh3dInput {
  // Data URLs of the product photos (front required; back, side, right optional)
  frontImageDataUrl: string;
  backImageDataUrl?: string;
  leftImageDataUrl?: string;
  rightImageDataUrl?: string;
  // Optional caption Hunyuan can use to disambiguate
  caption?: string;
}

export interface Mesh3dResult {
  status: "completed" | "failed";
  glbUrl?: string;
  previewImageUrl?: string;
  providerJobId?: string;
  errorMessage?: string;
  durationMs?: number;
  modelUsed?: string;
  rawInput?: unknown;
}

export interface Mesh3dProvider {
  name: string;
  isConfigured(): boolean;
  generate(input: Mesh3dInput): Promise<Mesh3dResult>;
}

// The Hunyuan3D model on Replicate accepts up to 4 image URLs (front/back/left/right)
// plus an optional caption. Returns a GLB file URL.
export const replicateHunyuan3d: Mesh3dProvider = {
  name: "hunyuan3d",
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
    const model = process.env.HUNYUAN3D_MODEL ?? "ndreca/hunyuan3d-2";

    try {
      const { default: Replicate } = await import("replicate");
      const replicate = new Replicate({ auth: token });

      // The `image` field on hunyuan3d-2 accepts a single primary image; the
      // other angles are passed as additional inputs where supported. If the
      // deployed version doesn't accept them, they're ignored.
      const replicateInput: Record<string, string | number | boolean> = {
        image: input.frontImageDataUrl,
        caption: input.caption ?? "",
        steps: 50,
        guidance_scale: 5.5,
        seed: 1234,
        octree_resolution: 256,
        remove_background: true,
      };
      if (input.backImageDataUrl) replicateInput.back_image = input.backImageDataUrl;
      if (input.leftImageDataUrl) replicateInput.left_image = input.leftImageDataUrl;
      if (input.rightImageDataUrl) replicateInput.right_image = input.rightImageDataUrl;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const output: any = await replicate.run(model as `${string}/${string}`, { input: replicateInput });

      // Output can be a string URL, an array with URLs, or an object with
      // named fields depending on the model deployment. Handle all shapes.
      let glbUrl: string | undefined;
      let previewImageUrl: string | undefined;

      if (typeof output === "string") {
        glbUrl = output;
      } else if (Array.isArray(output)) {
        glbUrl = output.find((v) => typeof v === "string" && /\.(glb|gltf|obj|ply|usdz)(\?|$)/i.test(v));
        previewImageUrl = output.find((v) => typeof v === "string" && /\.(png|jpe?g|webp)(\?|$)/i.test(v));
      } else if (output && typeof output === "object") {
        // ndreca/hunyuan3d-2 typically returns { mesh: <url>, preview: <url> } or similar
        glbUrl = output.mesh ?? output.output ?? output.glb ?? output.model;
        previewImageUrl = output.preview ?? output.image ?? output.thumbnail;
      }

      if (!glbUrl) {
        return {
          status: "failed",
          modelUsed: model,
          errorMessage: `Hunyuan3D returned no GLB URL. Output shape: ${JSON.stringify(output).slice(0, 400)}`,
          durationMs: Date.now() - started,
          rawInput: { model, hasFront: true, hasBack: !!input.backImageDataUrl, hasLeft: !!input.leftImageDataUrl, hasRight: !!input.rightImageDataUrl },
        };
      }

      return {
        status: "completed",
        glbUrl,
        previewImageUrl,
        modelUsed: model,
        durationMs: Date.now() - started,
        rawInput: { model, hasFront: true, hasBack: !!input.backImageDataUrl, hasLeft: !!input.leftImageDataUrl, hasRight: !!input.rightImageDataUrl },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        status: "failed",
        modelUsed: model,
        errorMessage: msg,
        durationMs: Date.now() - started,
      };
    }
  },
};

export function getMesh3dProvider(): Mesh3dProvider {
  return replicateHunyuan3d;
}
