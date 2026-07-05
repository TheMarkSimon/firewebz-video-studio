import type { Mesh3dProvider } from "./types";
import { replicateTrellis } from "./replicate";
import { falHunyuan3dMultiView } from "./fal";

export type { Mesh3dInput, Mesh3dResult, Mesh3dProvider } from "./types";

// Select the mesh provider based on MESH3D_PROVIDER env var.
//   fal (default when FAL_KEY is set): Hunyuan3D v2 Multi-View, textured
//   replicate:                        TRELLIS multi-view, textured
export function getMesh3dProvider(): Mesh3dProvider {
  const selection = (process.env.MESH3D_PROVIDER ?? "").toLowerCase();
  if (selection === "replicate") return replicateTrellis;
  if (selection === "fal") return falHunyuan3dMultiView;
  // Auto-pick: prefer fal if configured, else replicate
  if (falHunyuan3dMultiView.isConfigured()) return falHunyuan3dMultiView;
  return replicateTrellis;
}
