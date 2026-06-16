import type { VideoGenerationProvider, VideoGenerationInput } from ".";
import path from "node:path";
import fs from "node:fs/promises";
import https from "node:https";
import { URL as NodeURL } from "node:url";

// Download via Node's native https module — more reliable than fetch on macOS for
// connections to CloudFront edges that misbehave with undici's TLS handshake.
function downloadToFile(url: string, destAbsPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const u = new NodeURL(url);
    const req = https.get({
      hostname: u.hostname,
      path: u.pathname + u.search,
      port: 443,
      headers: { "User-Agent": "curl/8.0" },
      timeout: 60000,
    }, async (res) => {
      if (res.statusCode && (res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        try { await downloadToFile(res.headers.location, destAbsPath); resolve(); }
        catch (e) { reject(e); }
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", async () => {
        try {
          await fs.writeFile(destAbsPath, Buffer.concat(chunks));
          resolve();
        } catch (e) { reject(e); }
      });
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(new Error("download timeout")); });
  });
}

// Runway Developer API
// Docs: https://docs.dev.runwayml.com/
// Endpoint: POST /v1/image_to_video → returns { id }
// Poll:     GET  /v1/tasks/:id      → returns { status, output: [url] }
const RUNWAY_API_BASE = "https://api.dev.runwayml.com/v1";
const RUNWAY_API_VERSION = "2024-11-06";

type RunwayTaskResponse = {
  id: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "THROTTLED";
  output?: string[];
  failure?: string;
  failureCode?: string;
};

function buildPrompt(input: VideoGenerationInput): string {
  // Runway prompts work best as a single descriptive paragraph (max ~1000 chars).
  const parts: string[] = [];
  parts.push(`${input.videoStyle} video for ${input.businessName}.`);
  if (input.productDescription) parts.push(input.productDescription + ".");
  if (input.hook) parts.push(`Hook: ${input.hook}.`);
  if (input.storyboard.length) parts.push(`Scenes: ${input.storyboard.slice(0, 3).join(" ")}`);
  parts.push(`Brand tone: ${input.brandTone}. Target audience: ${input.targetAudience}.`);
  parts.push("Vertical 9:16, cinematic product video, soft natural lighting, smooth camera motion.");
  return parts.join(" ").slice(0, 1000);
}

async function imageToDataUrl(refOrPath: string): Promise<string> {
  if (refOrPath.startsWith("data:")) return refOrPath;
  const bytes = await fs.readFile(refOrPath);
  const ext = path.extname(refOrPath).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

export const runwayVideo: VideoGenerationProvider = {
  name: "runway",
  isConfigured: () => Boolean(process.env.RUNWAY_API_KEY),
  async generateVideo(input) {
    const apiKey = process.env.RUNWAY_API_KEY;
    if (!apiKey) {
      return { provider: "runway", status: "failed", errorMessage: "RUNWAY_API_KEY is not set" };
    }
    if (!input.productImagePaths[0]) {
      return { provider: "runway", status: "failed", errorMessage: "Runway requires at least one product image" };
    }

    try {
      // Encode product photo as data URL so Runway can fetch it
      const dataUrl = await imageToDataUrl(input.productImagePaths[0]);
      const model = process.env.RUNWAY_MODEL ?? "gen4_turbo";
      // Gen-4 Turbo supports: 5s or 10s, ratios: 1280:720, 720:1280, 1104:832, 832:1104, 960:960
      const duration = input.durationSeconds >= 8 ? 10 : 5;
      const ratio = "720:1280"; // 9:16 vertical

      const headers = {
        "Authorization": `Bearer ${apiKey}`,
        "X-Runway-Version": RUNWAY_API_VERSION,
        "Content-Type": "application/json",
      };

      // 1. Submit the generation task — prefer the LLM-built prompt from the
      //    enrichment pipeline; fall back to the local template if none.
      const promptText = (input.overridePrompt && input.overridePrompt.trim().length > 20)
        ? input.overridePrompt
        : buildPrompt(input);

      const submitRes = await fetch(`${RUNWAY_API_BASE}/image_to_video`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          promptImage: dataUrl,
          promptText,
          ratio,
          duration,
        }),
      });

      if (!submitRes.ok) {
        const errText = await submitRes.text();
        return {
          provider: "runway",
          status: "failed",
          errorMessage: `Runway submit failed (${submitRes.status}): ${errText.slice(0, 400)}`,
        };
      }

      const submitJson = (await submitRes.json()) as { id: string };
      const taskId = submitJson.id;
      if (!taskId) {
        return { provider: "runway", status: "failed", errorMessage: "Runway returned no task id", rawResponse: submitJson };
      }

      // 2. Poll the task until done (max 5 min)
      const start = Date.now();
      const maxMs = 5 * 60 * 1000;
      let task: RunwayTaskResponse | null = null;

      while (Date.now() - start < maxMs) {
        await new Promise((r) => setTimeout(r, 5000));
        const pollRes = await fetch(`${RUNWAY_API_BASE}/tasks/${taskId}`, { headers });
        if (!pollRes.ok) {
          const errText = await pollRes.text();
          return { provider: "runway", status: "failed", errorMessage: `Runway poll failed (${pollRes.status}): ${errText.slice(0, 400)}`, providerJobId: taskId };
        }
        task = (await pollRes.json()) as RunwayTaskResponse;
        if (task.status === "SUCCEEDED" || task.status === "FAILED" || task.status === "CANCELLED") break;
      }

      if (!task) {
        return { provider: "runway", status: "failed", errorMessage: "Runway poll never returned", providerJobId: taskId };
      }
      if (task.status !== "SUCCEEDED") {
        return {
          provider: "runway",
          status: "failed",
          errorMessage: task.failure ?? `Runway task ended with status: ${task.status}`,
          providerJobId: taskId,
          rawResponse: task,
        };
      }

      const videoUrl = task.output?.[0];
      if (!videoUrl) {
        return { provider: "runway", status: "failed", errorMessage: "Runway succeeded but returned no output URL", providerJobId: taskId, rawResponse: task };
      }

      // 3. On serverless platforms (Vercel) the filesystem is read-only, so skip
      //    the local download entirely and just serve the CDN URL. Also avoids
      //    any network restrictions on the local dev machine (Zscaler etc.).
      const isServerless = Boolean(process.env.VERCEL) || process.env.SKIP_VIDEO_DOWNLOAD === "1";
      const outDir = process.env.GENERATED_VIDEO_DIR ?? "./storage/generated-videos";
      const filename = `runway-${Date.now()}.mp4`;
      const absPath = path.resolve(outDir, filename);
      let downloadOk = false;
      let downloadErr = isServerless ? "skipped (serverless)" : "";
      if (!isServerless) {
        // Only touch the filesystem when running locally — Vercel's FS is read-only.
        await fs.mkdir(outDir, { recursive: true });
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            await downloadToFile(videoUrl, absPath);
            downloadOk = true;
            break;
          } catch (e) {
            downloadErr = e instanceof Error ? e.message : String(e);
            await new Promise((r) => setTimeout(r, 1500 * attempt));
          }
        }
      }

      if (!downloadOk) {
        // Fallback: return the hosted Runway URL directly as the file path.
        // The URL is JWT-signed and valid for ~24 hours. The browser will fetch it directly.
        // This avoids server-side TLS issues some networks have with CloudFront edges.
        return {
          provider: "runway",
          status: "completed",
          videoFilePath: videoUrl,
          providerJobId: taskId,
          durationSeconds: duration,
          rawResponse: { hostedUrl: videoUrl, downloadError: downloadErr, note: "Served via Runway CDN; expires in ~24h." },
        };
      }

      return {
        provider: "runway",
        status: "completed",
        videoFilePath: path.relative(process.cwd(), absPath),
        providerJobId: taskId,
        durationSeconds: duration,
      };
    } catch (err) {
      const detail = err instanceof Error
        ? `${err.message}${err.cause ? " | cause: " + JSON.stringify(err.cause) : ""}`
        : String(err);
      console.error("[runway] generateVideo threw:", err);
      return {
        provider: "runway",
        status: "failed",
        errorMessage: detail,
      };
    }
  },
};
