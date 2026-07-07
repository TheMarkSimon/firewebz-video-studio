// Router. Adding a new provider = one new file + one case here.
//   default / SPIN_PROVIDER=seedance → Seedance 1.0 Lite reference-to-video:
//     multi-image (uses all uploaded angles), native camera_fixed, ~$0.5/run.
//     Won the A/B against Kling — THE production provider.
//   SPIN_PROVIDER=kling → Kling v3 Pro, single image, ~$3/run. Kept as an
//     explicit opt-in fallback / comparison baseline.
import type { SpinVideoProvider } from "./types";
import { falKling } from "./kling";
import { falSeedance } from "./seedance";

export type { SpinVideoInput, SpinVideoResult, SpinVideoProvider } from "./types";

export function getSpinVideoProvider(): SpinVideoProvider {
  const selection = (process.env.SPIN_PROVIDER ?? "").toLowerCase();
  if (selection === "kling") return falKling;
  return falSeedance;
}
