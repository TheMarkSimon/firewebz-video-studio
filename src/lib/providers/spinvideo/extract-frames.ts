// Frame extraction: MP4 → N × JPEG frames, uploaded to fal storage.
//
// Why not scrub the raw MP4 in <video>? Mobile Safari stutters on
// video.currentTime updates (keyframe-snapping + slow reverse decode). A
// pre-decoded JPEG sequence blitted to <canvas> is instant on every device.
//
// Runs server-side in a Vercel serverless function. ffmpeg binary is shipped
// via @ffmpeg-installer/ffmpeg (~30 MB) — note it's a minimal build without
// WebP encoder support, so we use JPEG (nearly identical size for photo
// content). Extraction of a 10s 720p clip into 60 JPEGs takes ~4-6s cold.
//
// Falls back to `undefined` on failure — the caller keeps the videoUrl and
// the UI drops back to video scrubbing rather than breaking generation.

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Guarded dynamic imports so Next.js doesn't try to bundle the ffmpeg binary
// into the client. These modules are only loaded inside the extraction call.
async function loadFfmpeg() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffmpegInstaller = (await import("@ffmpeg-installer/ffmpeg")).default;
  const { default: ffmpeg } = await import("fluent-ffmpeg");
  ffmpeg.setFfmpegPath(ffmpegInstaller.path);
  return ffmpeg;
}

export interface ExtractFramesResult {
  frameUrls: string[];
  frameCount: number;
  durationMs: number;
}

// 60 frames over ~360° of rotation = 6° per frame. Smooth on any device.
// If Kling clips ever get longer/shorter, this stays a good target.
const TARGET_FRAME_COUNT = 60;

export async function extractFramesFromVideo(
  videoUrl: string,
  falKey: string,
): Promise<ExtractFramesResult | null> {
  const started = Date.now();
  let tmp: string | null = null;

  try {
    // 1. Download the MP4 to a temp dir. Vercel's /tmp is writable and lives
    //    for the lifetime of the function instance.
    const res = await fetch(videoUrl);
    if (!res.ok) return null;
    const bytes = Buffer.from(await res.arrayBuffer());

    tmp = await mkdtemp(join(tmpdir(), "spinr-frames-"));
    const videoPath = join(tmp, "in.mp4");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(videoPath, bytes);

    // 2. Run ffmpeg to extract N evenly-spaced frames as WebP.
    //    Using select filter over 1/fps: cleaner sampling at exact intervals
    //    than -r flag (which fights with frame timing).
    const ffmpeg = await loadFfmpeg();
    const framePattern = join(tmp, "f%03d.jpg");
    // Kling clips are always ~10s. Sample TARGET_FRAME_COUNT frames evenly.
    // If we ever support variable-length clips, ffprobe first — but the
    // installer's binary lacks it, so hardcoded 10s covers current usage.
    const KLING_DURATION = 10;
    const fps = TARGET_FRAME_COUNT / KLING_DURATION;
    await new Promise<void>((resolve, reject) => {
      const stderrLines: string[] = [];
      ffmpeg(videoPath)
        .outputOptions([
          "-vf", `fps=${fps.toFixed(4)}`,
          "-frames:v", String(TARGET_FRAME_COUNT),
          "-q:v", "3",
        ])
        .output(framePattern)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on("stderr", (line: string) => stderrLines.push(line))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on("end", () => resolve())
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on("error", (err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          reject(new Error(`ffmpeg failed: ${msg}\n${stderrLines.slice(-5).join("\n")}`));
        })
        .run();
    });

    // 3. Read the extracted files and upload each to fal storage in parallel.
    //    fal.storage.upload returns a stable CDN URL; the client fetches
    //    those directly.
    const { fal } = await import("@fal-ai/client");
    fal.config({ credentials: falKey });
    const { readdir } = await import("node:fs/promises");
    const files = (await readdir(tmp))
      .filter((f) => f.startsWith("f") && f.endsWith(".jpg"))
      .sort();
    const uploads = files.map(async (name) => {
      const buf = await readFile(join(tmp!, name));
      return fal.storage.upload(new Blob([new Uint8Array(buf)], { type: "image/jpeg" }));
    });
    const frameUrls = await Promise.all(uploads);

    return {
      frameUrls,
      frameCount: frameUrls.length,
      durationMs: Date.now() - started,
    };
  } catch (err) {
    console.error("[extract-frames] failed:", err);
    return null;
  } finally {
    if (tmp) await rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}
