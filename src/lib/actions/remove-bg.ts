"use server";

// Server-side background removal via Replicate 851-labs/background-remover.
// Auto-retries on 429 (rate limited) using Replicate's own retry_after hint.

const BG_MODEL = "851-labs/background-remover";
const BG_VERSION = "a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc";

const MAX_RETRIES = 3;

export interface RemoveBgResult {
  status: "completed" | "failed";
  cleanedDataUrl?: string;
  errorMessage?: string;
  errorCode?: "rate_limited" | "auth" | "content" | "other";
  durationMs?: number;
  attempts?: number;
}

function parseRetryAfterSeconds(err: unknown): number | null {
  const e = err as { message?: string; status?: number; body?: unknown };
  if (e?.status !== 429) return null;
  const msg = typeof e?.message === "string" ? e.message : "";
  // Replicate embeds JSON in the error message: {"status":429,"retry_after":3}
  const m = msg.match(/"retry_after":\s*(\d+)/);
  if (m) return Math.max(1, Math.min(60, parseInt(m[1], 10)));
  // Fallback: check message text for "in ~Ns"
  const m2 = msg.match(/in\s*~?(\d+)\s*s/i);
  if (m2) return Math.max(1, Math.min(60, parseInt(m2[1], 10)));
  return null;
}

function categorize(err: unknown): "rate_limited" | "auth" | "content" | "other" {
  const e = err as { status?: number; message?: string };
  if (e?.status === 429) return "rate_limited";
  if (e?.status === 401 || e?.status === 403) return "auth";
  if (e?.status === 422 || e?.status === 400) return "content";
  return "other";
}

export async function removeBackgroundServerSide(imageDataUrl: string): Promise<RemoveBgResult> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return { status: "failed", errorMessage: "REPLICATE_API_TOKEN is not set", errorCode: "auth" };
  }
  if (!imageDataUrl?.startsWith("data:")) {
    return { status: "failed", errorMessage: "Expected a data URL", errorCode: "content" };
  }

  const started = Date.now();
  const modelDescriptor = `${BG_MODEL}:${BG_VERSION}`;

  const { default: Replicate } = await import("replicate");
  const replicate = new Replicate({ auth: token });

  let lastError: unknown = null;
  let attempts = 0;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    attempts = attempt;
    try {
      // threshold=0.5 forces a HARD alpha cut — kills soft edges + shadow ghosts
      // that Hunyuan3D would otherwise reconstruct as phantom geometry.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const output: any = await replicate.run(modelDescriptor as `${string}/${string}:${string}`, {
        input: {
          image: imageDataUrl,
          format: "png",
          background_type: "rgba",
          threshold: 0.5,
        },
      });

      // Normalize output to a URL string
      let url: string | undefined;
      if (typeof output === "string") {
        url = output;
      } else if (Array.isArray(output) && output.length > 0) {
        const first = output[0];
        if (typeof first === "string") url = first;
        else if (first && typeof first.url === "function") {
          const u = first.url();
          url = typeof u === "string" ? u : u?.href;
        }
      } else if (output && typeof output === "object") {
        if (typeof output.url === "function") {
          const u = output.url();
          url = typeof u === "string" ? u : u?.href;
        }
      }

      if (!url) {
        return {
          status: "failed",
          errorMessage: `Unexpected Replicate output: ${JSON.stringify(output).slice(0, 400)}`,
          errorCode: "other",
          durationMs: Date.now() - started,
          attempts,
        };
      }

      // Fetch the cleaned PNG and re-encode as data URL for the client.
      const res = await fetch(url);
      if (!res.ok) {
        return {
          status: "failed",
          errorMessage: `Failed to download cleaned image: HTTP ${res.status}`,
          errorCode: "other",
          durationMs: Date.now() - started,
          attempts,
        };
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const mime = res.headers.get("content-type") ?? "image/png";
      const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;

      return {
        status: "completed",
        cleanedDataUrl: dataUrl,
        durationMs: Date.now() - started,
        attempts,
      };
    } catch (err) {
      lastError = err;
      const kind = categorize(err);
      // Only 429 (rate limited) is retryable. Everything else fails fast.
      if (kind !== "rate_limited" || attempt === MAX_RETRIES) break;

      // Replicate literally tells us when to retry — obey it, plus small jitter.
      const retryAfter = parseRetryAfterSeconds(err);
      const waitMs = ((retryAfter ?? 4) * 1000) + Math.floor(Math.random() * 500);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }

  const e = lastError as { message?: string; status?: number };
  const kind = categorize(lastError);
  const statusPrefix = e?.status ? `[${e.status}] ` : "";
  const baseMsg = e?.message ?? String(lastError);
  const friendly =
    kind === "rate_limited"
      ? `Replicate rate-limited us after ${attempts} attempts. Top up Replicate credit to $10+ to remove the strict throttle.`
      : `${statusPrefix}${baseMsg}`;
  return {
    status: "failed",
    errorMessage: friendly.slice(0, 500),
    errorCode: kind,
    durationMs: Date.now() - started,
    attempts,
  };
}
