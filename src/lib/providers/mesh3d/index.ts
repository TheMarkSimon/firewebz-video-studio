import type { Mesh3dProvider } from "./types";
import { replicateTrellis } from "./replicate";
import { falHunyuan3dMultiView } from "./fal";
import { falRodin } from "./rodin";

export type { Mesh3dInput, Mesh3dResult, Mesh3dProvider } from "./types";

// Select the mesh provider based on MESH3D_PROVIDER env var.
//   rodin (default when FAL_KEY is set): Hyper3D Rodin, PBR-textured, ~60-90s
//     Best photorealism — pixels projected onto mesh, baked albedo/roughness/metallic.
//   hunyuan / fal:                       Hunyuan3D v3.1 Pro Multi-Angle on fal.ai.
//   replicate:                           TRELLIS multi-view on Replicate.
export function getMesh3dProvider(): Mesh3dProvider {
  const selection = (process.env.MESH3D_PROVIDER ?? "").toLowerCase();
  if (selection === "rodin") return falRodin;
  if (selection === "hunyuan" || selection === "fal") return falHunyuan3dMultiView;
  if (selection === "replicate" || selection === "trellis") return replicateTrellis;
  // Auto-pick: Rodin when fal is configured (best photorealism),
  //            else TRELLIS on Replicate as fallback.
  if (falRodin.isConfigured()) return falRodin;
  return replicateTrellis;
}
