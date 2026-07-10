// Provider router. Seedance won the A/B (multi-image reference-to-video,
// native camera_fixed, ~$0.5/run) and is THE production provider; the Kling
// fallback was removed 2026-07 (single-image, ~$3/run, lost on quality and
// cost — see git history if it's ever needed for comparison again).
// Adding a future provider = one new file implementing SpinVideoProvider
// (queue-based: submit + fetchQueueResult) + a case here.
import type { SpinVideoProvider } from "./types";
import { falSeedance } from "./seedance";

export type { SpinVideoInput, SpinVideoResult, SpinVideoProvider } from "./types";

export function getSpinVideoProvider(): SpinVideoProvider {
  return falSeedance;
}
