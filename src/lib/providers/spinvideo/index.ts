// Router. Adding a new provider = one new file + one case here.
//   SPIN_PROVIDER=kling    → Kling v3 Pro, single image (default)
//   SPIN_PROVIDER=seedance → Seedance 1.0 Lite reference-to-video, multi-image
import type { SpinVideoProvider } from "./types";
import { falKling } from "./kling";
import { falSeedance } from "./seedance";

export type { SpinVideoInput, SpinVideoResult, SpinVideoProvider } from "./types";

export function getSpinVideoProvider(): SpinVideoProvider {
  const selection = (process.env.SPIN_PROVIDER ?? "").toLowerCase();
  if (selection === "seedance") return falSeedance;
  return falKling;
}
