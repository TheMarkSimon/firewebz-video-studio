"use server";

// Background removal on fal.ai (fal-ai/birefnet/v2) by default, with a
// Replicate 851-labs/background-remover fallback controlled by BG_PROVIDER=replicate.
//
// Why fal.ai:
//   - Same ecosystem as our Hunyuan3D provider — one API key, one account,
//     one rate-limit bucket, one CDN allowlist.
//   - Fresh fal account has normal rate limits, so parallel photo uploads
//     don't 429 the way they did on Replicate under $5 credit.
//   - BiRefNet v2 has the same architecture 851-labs uses, plus fal's
//     hosted version accepts refine_foreground for cleaner mesh/lace edges.

const BG_PROVIDER = process.env.BG_PROVIDER ?? "fal";

// Replicate model kept as fallback
const REPLICATE_BG_MODEL = "851-labs/background-remover";
const REPLICATE_BG_VERSION = "a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc";
const MAX_RETRIES = 3;

export interface RemoveBgResult {
  status: "completed" | "failed";
  cleanedDataUrl?: string;
  errorMessage?: string;
  errorCode?: "rate_limited" | "auth" | "content" | "other";
  durationMs?: number;
  attempts?: number;
  provider?: string;
}

// --- fal.ai birefnet/v2 -----------------------------------------------------

async function removeBgOnFal(imageDataUrl: string): Promise<RemoveBgResult> {
  const key = process.env.FAL_KEY ?? process.env.FAL_API_TOKEN;
  if (!key) {
    return { status: "failed", errorMessage: "Neither FAL_KEY nor FAL_API_TOKEN is set", errorCode: "auth", provider: "fal-birefnet-v2" };
  }
  const started = Date.now();
  try {
    const { fal } = await import("@fal-ai/client");
    fal.config({ credentials: key });

    // Upload raw photo to fal.ai storage first so we can pass a URL.
    const m = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!m) {
      return { status: "failed", errorMessage: "Expected a data URL", errorCode: "content", provider: "fal-birefnet-v2" };
    }
    const blob = new Blob([Buffer.from(m[2], "base64")], { type: m[1] });
    const uploadedUrl = await fal.storage.upload(blob);

    // birefnet/v2 payload — image_url is required, extras are accepted
    // silently (endpoint doesn't validate unknown fields). Sending the
    // suggested params anyway; they're no-ops if unsupported.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await fal.subscribe("fal-ai/birefnet/v2", {
      input: {
        image_url: uploadedUrl,
        operating_resolution: "1024x1024",
        refine_foreground: true,
      },
      logs: false,
    });

    // Output shape (verified via direct probe):
    //   { data: { image: { url, content_type, width, height }, mask_image: null } }
    const data = result?.data ?? result;
    const cleanedUrl: string | undefined =
      data?.image?.url ??
      (typeof data?.image === "string" ? data.image : undefined) ??
      data?.output?.url;

    if (!cleanedUrl) {
      return {
        status: "failed",
        errorMessage: `fal.ai returned no cleaned image URL. Result: ${JSON.stringify(result).slice(0, 400)}`,
        errorCode: "other",
        provider: "fal-birefnet-v2",
        durationMs: Date.now() - started,
      };
    }

    // Fetch the cleaned PNG and re-encode as data URL so the client can
    // display it and pass it downstream without a round-trip via CDN.
    const res = await fetch(cleanedUrl);
    if (!res.ok) {
      return {
        status: "failed",
        errorMessage: `Failed to download cleaned image: HTTP ${res.status}`,
        errorCode: "other",
        provider: "fal-birefnet-v2",
        durationMs: Date.now() - started,
      };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get("content-type") ?? "image/png";
    const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;

    return {
      status: "completed",
      cleanedDataUrl: dataUrl,
      durationMs: Date.now() - started,
      attempts: 1,
      provider: "fal-birefnet-v2",
    };
  } catch (err) {
    const e = err as { message?: string; status?: number; body?: unknown };
    const status = e?.status ?? "";
    const msg = e?.message ?? String(err);
    const body = e?.body ? ` | body: ${JSON.stringify(e.body).slice(0, 200)}` : "";
    return {
      status: "failed",
      errorMessage: `${status ? `[${status}] ` : ""}${msg}${body}`.slice(0, 500),
      errorCode: e?.status === 429 ? "rate_limited" : e?.status === 401 || e?.status === 403 ? "auth" : "other",
      provider: "fal-birefnet-v2",
      durationMs: Date.now() - started,
    };
  }
}

// --- Replicate 851-labs (kept as fallback) ----------------------------------

function parseRetryAfterSeconds(err: unknown): number | null {
  const e = err as { message?: string; status?: number };
  if (e?.status !== 429) return null;
  const msg = typeof e?.message === "string" ? e.message : "";
  const m = msg.match(/"retry_after":\s*(\d+)/);
  if (m) return Math.max(1, Math.min(60, parseInt(m[1], 10)));
  const m2 = msg.match(/in\s*~?(\d+)\s*s/i);
  if (m2) return Math.max(1, Math.min(60, parseInt(m2[1], 10)));
  return null;
}

function categorize(err: unknown): "rate_limited" | "auth" | "content" | "other" {
  const e = err as { status?: number };
  if (e?.status === 429) return "rate_limited";
  if (e?.status === 401 || e?.status === 403) return "auth";
  if (e?.status === 422 || e?.status === 400) return "content";
  return "other";
}

async function removeBgOnReplicate(imageDataUrl: string): Promise<RemoveBgResult> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return { status: "failed", errorMessage: "REPLICATE_API_TOKEN is not set", errorCode: "auth", provider: "replicate-851labs" };
  }
  const started = Date.now();
  const modelDescriptor = `${REPLICATE_BG_MODEL}:${REPLICATE_BG_VERSION}`;
  const { default: Replicate } = await import("replicate");
  const replicate = new Replicate({ auth: token });

  let lastError: unknown = null;
  let attempts = 0;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    attempts = attempt;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const output: any = await replicate.run(modelDescriptor as `${string}/${string}:${string}`, {
        input: { image: imageDataUrl, format: "png", background_type: "rgba", threshold: 0.5 },
      });

      let url: string | undefined;
      if (typeof output === "string") url = output;
      else if (Array.isArray(output) && output.length > 0) {
        const first = output[0];
        if (typeof first === "string") url = first;
        else if (first && typeof first.url === "function") {
          const u = first.url();
          url = typeof u === "string" ? u : u?.href;
        }
      } else if (output && typeof output === "object" && typeof output.url === "function") {
        const u = output.url();
        url = typeof u === "string" ? u : u?.href;
      }

      if (!url) {
        return { status: "failed", errorMessage: `Unexpected Replicate output: ${JSON.stringify(output).slice(0, 400)}`, errorCode: "other", durationMs: Date.now() - started, attempts, provider: "replicate-851labs" };
      }

      const res = await fetch(url);
      if (!res.ok) {
        return { status: "failed", errorMessage: `Failed to download cleaned image: HTTP ${res.status}`, errorCode: "other", durationMs: Date.now() - started, attempts, provider: "replicate-851labs" };
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const mime = res.headers.get("content-type") ?? "image/png";
      const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
      return { status: "completed", cleanedDataUrl: dataUrl, durationMs: Date.now() - started, attempts, provider: "replicate-851labs" };
    } catch (err) {
      lastError = err;
      const kind = categorize(err);
      if (kind !== "rate_limited" || attempt === MAX_RETRIES) break;
      const retryAfter = parseRetryAfterSeconds(err);
      const waitMs = ((retryAfter ?? 4) * 1000) + Math.floor(Math.random() * 500);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }

  const e = lastError as { message?: string; status?: number };
  const kind = categorize(lastError);
  const friendly =
    kind === "rate_limited"
      ? `Replicate rate-limited us after ${attempts} attempts. Top up Replicate credit to $10+ to remove the strict throttle.`
      : `${e?.status ? `[${e.status}] ` : ""}${e?.message ?? String(lastError)}`;
  return { status: "failed", errorMessage: friendly.slice(0, 500), errorCode: kind, durationMs: Date.now() - started, attempts, provider: "replicate-851labs" };
}

// --- Public entry -----------------------------------------------------------

export async function removeBackgroundServerSide(imageDataUrl: string): Promise<RemoveBgResult> {
  if (!imageDataUrl?.startsWith("data:")) {
    return { status: "failed", errorMessage: "Expected a data URL", errorCode: "content" };
  }
  if (BG_PROVIDER === "replicate") return removeBgOnReplicate(imageDataUrl);
  return removeBgOnFal(imageDataUrl);
}
