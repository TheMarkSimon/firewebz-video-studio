// Replicate provider for Hunyuan3D-2MV — the multi-view variant of Hunyuan3D
// that takes 4 angle photos (front/back/left/right) and produces a GLB mesh.
//
// Docs: https://replicate.com/tencent/hunyuan3d-2mv
// The exact input field names come from the model's openapi schema (see
// script we ran to check).

export interface Mesh3dInput {
  frontImageDataUrl: string;
  backImageDataUrl?: string;
  leftImageDataUrl?: string;
  rightImageDataUrl?: string;
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

// Model + pinned version.
// tencent/hunyuan3d-2mv is the multi-view Hunyuan3D-2 finetune. Requires
// pinning by version — Replicate community models don't have a stable
// version-less endpoint.
const HUNYUAN3D_MV_MODEL = "tencent/hunyuan3d-2mv";
const HUNYUAN3D_MV_VERSION = "71798fbc3c9f7b7097e3bb85496e5a797d8b8f616b550692e7c3e176a8e9e5db";

export const replicateHunyuan3dMv: Mesh3dProvider = {
  name: "hunyuan3d-2mv",
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
    const modelDescriptor = `${HUNYUAN3D_MV_MODEL}:${HUNYUAN3D_MV_VERSION}`;

    try {
      const { default: Replicate } = await import("replicate");
      const replicate = new Replicate({ auth: token });

      const replicateInput: Record<string, string | number | boolean> = {
        front_image: input.frontImageDataUrl,
        steps: 30,
        guidance_scale: 5,
        randomize_seed: true,
        octree_resolution: 256,
        target_face_num: 10000,
        file_type: "glb",
      };
      if (input.backImageDataUrl) replicateInput.back_image = input.backImageDataUrl;
      if (input.leftImageDataUrl) replicateInput.left_image = input.leftImageDataUrl;
      if (input.rightImageDataUrl) replicateInput.right_image = input.rightImageDataUrl;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const output: any = await replicate.run(modelDescriptor as `${string}/${string}:${string}`, { input: replicateInput });

      // Normalize output shape — hunyuan3d-2mv typically returns a URL string
      // (or a FileOutput object with .url() on newer SDK versions).
      let glbUrl: string | undefined;
      if (typeof output === "string") {
        glbUrl = output;
      } else if (Array.isArray(output)) {
        const first = output[0];
        if (typeof first === "string") glbUrl = first;
        else if (first && typeof first.url === "function") {
          const u = first.url();
          glbUrl = typeof u === "string" ? u : u?.href;
        }
      } else if (output && typeof output === "object") {
        if (typeof output.url === "function") {
          const u = output.url();
          glbUrl = typeof u === "string" ? u : u?.href;
        } else {
          glbUrl = output.output ?? output.mesh ?? output.glb ?? output.model;
        }
      }

      if (!glbUrl) {
        return {
          status: "failed",
          modelUsed: modelDescriptor,
          errorMessage: `Hunyuan3D returned no GLB URL. Output: ${JSON.stringify(output).slice(0, 400)}`,
          durationMs: Date.now() - started,
        };
      }

      return {
        status: "completed",
        glbUrl,
        modelUsed: modelDescriptor,
        durationMs: Date.now() - started,
        rawInput: {
          model: modelDescriptor,
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

export function getMesh3dProvider(): Mesh3dProvider {
  return replicateHunyuan3dMv;
}
