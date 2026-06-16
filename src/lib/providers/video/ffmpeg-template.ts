import type { VideoGenerationProvider } from ".";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

function findFfmpeg(): string | null {
  const candidates = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg", "ffmpeg"];
  for (const c of candidates) if (existsSync(c)) return c;
  return null;
}

function escapeDrawText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

export const ffmpegTemplateVideo: VideoGenerationProvider = {
  name: "ffmpeg_template",
  isConfigured: () => findFfmpeg() !== null,
  async generateVideo(input) {
    const ffmpeg = findFfmpeg();
    if (!ffmpeg) {
      return { provider: "ffmpeg_template", status: "failed", errorMessage: "ffmpeg not found on PATH" };
    }
    const outDir = process.env.GENERATED_VIDEO_DIR ?? "./storage/generated-videos";
    await fs.mkdir(outDir, { recursive: true });
    const filename = `template-${Date.now()}.mp4`;
    const absPath = path.resolve(outDir, filename);

    const image = input.productImagePaths[0];
    const duration = Math.max(4, Math.min(15, input.durationSeconds));
    const text = escapeDrawText(input.hook).slice(0, 80);

    const args: string[] = [];
    if (image && existsSync(image)) {
      args.push("-loop", "1", "-i", image);
    } else {
      args.push("-f", "lavfi", "-i", `color=c=0x0B1220:s=1080x1920:d=${duration}`);
    }
    args.push(
      "-vf",
      [
        "scale=w=1080:h=1920:force_original_aspect_ratio=decrease",
        "pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=0x0B1220",
        `drawtext=text='${text}':fontcolor=white:fontsize=64:box=1:boxcolor=0xFF5722@0.85:boxborderw=20:x=(w-text_w)/2:y=h-360`,
        `drawtext=text='${escapeDrawText(input.cta).slice(0, 40)}':fontcolor=white:fontsize=48:box=1:boxcolor=0xFF8A3D@0.95:boxborderw=18:x=(w-text_w)/2:y=h-180`,
      ].join(","),
      "-t", String(duration),
      "-r", "30",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      "-y", absPath,
    );

    return new Promise((resolve) => {
      const proc = spawn(ffmpeg, args);
      let stderr = "";
      proc.stderr.on("data", (d) => (stderr += d.toString()));
      proc.on("close", (code) => {
        if (code === 0) {
          resolve({
            provider: "ffmpeg_template",
            status: "completed",
            videoFilePath: path.relative(process.cwd(), absPath),
            durationSeconds: duration,
          });
        } else {
          resolve({
            provider: "ffmpeg_template",
            status: "failed",
            errorMessage: `ffmpeg exited ${code}: ${stderr.slice(-500)}`,
          });
        }
      });
    });
  },
};
