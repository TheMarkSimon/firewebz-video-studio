#!/usr/bin/env node
// Kling v3 Pro image-to-video probe.
//
// Purpose: burn ONE generation (~$2) against a real product photo to answer
// the only question that matters — does image-to-video actually produce a
// clean 360° turntable, or does it drift/wobble/deform?
//
// If it works: full pivot to video pipeline.
// If it doesn't: we saved the refactor work.
//
// Usage:
//   node scripts/probe-kling.mjs /path/to/front-photo.jpg
//
// Reads FAL_KEY from .env.local; falls back to process.env.

import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";

const PHOTO_PATH = process.argv[2];
if (!PHOTO_PATH) {
  console.error("Usage: node scripts/probe-kling.mjs <front-photo>");
  process.exit(1);
}
if (!existsSync(PHOTO_PATH)) {
  console.error(`File not found: ${PHOTO_PATH}`);
  process.exit(1);
}

// Load FAL_KEY from .env.local (poor-man's dotenv).
if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const FAL_KEY = process.env.FAL_KEY ?? process.env.FAL_API_TOKEN;
if (!FAL_KEY) {
  console.error("FAL_KEY not set. Add it to .env.local or export it.");
  process.exit(1);
}

const PROMPT =
  "Product on a mechanical turntable rotating at constant angular velocity, " +
  "36 degrees per second, no acceleration, no deceleration, exactly one full " +
  "360 degree revolution over 10 seconds. Camera on tripod, locked-off shot, " +
  "static camera, no camera movement, no zoom, no pan. Pure solid white " +
  "cyclorama background, high-end commercial studio product photography " +
  "lighting, crisp textures, item stays perfectly locked in the center of " +
  "the frame throughout the entire rotation.";

const { fal } = await import("@fal-ai/client");
fal.config({ credentials: FAL_KEY });

console.log(`[probe] uploading ${basename(PHOTO_PATH)}...`);
const bytes = readFileSync(PHOTO_PATH);
const mime = PHOTO_PATH.endsWith(".png") ? "image/png" : "image/jpeg";
const blob = new Blob([bytes], { type: mime });
const imageUrl = await fal.storage.upload(blob);
console.log(`[probe] uploaded → ${imageUrl}`);

const MODEL = "fal-ai/kling-video/v3/pro/image-to-video";
console.log(`[probe] calling ${MODEL} — this takes ~90s`);
console.log(`[probe] prompt: "${PROMPT.slice(0, 80)}..."`);

const started = Date.now();
const result = await fal.subscribe(MODEL, {
  input: {
    prompt: PROMPT,
    image_url: imageUrl,
    duration: "10",
    negative_prompt:
      "acceleration, deceleration, speed change, camera zoom, camera pan, camera dolly, camera handheld, camera shake, product moving off center, product drifting, product scaling, deformation, warping, morphing, blurry, low quality, floor shadow, real environment, watermark, text overlay",
    cfg_scale: 0.5,
  },
  logs: true,
  onQueueUpdate(update) {
    if (update.status === "IN_PROGRESS") {
      const elapsed = Math.round((Date.now() - started) / 1000);
      process.stdout.write(`\r[probe] in progress... ${elapsed}s`);
    }
  },
});
process.stdout.write("\n");

const duration = Math.round((Date.now() - started) / 1000);
console.log(`[probe] done in ${duration}s`);
console.log(`[probe] raw result: ${JSON.stringify(result, null, 2).slice(0, 800)}`);

const data = result?.data ?? result;
const videoUrl =
  data?.video?.url ??
  (typeof data?.video === "string" ? data.video : undefined) ??
  data?.output?.url ??
  data?.url;

if (!videoUrl) {
  console.error("[probe] no video URL in result. Full shape logged above.");
  process.exit(1);
}

console.log(`\n[probe] ✅ MP4 URL:\n${videoUrl}\n`);
console.log(`[probe] Open in browser:  open "${videoUrl}"`);
console.log(`[probe] Or download:      curl -o /tmp/probe.mp4 "${videoUrl}"`);
