// Router. Adding a new provider = one new file + one case here.
import type { SpinVideoProvider } from "./types";
import { falKling } from "./kling";

export type { SpinVideoInput, SpinVideoResult, SpinVideoProvider } from "./types";

export function getSpinVideoProvider(): SpinVideoProvider {
  const selection = (process.env.SPIN_PROVIDER ?? "").toLowerCase();
  if (selection === "kling" || selection === "") return falKling;
  return falKling;
}
