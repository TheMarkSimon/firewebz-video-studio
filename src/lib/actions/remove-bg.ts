"use server";

// Server-side background removal via Replicate 851-labs/background-remover.
// Model is pinned by version — Replicate community models don't have a
// stable version-less endpoint.

const BG_MODEL = "851-labs/background-remover";
const BG_VERSION = "a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc";

export interface RemoveBgResult {
  status: "completed" | "failed";
  cleanedDataUrl?: string;
  errorMessage?: string;
  durationMs?: number;
}

export async function removeBackgroundServerSide(imageDataUrl: string): Promise<RemoveBgResult> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return { status: "failed", errorMessage: "REPLICATE_API_TOKEN is not set" };
  }
  if (!imageDataUrl?.startsWith("data:")) {
    return { status: "failed", errorMessage: "Expected a data URL" };
  }

  const started = Date.now();
  const modelDescriptor = `${BG_MODEL}:${BG_VERSION}`;

  try {
    const { default: Replicate } = await import("replicate");
    const replicate = new Replicate({ auth: token });

    // Schema (verified from Replicate): { image: uri, format?, threshold?, reverse?, background_type? }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const output: any = await replicate.run(modelDescriptor as `${string}/${string}:${string}`, {
      input: {
        image: imageDataUrl,
        format: "png",
        background_type: "rgba",
      },
    });

    // Output: URL string, FileOutput object, or array containing either.
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
        durationMs: Date.now() - started,
      };
    }

    // Fetch the cleaned PNG and re-encode as data URL so the client can
    // display it without a follow-up round-trip.
    const res = await fetch(url);
    if (!res.ok) {
      return {
        status: "failed",
        errorMessage: `Failed to download cleaned image: HTTP ${res.status}`,
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
    };
  } catch (err) {
    const e = err as { message?: string; status?: number; cause?: unknown };
    const status = e?.status ?? "";
    const msg = e?.message ?? String(err);
    const cause = e?.cause ? ` | cause: ${JSON.stringify(e.cause).slice(0, 300)}` : "";
    return {
      status: "failed",
      errorMessage: `${status ? `[${status}] ` : ""}${msg}${cause}`,
      durationMs: Date.now() - started,
    };
  }
}
