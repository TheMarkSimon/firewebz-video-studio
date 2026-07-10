// Composite a (possibly transparent) reference photo onto opaque white and
// re-upload it for the video model.
//
// Why: bg-removed photos are transparent PNGs, and transparent pixels tell
// the video model NOTHING — it stays white early (anchored by the prompt)
// and then hallucinates a backdrop as the spin progresses (the sunglasses
// run rendered a gray hex-camo pattern mid-rotation). Flattening makes the
// white background an explicit instruction in every pixel. JPEG output also
// shrinks the reference payload; ffmpeg is the bundled binary we already
// ship for frame extraction.
//
// Returns null on any failure — callers fall back to the original URL
// rather than blocking a generation.

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadFfmpeg } from "./extract-frames";

export async function flattenToWhite(imageUrl: string, falKey: string): Promise<string | null> {
  let tmp: string | null = null;
  try {
    const res = await fetch(imageUrl, { cache: "no-store" });
    if (!res.ok) return null;
    const bytes = Buffer.from(await res.arrayBuffer());

    tmp = await mkdtemp(join(tmpdir(), "spinr-flatten-"));
    const inPath = join(tmp, "in.img");
    const outPath = join(tmp, "out.jpg");
    await writeFile(inPath, bytes);

    // [a] → solid white frame (drawbox fill), then overlay the original
    // (alpha-respecting) on top of it.
    const ffmpeg = await loadFfmpeg();
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inPath)
        .outputOptions([
          "-vf", "split[a][b];[a]drawbox=c=white:t=fill[bg];[bg][b]overlay=0:0",
          "-frames:v", "1",
          "-q:v", "2",
        ])
        .output(outPath)
        .on("end", () => resolve())
        .on("error", (err: unknown) => reject(err instanceof Error ? err : new Error(String(err))))
        .run();
    });

    const { fal } = await import("@fal-ai/client");
    fal.config({ credentials: falKey });
    const buf = await readFile(outPath);
    return await fal.storage.upload(new Blob([new Uint8Array(buf)], { type: "image/jpeg" }));
  } catch (err) {
    console.error("[flatten] failed, using original image:", err);
    return null;
  } finally {
    if (tmp) await rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}
